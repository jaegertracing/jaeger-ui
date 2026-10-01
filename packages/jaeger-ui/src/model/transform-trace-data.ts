// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import _isEqual from 'lodash/isEqual';

import getConfig from '../utils/config/get-config';
import { getTraceEmoji, getTraceName, getTracePageTitle } from './trace-viewer';
import { KeyValuePair, Span, SpanData, SpanReference, Trace, TraceData } from '../types/trace';
import { IOtelTrace } from '../types/otel';

import OtelTraceFacade from './OtelTraceFacade';

// exported for tests
export const CYCLIC_PARENT_WARNING =
  'Cyclic parent reference detected; the parent reference was ignored and this span was promoted ' +
  'to a root span so the trace can render';

// exported for tests
export function deduplicateTags(spanTags: ReadonlyArray<KeyValuePair>) {
  const warningsHash: Map<string, string> = new Map<string, string>();
  const tags: KeyValuePair[] = [];
  const seen = new Map<string, Set<KeyValuePair['value']>>();
  for (const tag of spanTags) {
    const values = seen.get(tag.key);
    if (!values || !values.has(tag.value)) {
      if (values) {
        values.add(tag.value);
      } else {
        seen.set(tag.key, new Set([tag.value]));
      }
      tags.push(tag);
    } else {
      warningsHash.set(
        `${tag.key}\0${typeof tag.value}\0${String(tag.value)}`,
        `Duplicate tag key="${tag.key}" value="${String(tag.value)}"`
      );
    }
  }
  const warnings = Array.from(warningsHash.values());
  return { tags, warnings };
}

