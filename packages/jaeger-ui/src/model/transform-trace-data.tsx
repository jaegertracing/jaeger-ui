// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import _isEqual from 'lodash/isEqual';

import { getTraceSpanIdsAsTree, TREE_ROOT_ID } from '../selectors/trace';
import { getConfigValue } from '../utils/config/get-config';
import { getTraceEmoji, getTraceName, getTracePageTitle } from './trace-viewer';
import { KeyValuePair, Process, Span, SpanData, SpanReference, Trace, TraceData } from '../types/trace';
import TreeNode from '../utils/TreeNode';
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
export function orderTags(spanTags: ReadonlyArray<KeyValuePair>, topPrefixes?: string[]) {
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
 * NOTE: Does not mutate `data` - Transform the HTTP response data into the form the app
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
  const spanDataMap = new Map<string, SpanData>();
  // filter out spans with empty start times

  const filteredSpans = data.spans.filter(span => Boolean(span.startTime));

  // First pass: process spanData, calculate trace times, handle duplicate IDs
  const processedSpanData: SpanData[] = [];
  for (let i = 0; i < filteredSpans.length; i++) {
    const spanData = filteredSpans[i];
    const { startTime, duration, processID } = spanData;
    // update trace's start / end time
    if (startTime < traceStartTime) {
      traceStartTime = startTime;
    }
    if (startTime + duration > traceEndTime) {
      traceEndTime = startTime + duration;
    }
    // make sure span IDs are unique
    let spanID = spanData.spanID;
    const idCount = spanIdCounts.get(spanID);
    if (idCount != null) {
      console.warn(`Dupe spanID, ${idCount + 1} x ${spanID}`, spanData, spanDataMap.get(spanID));
      if (_isEqual(spanData, spanDataMap.get(spanID))) {
        console.warn('\t two spans with same ID have `isEqual(...) === true`');
      }
      spanIdCounts.set(spanID, idCount + 1);
      spanID = `${spanID}_${idCount}`;
      // Create a new spanData object with updated spanID to avoid mutation
      const updatedSpanData = { ...spanData, spanID };
      processedSpanData.push(updatedSpanData);
      spanDataMap.set(spanID, updatedSpanData);
    } else {
      spanIdCounts.set(spanID, 1);
      processedSpanData.push(spanData);
      spanDataMap.set(spanID, spanData);
    }
  }

  // Build a temporary map with basic span info for tree building
  const tempSpanMap = new Map<
    string,
    { spanID: string; processID: string; startTime: number; references?: ReadonlyArray<SpanReference> }
  >();
  processedSpanData.forEach(spanData => {
    tempSpanMap.set(spanData.spanID, {
      spanID: spanData.spanID,
      processID: spanData.processID,
      startTime: spanData.startTime,
      references: spanData.references,
    });
  });

  // tree is necessary to sort the spans, so children follow parents, and
  // siblings are sorted by start time
  const { root: tree, nodesBySpanId } = getTraceSpanIdsAsTree(
    { ...data, spans: processedSpanData },
    tempSpanMap as any
  );
  const spans: Span[] = [];
  const svcCounts: Record<string, number> = {};
  const rootSpans: Span[] = [];
  const spanMap = new Map<string, Span>();

  // Second pass: construct complete Span objects during tree walk
  tree.walk((spanID: string, node: TreeNode<string>, depth = 0) => {
    if (spanID === TREE_ROOT_ID) {
      return;
    }
    const spanData = spanDataMap.get(spanID);
    if (!spanData) {
      return;
    }

    const process = data.processes[spanData.processID];
    const { serviceName } = process;
    svcCounts[serviceName] = (svcCounts[serviceName] || 0) + 1;

    // Process tags
    const warnings = spanData.warnings || [];
    const tags = spanData.tags || [];
    const references = spanData.references || [];
    const tagsInfo = deduplicateTags(tags);
    const orderedTags = orderTags(tagsInfo.tags, getConfigValue('topTagPrefixes'));
    const allWarnings = [...warnings, ...tagsInfo.warnings];

    // Create the complete Span object without mutation
    // Note: childSpans will be populated in a later pass after all spans are created
    const span: Span = {
      ...spanData,
      depth: depth - 1,
      hasChildren: node.children.length > 0,
      process,
      relativeStartTime: spanData.startTime - traceStartTime,
      tags: orderedTags,
      references,
      warnings: allWarnings,
      subsidiarilyReferencedBy: [],
      childSpans: [], // Will be populated in the next pass
    };

    spanMap.set(spanID, span);
    spans.push(span);
  });

  // Third pass: populate childSpans arrays now that all spans are created
  tree.walk((spanID: string, node: TreeNode<string>) => {
    if (spanID === TREE_ROOT_ID) {
      return;
    }
    const span = spanMap.get(spanID);
    if (!span) {
      return;
    }
    // Build child spans array from tree structure
    const childSpans = node.children.map(childNode => spanMap.get(childNode.value)!).filter(Boolean);
    (span.childSpans as Span[]).push(...childSpans);
  });

  // Identify root spans from tree structure (direct children of tree root)
  tree.children.forEach(childNode => {
    const rootSpan = spanMap.get(childNode.value);
    if (rootSpan) {
      rootSpans.push(rootSpan);
    }
  });

  // Fourth pass: set up span references and subsidiarilyReferencedBy
  // We do this after all spans are created to avoid mutation issues
  spans.forEach(span => {
    span.references.forEach((ref, index) => {
      const refSpan = spanMap.get(ref.spanID);
      if (refSpan) {
        // Update the reference to point to the actual span
        (ref as any).span = refSpan;
        if (index > 0) {
          // Don't take into account the parent, just other references.
          // Add to subsidiarilyReferencedBy array
          const newRef: SpanReference = {
            spanID: span.spanID,
            traceID,
            span,
            refType: ref.refType,
          };
          (refSpan.subsidiarilyReferencedBy as SpanReference[]).push(newRef);
        }
      }
    });
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
