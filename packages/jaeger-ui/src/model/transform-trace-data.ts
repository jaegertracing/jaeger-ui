// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import _isEqual from 'lodash/isEqual';

import getConfig from '../utils/config/get-config';
import { getTraceEmoji, getTraceName, getTracePageTitle } from './trace-display-helpers';
import { Span, SpanData, SpanReference, Trace, TraceData } from '../types/trace';
import { IOtelTrace } from '../types/otel';
import { deduplicateAttributes, orderAttributes } from './trace-attributes';

import OtelTraceFacade from './OtelTraceFacade';
import { getParentSpanID, getNonParentReferences } from './span';

/**
 * NOTE: Mutates `data` - Transform the HTTP response data into the form the app
 * generally requires.
 */
export default function transformTraceData(data: TraceData & { spans: SpanData[] }): Trace | null {
  const { traceID } = data;
  if (!traceID) {
    return null;
  }

  let traceEndTime = 0;
  let traceStartTime = Number.MAX_SAFE_INTEGER;
  const spanIdCounts = new Map<string, number>();
  const spanMap = new Map<string, Span>();

  // Spans with no usable startTime (missing/NaN, or 0 — the Unix epoch, which no
  // real span emits) are kept rather than dropped, so the span tree still renders
  // in full. Their startTime is repaired during the depth-first traversal below
  // by inheriting the parent's startTime; dropping them here would blank the
  // whole timeline when every span reports startTime 0.
  const numSpans = data.spans.length;
  for (let i = 0; i < numSpans; i++) {
    // Unsafe cast to avoid memory allocations.
    // We populate/fix all properties below.
    const span: Span = data.spans[i] as Span;
    const { processID } = span;
    let spanID = span.spanID;
    // make sure span IDs are unique
    const idCount = spanIdCounts.get(spanID);
    if (idCount != null) {
      console.warn(`Dupe spanID, ${idCount + 1} x ${spanID}`, span, spanMap.get(spanID));
      if (_isEqual(span, spanMap.get(spanID))) {
        console.warn('\t two spans with same ID have `isEqual(...) === true`');
      }
      spanIdCounts.set(spanID, idCount + 1);
      spanID = `${spanID}_${idCount}`;
      span.spanID = spanID;
    } else {
      spanIdCounts.set(spanID, 1);
    }
    span.process = data.processes[processID] || { serviceName: 'unknown-service' };
    span.process.tags = span.process.tags || [];
    span.tags = span.tags || [];
    span.logs = span.logs || [];
    span.logs.forEach(log => {
      log.fields = log.fields || [];
    });
    span.references = span.references || [];
    span.childSpans = [];
    span.subsidiarilyReferencedBy = [];

    const attributesInfo = deduplicateAttributes(span.tags);
    span.tags = orderAttributes(attributesInfo.attributes, getConfig().topTagPrefixes);
    span.warnings = span.warnings || [];
    if (attributesInfo.warnings && attributesInfo.warnings.length > 0) {
      (span.warnings as string[]).push(...attributesInfo.warnings);
    }

    spanMap.set(spanID, span);
  }

  const rootSpans: Span[] = [];
  let orphanSpanCount = 0;

  // Second pass: link parents/children and identify roots
  for (const span of spanMap.values()) {
    const parentSpanID = getParentSpanID(span);
    const parent = parentSpanID ? spanMap.get(parentSpanID) : undefined;
    if (parentSpanID && !parent) {
      orphanSpanCount++;
    }

    if (parent) {
      // It's a child
      (parent.childSpans as Span[]).push(span);
    } else {
      // It's a root
      rootSpans.push(span);
    }
  }

  const spans: Span[] = [];
  const svcCounts: Record<string, number> = {};

  // A startTime that is missing/NaN or 0 (the Unix epoch, which no real span
  // emits) carries no usable timestamp. Repair it by inheriting the parent's
  // already-repaired startTime so the span still renders in the tree without
  // stretching the timeline back to ~1970; a root with no parent falls back to
  // 0. Every span is repaired by its caller *before* being sorted or handed to
  // processSpan, so the sort comparators below never see undefined/NaN (which
  // would make ordering engine-dependent) and processSpan always reads a finite
  // startTime.
  //
  // We deliberately do not special-case the pathological shape where a root with
  // no usable startTime has children with real timestamps: there the trace range
  // would still stretch back to the epoch. Inferring the root's start from its
  // earliest descendant is possible but not worth the complexity for that rare,
  // already-broken input.
  const repairStartTime = (span: Span, parent?: Span) => {
    if (!Number.isFinite(span.startTime) || span.startTime <= 0) {
      span.startTime = parent?.startTime || 0;
    }
  };

  // Pre-order depth-first traversal to order spans, populate the flat array, and
  // compute the trace's time range from the (already-repaired) start times. The
  // traversal uses an explicit stack rather than recursion so that deeply nested
  // traces do not overflow the call stack. A span's depth is assigned by its
  // parent before the span is pushed; roots are seeded with depth 0.
  const stack: Span[] = [];
  const processSpan = (span: Span) => {
    const { depth } = span;
    span.hasChildren = span.childSpans.length > 0;

    if (span.startTime < traceStartTime) {
      traceStartTime = span.startTime;
    }
    if (span.startTime + span.duration > traceEndTime) {
      traceEndTime = span.startTime + span.duration;
    }

    const { serviceName } = span.process;
    svcCounts[serviceName] = (svcCounts[serviceName] || 0) + 1;

    span.references.forEach(ref => {
      ref.span = ref.traceID === traceID ? spanMap.get(ref.spanID) : undefined;
    });
    getNonParentReferences(span).forEach(ref => {
      const refSpan = ref.span;
      if (refSpan) {
        (refSpan.subsidiarilyReferencedBy as SpanReference[]).push({
          spanID: span.spanID,
          traceID,
          span,
          refType: ref.refType,
        });
      }
    });

    spans.push(span);

    // Repair children against this (already-repaired) span, then sort them by
    // startTime. They are pushed in reverse so that popping visits them in
    // ascending startTime order, each subtree before the next sibling.
    const children = span.childSpans as Span[];
    children.forEach(child => repairStartTime(child, span));
    children.sort((a, b) => a.startTime - b.startTime);
    for (let i = children.length - 1; i >= 0; i--) {
      children[i].depth = depth + 1;
      stack.push(children[i]);
    }
  };

  rootSpans.forEach(root => repairStartTime(root));
  rootSpans.sort((a, b) => a.startTime - b.startTime);
  for (let i = rootSpans.length - 1; i >= 0; i--) {
    rootSpans[i].depth = 0;
    stack.push(rootSpans[i]);
  }
  while (stack.length > 0) {
    processSpan(stack.pop()!);
  }

  // traceStartTime/traceEndTime are only updated while visiting spans reachable
  // from a root. If the trace has spans but no root (e.g. every span is part of
  // a reference cycle), nothing is visited and traceStartTime keeps its sentinel
  // value, which would produce a negative duration. Collapse to a zero range.
  if (spans.length === 0) {
    traceStartTime = 0;
    traceEndTime = 0;
  }

  // relativeStartTime depends on the final traceStartTime, which is only known
  // once every span (including repaired ones) has been visited above.
  for (const span of spans) {
    span.relativeStartTime = span.startTime - traceStartTime;
  }

  const traceName = getTraceName(spans);
  const tracePageTitle = getTracePageTitle(spans);
  const traceEmoji = getTraceEmoji(spans);
  const services = Object.keys(svcCounts).map(name => ({ name, numberOfSpans: svcCounts[name] }));

  return {
    services,
    spans,
    traceID,
    traceName,
    tracePageTitle,
    traceEmoji,
    spanMap,
    rootSpans,
    processes: data.processes,
    duration: (traceEndTime - traceStartTime) as IOtelTrace['duration'],
    startTime: traceStartTime as IOtelTrace['startTime'],
    endTime: traceEndTime as IOtelTrace['endTime'],
    orphanSpanCount,

    asOtelTrace() {
      if (!this._otelFacade) {
        this._otelFacade = new OtelTraceFacade(this);
      }
      return this._otelFacade!;
    },
  };
}