// exported for tests
export function orderTags(spanTags: KeyValuePair[], topPrefixes?: readonly string[]) {
  const orderedTags: KeyValuePair[] = spanTags.slice();
  const tp = (topPrefixes || []).map((p: string) => p.toLowerCase());

  orderedTags.sort((a, b) => {
    const aKey = a.key.toLowerCase();
    const bKey = b.key.toLowerCase();

    for (let i = 0; i < tp.length; i++) {
      const p = tp[i];
      if (aKey.startsWith(p) && !bKey.startsWith(p)) {
        return -1;
      }
      if (!aKey.startsWith(p) && bKey.startsWith(p)) {
        return 1;
      }
    }

    if (aKey > bKey) {
      return 1;
    }
    if (aKey < bKey) {
      return -1;
    }
    return 0;
  });

  return orderedTags;
}

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

    const tagsInfo = deduplicateTags(span.tags);
    span.tags = orderTags(tagsInfo.tags, getConfig().topTagPrefixes);
    span.warnings = span.warnings || [];
    if (tagsInfo.warnings && tagsInfo.warnings.length > 0) {
      (span.warnings as string[]).push(...tagsInfo.warnings);
    }

    spanMap.set(spanID, span);
  }

  const rootSpans: Span[] = [];
  let orphanSpanCount = 0;

  // The first CHILD_OF or FOLLOWS_FROM reference that exists in the spanMap. Shared with
  // the cycle-breaking pass below, which climbs the same parent edges this pass links.
  const findParent = (span: Span): Span | undefined => {
    for (const ref of span.references) {
      if (ref.refType === 'CHILD_OF' || ref.refType === 'FOLLOWS_FROM') {
        const parent = spanMap.get(ref.spanID);
        if (parent) {
          return parent;
        }
      }
    }
    return undefined;
  };

  // Second pass: link parents/children and identify roots
  for (const span of spanMap.values()) {
    let parent: Span | undefined;
    if (Array.isArray(span.references) && span.references.length > 0) {
      parent = findParent(span);
      if (!parent) {
        orphanSpanCount++;
      }
    }

    if (parent) {
      // It's a child
      (parent.childSpans as Span[]).push(span);
    } else {
      // It's a root
      rootSpans.push(span);
    }
  }

  // A span with no usable startTime orders last, so that a span carrying a real timestamp
  // is preferred over it. Start times themselves are repaired further below.
  const promotionOrder = (span: Span) =>
    Number.isFinite(span.startTime) && span.startTime > 0 ? span.startTime : Infinity;

  // `cycle` is a loop of parent references listed child first: cycle[i + 1] is the parent
  // of cycle[i], and the parent of the last entry is cycle[0]. Cut its earliest member
  // free of its parent and make it a root, which leaves the loop as a chain below it.
  const promoteRootFrom = (cycle: Span[]) => {
    let earliest = 0;
    for (let i = 1; i < cycle.length; i++) {
      if (promotionOrder(cycle[i]) < promotionOrder(cycle[earliest])) {
        earliest = i;
      }
    }
    const promoted = cycle[earliest];
    const parent = cycle[(earliest + 1) % cycle.length];
    parent.childSpans = parent.childSpans.filter(child => child !== promoted);
    // OtelSpanFacade re-derives the parent from `references` under its own rule, so the
    // cut has to be recorded on the span itself; dropping it from the parent's childSpans
    // alone would leave the facade's parentSpan chain cyclic. The reference stays on the
    // span and surfaces there as a link.
    promoted.parentCycleBroken = true;
    (promoted.warnings as string[]).push(CYCLIC_PARENT_WARNING);
    rootSpans.push(promoted);
  };

  // Third pass: break cycles of parent references, so that what this phase hands on is a
  // forest. A trace can arrive with every span holding a parent that resolves and still
  // have no root at all, because each member of a cycle has its parent inside that cycle:
  // none of them is a root, none is reachable from one, and the trace renders as an empty
  // timeline. That comes from ordinary data, since the v1 rendering of an OTLP span link
  // is a FOLLOWS_FROM reference and the parent search above accepts FOLLOWS_FROM, so a
  // root span carrying a link to one of its own descendants becomes that descendant's
  // child.
  //
  // Cutting the cycle, rather than merely tolerating it, is what the rest of the app
  // needs: SpanTreeOffset climbs parentSpan to draw indent guides, the flamegraph and DDG
  // descend childSpans, and none of those walks carries a visited set of its own.
  //
  // Each span has at most one parent, so climbing from any span either reaches a root or
  // closes exactly one loop, and cutting one edge per loop leaves a tree. Spans hanging
  // below a cycle keep their own parent and arrive as ordinary descendants of whichever
  // member gets promoted. Every span is climbed from at most once, so a trace without
  // cycles pays one set lookup per span.
  const settled = new Set<Span>();
  for (const span of spanMap.values()) {
    if (settled.has(span)) {
      continue;
    }
    const positionOnPath = new Map<Span, number>();
    const path: Span[] = [];
    let current: Span | undefined = span;
    while (current && !settled.has(current)) {
      const seenAt = positionOnPath.get(current);
      if (seenAt !== undefined) {
        // The walk came back to a span it had already stepped through: everything from
        // there on is the cycle, and everything before it hangs below the cycle.
        promoteRootFrom(path.slice(seenAt));
        break;
      }
      positionOnPath.set(current, path.length);
      path.push(current);
      current = findParent(current);
    }
    path.forEach(stepped => settled.add(stepped));
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

  // Depth-first traversal to order spans, populate the flat array, and compute
  // the trace's time range from the (already-repaired) start times.
  const processSpan = (span: Span, depth: number) => {
    span.depth = depth;
    span.hasChildren = span.childSpans.length > 0;

    if (span.startTime < traceStartTime) {
      traceStartTime = span.startTime;
    }
    if (span.startTime + span.duration > traceEndTime) {
      traceEndTime = span.startTime + span.duration;
    }

    const { serviceName } = span.process;
    svcCounts[serviceName] = (svcCounts[serviceName] || 0) + 1;

    span.references.forEach((ref, index) => {
      const refSpan = spanMap.get(ref.spanID);
      if (refSpan) {
        ref.span = refSpan;
        if (index > 0) {
          // Don't take into account the parent, just other references.
          refSpan.subsidiarilyReferencedBy = refSpan.subsidiarilyReferencedBy || [];
          (refSpan.subsidiarilyReferencedBy as SpanReference[]).push({
            spanID: span.spanID,
            traceID,
            span,
            refType: ref.refType,
          });
        }
      }
    });

    spans.push(span);

    // Repair children against this (already-repaired) span, then sort them by
    // startTime before recursing.
    const children = span.childSpans as Span[];
    children.forEach(child => repairStartTime(child, span));
    children.sort((a, b) => a.startTime - b.startTime);
    children.forEach(child => processSpan(child, depth + 1));
  };

  rootSpans.forEach(root => repairStartTime(root));
  rootSpans.sort((a, b) => a.startTime - b.startTime);
  rootSpans.forEach(root => processSpan(root, 0));

  // traceStartTime/traceEndTime are only updated while visiting spans. Every span is
  // reachable from a root once the pass above has broken any cycles, so only a trace with
  // no spans at all leaves traceStartTime at its sentinel value, which would produce a
  // negative duration. Collapse to a zero range.
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
