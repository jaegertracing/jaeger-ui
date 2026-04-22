// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import _groupBy from 'lodash/groupBy';
import memoizeOne from 'memoize-one';
import { CriticalPathSection } from '../../../types/critical_path';
import { IOtelSpan, IOtelTrace } from '../../../types/otel';

function buildCriticalPathIndex(criticalPath: CriticalPathSection[]): Record<string, CriticalPathSection[]> {
  return _groupBy(criticalPath, x => x.spanID);
}

// Returns a map from parent spanID → critical path sections bubbled up from pruned subtrees.
function buildPrunedCriticalPaths(
  criticalPath: CriticalPathSection[],
  prunedServices: Set<string>,
  spans: ReadonlyArray<IOtelSpan>
): Map<string, CriticalPathSection[]> {
  if (prunedServices.size === 0) return new Map();
  const pathBySpanID = buildCriticalPathIndex(criticalPath);
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

function mergeChildrenCriticalPath(
  trace: IOtelTrace,
  spanID: string,
  criticalPath: CriticalPathSection[] | undefined
): CriticalPathSection[] {
  if (!criticalPath) {
    return [];
  }

  const allRequiredSpanIds = new Set<string>([spanID]);
  const spanMap = trace.spanMap;

  const findAllDescendants = (span: IOtelSpan) => {
    if (span.hasChildren && span.childSpans.length > 0) {
      span.childSpans.forEach(child => {
        allRequiredSpanIds.add(child.spanID);
        findAllDescendants(child);
      });
    }
  };

  const startingSpan = spanMap.get(spanID);
  if (startingSpan) {
    findAllDescendants(startingSpan);
  }

  const criticalPathSections: CriticalPathSection[] = [];
  criticalPath.forEach(each => {
    if (allRequiredSpanIds.has(each.spanID)) {
      if (criticalPathSections.length !== 0 && each.sectionEnd === criticalPathSections[0].sectionStart) {
        criticalPathSections[0].sectionStart = each.sectionStart;
      } else {
        criticalPathSections.unshift({ ...each });
      }
    }
  });

  return criticalPathSections;
}

const EMPTY_MAP: Map<string, CriticalPathSection[]> = new Map();
const memoizedBuildCriticalPathIndex = memoizeOne(buildCriticalPathIndex);
const memoizedBuildPrunedCriticalPaths = memoizeOne(buildPrunedCriticalPaths);

// Display invariant: a span's bar shows critical path sections for itself and all spans
// hidden beneath it — whether hidden by collapse or service filter.
// Collapsed: mergeChildrenCriticalPath collects the full subtree.
// Expanded with pruned direct children: own sections + bubbled sections from prunedPathsCache.
function getVisibleCriticalPathSections(
  span: IOtelSpan,
  isCollapsed: boolean,
  hasPrunedChildren: boolean,
  trace: IOtelTrace,
  criticalPath: CriticalPathSection[],
  pathBySpanID: Record<string, CriticalPathSection[]>,
  prunedPathsCache: Map<string, CriticalPathSection[]>
): CriticalPathSection[] {
  if (isCollapsed) {
    return mergeChildrenCriticalPath(trace, span.spanID, criticalPath);
  }

  const ownSections = span.spanID in pathBySpanID ? pathBySpanID[span.spanID] : [];

  if (hasPrunedChildren) {
    const prunedSections = prunedPathsCache.get(span.spanID);
    if (prunedSections && prunedSections.length > 0) {
      return [...ownSections, ...prunedSections];
    }
  }

  return ownSections;
}

export function getCriticalPathSections(
  span: IOtelSpan,
  isCollapsed: boolean,
  hasPrunedChildren: boolean,
  trace: IOtelTrace,
  criticalPath: CriticalPathSection[] | undefined,
  prunedServices: Set<string>
): CriticalPathSection[] {
  if (isCollapsed) {
    return mergeChildrenCriticalPath(trace, span.spanID, criticalPath);
  }
  const pathBySpanID = memoizedBuildCriticalPathIndex(criticalPath ?? []);
  const prunedPathsCache = hasPrunedChildren
    ? memoizedBuildPrunedCriticalPaths(criticalPath, prunedServices, trace.spans)
    : EMPTY_MAP;
  return getVisibleCriticalPathSections(
    span,
    false,
    hasPrunedChildren,
    trace,
    criticalPath,
    pathBySpanID,
    prunedPathsCache
  );
}
