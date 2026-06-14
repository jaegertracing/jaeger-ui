// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import _groupBy from 'lodash/groupBy';

import { CriticalPathSection } from '../../../types/critical_path';
import { IOtelSpan, IOtelTrace } from '../../../types/otel';

function mergeChildrenCriticalPath(
  trace: IOtelTrace,
  spanID: string,
  criticalPath: CriticalPathSection[]
): CriticalPathSection[] {
  if (!criticalPath) {
    return [];
  }
  // Define an array to store the IDs of the span and its descendants (if the span is collapsed)
  const allRequiredSpanIds = new Set<string>([spanID]);

  // Use pre-built spanMap
  const spanMap = trace.spanMap;

  // If the span is collapsed, recursively find all of its descendants.
  const findAllDescendants = (span: IOtelSpan) => {
    if (span.hasChildren && span.childSpans.length > 0) {
      span.childSpans.forEach(child => {
        allRequiredSpanIds.add(child.spanID);
        findAllDescendants(child);
      });
    }
  };

  // Start from the initially selected span
  const startingSpan = spanMap.get(spanID);
  if (startingSpan) {
    findAllDescendants(startingSpan);
  }

  const criticalPathSections: CriticalPathSection[] = [];
  criticalPath.forEach(each => {
    if (allRequiredSpanIds.has(each.spanID)) {
      if (criticalPathSections.length !== 0 && each.sectionEnd === criticalPathSections[0].sectionStart) {
        // Merge Critical Paths if they are consecutive
        criticalPathSections[0].sectionStart = each.sectionStart;
      } else {
        criticalPathSections.unshift({ ...each });
      }
    }
  });

  return criticalPathSections;
}

export function buildCriticalPathIndex(criticalPath: CriticalPathSection[]) {
  return _groupBy(criticalPath, x => x.spanID);
}

export function buildPrunedCriticalPaths(
  pathBySpanID: ReturnType<typeof buildCriticalPathIndex>,
  prunedServices: Set<string>,
  spans: ReadonlyArray<IOtelSpan>
): Map<string, CriticalPathSection[]> {
  if (prunedServices.size === 0) return new Map();
  const result = new Map<string, CriticalPathSection[]>();

  const collectFromSubtree = (s: IOtelSpan, sections: CriticalPathSection[]) => {
    const spanSections = pathBySpanID[s.spanID];
    if (spanSections) {
      for (const section of spanSections) {
        sections.push({ ...section });
      }
    }
    for (const child of s.childSpans) {
      collectFromSubtree(child, sections);
    }
  };

  for (const span of spans) {
    if (!span.hasChildren) continue;
    const prunedSections: CriticalPathSection[] = [];
    for (const child of span.childSpans) {
      if (prunedServices.has(child.resource.serviceName)) {
        collectFromSubtree(child, prunedSections);
      }
    }
    if (prunedSections.length > 0) {
      result.set(span.spanID, prunedSections);
    }
  }
  return result;
}

/**
 * Critical path display invariant: a span's bar shows the critical path sections of
 * itself and all spans hidden beneath it, whether hidden by collapse or service filter.
 * - Collapsed: mergeChildrenCriticalPath collects the full subtree (pruning-unaware,
 *   which is correct — a collapsed subtree is entirely hidden regardless of filter).
 * - Expanded with pruned direct children: own sections + pruned subtree sections bubbled
 *   up via memoizedPrunedCriticalPaths. Only direct-child pruning needs handling because
 *   the service filter prunes entire subtrees, so the direct parent is always the nearest
 *   visible ancestor of a pruned span.
 */
export function getVisibleCriticalPathSections(
  isCollapsed: boolean,
  hasPrunedChildren: boolean,
  trace: IOtelTrace,
  span: IOtelSpan,
  criticalPath: CriticalPathSection[],
  pathBySpanID: ReturnType<typeof buildCriticalPathIndex>,
  prunedPaths: Map<string, CriticalPathSection[]>
) {
  if (isCollapsed) {
    return mergeChildrenCriticalPath(trace, span.spanID, criticalPath);
  }

  const ownSections = span.spanID in pathBySpanID ? pathBySpanID[span.spanID] : [];

  if (hasPrunedChildren) {
    // Precomputed map of parent spanID → critical path sections from pruned subtrees.
    const prunedSections = prunedPaths.get(span.spanID);
    if (prunedSections && prunedSections.length > 0) {
      return [...ownSections, ...prunedSections];
    }
  }

  return ownSections;
}
