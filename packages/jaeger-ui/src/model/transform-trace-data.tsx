// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import _isEqual from 'lodash/isEqual';

import { getConfigValue } from '../utils/config/get-config';
import { getTraceEmoji, getTraceName, getTracePageTitle } from './trace-viewer';
import { KeyValuePair, Span, SpanData, SpanReference, Trace, TraceData } from '../types/trace';

import OtelTraceFacade from './OtelTraceFacade';

// exported for tests
export function deduplicateTags(spanTags: ReadonlyArray<KeyValuePair>) {
  const warningsHash: Map<string, string> = new Map<string, string>();
  const tags: KeyValuePair[] = spanTags.reduce<KeyValuePair[]>((uniqueTags, tag) => {
    if (!uniqueTags.some(t => t.key === tag.key && t.value === tag.value)) {
      uniqueTags.push(tag);
    } else {
      warningsHash.set(`${tag.key}:${tag.value}`, `Duplicate tag "${tag.key}:${tag.value}"`);
    }
    return uniqueTags;
  }, []);
  const warnings = Array.from(warningsHash.values());
  return { tags, warnings };
}

// exported for tests
export function orderTags(spanTags: KeyValuePair[], topPrefixes?: string[]) {
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
  let { traceID } = data;
  if (!traceID) {
    return null;
  }
  traceID = traceID.toLowerCase();

  let traceEndTime = 0;
  let traceStartTime = Number.MAX_SAFE_INTEGER;
  const spanIdCounts = new Map<string, number>();
  const spanMap = new Map<string, Span>();

  // Filter out spans with empty start times
  data.spans = data.spans.filter(span => Boolean(span.startTime));

  const numSpans = data.spans.length;
  for (let i = 0; i < numSpans; i++) {
    // Unsafe cast to avoid memory allocations.
    // We populate/fix all properties below.
    const span: Span = data.spans[i] as Span;
    const { startTime, duration, processID } = span;
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
    span.process = data.processes[processID];
    span.tags = span.tags || [];
    span.logs = span.logs || [];
    span.references = span.references || [];
    span.childSpans = [];
    span.subsidiarilyReferencedBy = [];

    const tagsInfo = deduplicateTags(span.tags);
    span.tags = orderTags(tagsInfo.tags, getConfigValue('topTagPrefixes'));
    span.warnings = span.warnings || [];
    if (tagsInfo.warnings && tagsInfo.warnings.length > 0) {
      (span.warnings as string[]).push(...tagsInfo.warnings);
    }

    spanMap.set(spanID, span);

    // update trace's start / end time
    if (startTime < traceStartTime) {
      traceStartTime = startTime;
    }
    if (startTime + duration > traceEndTime) {
      traceEndTime = startTime + duration;
    }
  }

  const rootSpans: Span[] = [];
  let orphanSpanCount = 0;

  // Second pass: link parents/children and identify roots
  for (const span of spanMap.values()) {
    let parent: Span | undefined;
    if (Array.isArray(span.references) && span.references.length > 0) {
      // Find the first CHILD_OF or FOLLOWS_FROM reference that exists in the spanMap
      for (const ref of span.references) {
        if (ref.refType === 'CHILD_OF' || ref.refType === 'FOLLOWS_FROM') {
          parent = spanMap.get(ref.spanID);
          if (parent) {
            break;
          }
        }
      }
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

  const spans: Span[] = [];
  const svcCounts: Record<string, number> = {};

  // Depth-first traversal to order spans and populate flat array
  const processSpan = (span: Span, depth: number) => {
    span.depth = depth;
    span.hasChildren = span.childSpans.length > 0;
    span.relativeStartTime = span.startTime - traceStartTime;

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

    // Sort children by startTime before processing them
    (span.childSpans as Span[]).sort((a, b) => a.startTime - b.startTime);
    span.childSpans.forEach(child => processSpan(child, depth + 1));
  };

  rootSpans.sort((a, b) => a.startTime - b.startTime);
  rootSpans.forEach(root => processSpan(root, 0));

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
    duration: traceEndTime - traceStartTime,
    startTime: traceStartTime,
    endTime: traceEndTime,
    orphanSpanCount,

    asOtelTrace() {
      if (!this._otelFacade) {
        this._otelFacade = new OtelTraceFacade(this);
      }
      return this._otelFacade!;
    },
  };
}
