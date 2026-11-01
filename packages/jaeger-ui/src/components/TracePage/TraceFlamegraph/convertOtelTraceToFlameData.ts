// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// TODO: Critical-path flamegraph mode
// The current flamegraph shows "total resource cost" (sum of all span durations),
// which is analogous to CPU profiling flamegraphs. However, the original motivation
// for flamegraphs was answering "where is time spent?" in a single-threaded execution.
//
// A critical-path flamegraph would show only the spans that contribute to wall-clock
// latency. Implementation sketch:
// 1. Compute the critical path through the trace (longest sequential chain of spans
//    from root to leaf, accounting for parent-child and follows-from relationships).
// 2. Build flame nodes using only spans on the critical path. At each level, the
//    "value" is the span's contribution to end-to-end latency, not its full duration.
// 3. Parallel children that are NOT on the critical path are excluded entirely (they
//    don't contribute to why the request is slow).
// 4. This could be offered as a toggle: "Resource cost" vs "Critical path" mode.
//
// The critical path algorithm already exists in the timeline view (TraceCriticalPath).
// The timeline's gantt chart answers the same question but becomes noisy with many
// spans — a critical-path flamegraph would provide aggregation + compactness.

import { IOtelTrace, IOtelSpan } from '../../../types/otel';

export interface IFlameNode {
  name: string;
  serviceName: string;
  value: number;
  // Real aggregated duration for display. Equals `value` for leaf/grouped nodes,
  // but preserves the original when `ensureParentCoversChildren` inflates `value`.
  duration: number;
  count: number;
  children: IFlameNode[];
}

export function convertOtelTraceToFlameData(trace: IOtelTrace): IFlameNode {
  const rootSpans = trace.rootSpans;
  const virtualRoot: IFlameNode = {
    name: 'total',
    serviceName: '',
    value: 0,
    duration: 0,
    count: 1,
    children: [],
  };

  for (const span of rootSpans) {
    virtualRoot.children.push(buildSubtree(span));
  }

  virtualRoot.value = virtualRoot.children.reduce((sum, child) => sum + child.value, 0);
  virtualRoot.duration = virtualRoot.value;
  ensureParentCoversChildren(virtualRoot);
  return virtualRoot;
}

// d3-flame-graph uses a partition layout where children's widths are proportional
// to their values within the parent's width. If sum(children.value) > parent.value,
// children overflow beyond the parent frame's right edge, pushing siblings off-screen.
// This happens because span durations represent wall-clock time: overlapping child
// spans (e.g. parallel RPCs) can have a combined duration exceeding the parent's.
// After grouping, the problem is amplified since grouped children accumulate durations.
//
// Only `value` (used for layout width) is inflated; `duration` stays at the real
// aggregated span duration and is what the UI displays to the user.
function ensureParentCoversChildren(node: IFlameNode) {
  if (node.children.length === 0) return;
  for (const child of node.children) {
    ensureParentCoversChildren(child);
  }
  const childSum = node.children.reduce((sum, child) => sum + child.value, 0);
  if (childSum > node.value) {
    node.value = childSum;
  }
}

function buildSubtree(span: IOtelSpan): IFlameNode {
  const children: IFlameNode[] = [];
  for (const child of span.childSpans) {
    children.push(buildSubtree(child));
  }

  const grouped = groupChildrenByName(children);

  return {
    name: `${span.resource.serviceName}: ${span.name}`,
    serviceName: span.resource.serviceName,
    value: span.duration,
    duration: span.duration,
    count: 1,
    children: grouped,
  };
}

function groupChildrenByName(children: IFlameNode[]): IFlameNode[] {
  const groups = new Map<string, IFlameNode>();
  for (const child of children) {
    const existing = groups.get(child.name);
    if (existing) {
      existing.value += child.value;
      existing.duration += child.duration;
      existing.count += child.count;
      existing.children.push(...child.children);
    } else {
      groups.set(child.name, { ...child, children: [...child.children] });
    }
  }
  for (const node of groups.values()) {
    if (node.children.length > 1) {
      node.children = groupChildrenByName(node.children);
    }
  }
  return Array.from(groups.values());
}
