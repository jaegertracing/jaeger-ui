// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import _isEqual from 'lodash/isEqual';

import { getTraceSpanIdsAsTree, TREE_ROOT_ID } from '../selectors/trace';
import { getConfigValue } from '../utils/config/get-config';
import { getTraceEmoji, getTraceName, getTracePageTitle } from './trace-viewer';
import { KeyValuePair, Span, SpanData, Trace, TraceData } from '../types/trace';
import TreeNode from '../utils/TreeNode';
import OtelTraceFacade from './OtelTraceFacade';

// exported for tests
export function deduplicateTags(spanTags: KeyValuePair[]) {
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
  // filter out spans with empty start times

  data.spans = data.spans.filter(span => Boolean(span.startTime));

  const numSpans = data.spans.length;
  for (let i = 0; i < numSpans; i++) {
    const span: Span = data.spans[i] as Span;
    const { startTime, duration, processID } = span;
    // update trace's start / end time
    if (startTime < traceStartTime) {
      traceStartTime = startTime;
    }
    if (startTime + duration > traceEndTime) {
      traceEndTime = startTime + duration;
    }
    // make sure span IDs are unique
    let spanID = span.spanID;
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
    spanMap.set(spanID, span);
  }
  // tree is necessary to sort the spans, so children follow parents, and
  // siblings are sorted by start time
  const { root: tree, nodesBySpanId } = getTraceSpanIdsAsTree(data, spanMap);
  const spans: Span[] = [];
  const svcCounts: Record<string, number> = {};
  const rootSpans: Span[] = [];

  tree.walk((spanID: string, node: TreeNode<string>, depth = 0) => {
    if (spanID === TREE_ROOT_ID) {
      return;
    }
    const span = spanMap.get(spanID) as Span;
    if (!span) {
      return;
    }
    const { serviceName } = span.process;
    svcCounts[serviceName] = (svcCounts[serviceName] || 0) + 1;
    span.relativeStartTime = span.startTime - traceStartTime;
    span.depth = depth - 1;
    span.hasChildren = node.children.length > 0;
    // Use children from tree node instead of rebuilding
    span.childSpans = node.children.map(childNode => spanMap.get(childNode.value)!).filter(Boolean);
    span.warnings = span.warnings || [];
    span.tags = span.tags || [];
    span.references = span.references || [];
    const tagsInfo = deduplicateTags(span.tags);
    span.tags = orderTags(tagsInfo.tags, getConfigValue('topTagPrefixes'));
    span.warnings = span.warnings.concat(tagsInfo.warnings);
    span.references.forEach((ref, index) => {
      const refSpan = spanMap.get(ref.spanID) as Span;
      if (refSpan) {
        ref.span = refSpan;
        if (index > 0) {
          // Don't take into account the parent, just other references.
          refSpan.subsidiarilyReferencedBy = refSpan.subsidiarilyReferencedBy || [];
          refSpan.subsidiarilyReferencedBy.push({
            spanID,
            traceID,
            span,
            refType: ref.refType,
          });
        }
      }
    });
    spans.push(span);
  });

  // Identify root spans from tree structure (direct children of tree root)
  tree.children.forEach(childNode => {
    const rootSpan = spanMap.get(childNode.value);
    if (rootSpan) {
      rootSpans.push(rootSpan);
    }
  });

  const traceName = getTraceName(spans);
  const tracePageTitle = getTracePageTitle(spans);
  const traceEmoji = getTraceEmoji(spans);
  const services = Object.keys(svcCounts).map(name => ({ name, numberOfSpans: svcCounts[name] }));

  // Detect orphan spans - spans that reference a parent span ID that doesn't exist in the trace
  let orphanSpanCount = 0;
  spans.forEach(span => {
    if (Array.isArray(span.references) && span.references.length > 0) {
      const parentRef = span.references[0];
      if (!spanMap.has(parentRef.spanID)) {
        orphanSpanCount++;
      }
    }
  });

  return {
    services,
    spans,
    traceID,
    traceName,
    tracePageTitle,
    traceEmoji,
    // Optimized data structures - created once during trace transformation
    spanMap,
    rootSpans,
    // Can't use spread operator for intersection types
    // repl: https://goo.gl/4Z23MJ
    // issue: https://github.com/facebook/flow/issues/1511
    processes: data.processes,
    duration: traceEndTime - traceStartTime,
    startTime: traceStartTime,
    endTime: traceEndTime,
    orphanSpanCount,

    // Lazy-initialized OTEL facade getter
    asOtelTrace() {
      if (!this._otelFacade) {
        this._otelFacade = new OtelTraceFacade(this);
      }
      return this._otelFacade!;
    },
  };
}
