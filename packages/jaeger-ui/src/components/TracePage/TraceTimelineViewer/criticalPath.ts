// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { CriticalPathSection } from '../../../types/critical_path';
import { IOtelSpan, IOtelTrace } from '../../../types/otel';

function mergeChildrenCriticalPath(
  trace: IOtelTrace,
  spanID: string,
  criticalPath: CriticalPathSection[]
): CriticalPathSection[] {
  if (!criticalPath || criticalPath.length === 0) {
    return [];
  }
  // Define a set to store the IDs of the span and its descendants (if the span is collapsed)
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

  // Use push + reverse to avoid O(M^2) unshift array reallocation when collecting matching sections
  const result: CriticalPathSection[] = [];
  for (let i = 0; i < criticalPath.length; i++) {
    const each = criticalPath[i];
    if (allRequiredSpanIds.has(each.spanID)) {
      if (result.length > 0 && each.sectionEnd === result[result.length - 1].sectionStart) {
        // Merge Critical Paths if they are consecutive
        result[result.length - 1].sectionStart = each.sectionStart;
      } else {
        result.push({ ...each });
      }
    }
  }

  return result.reverse();
}

function buildCriticalPathIndex(criticalPath: CriticalPathSection[]) {
  const result = new Map<string, CriticalPathSection[]>();
  if (!criticalPath) return result;

  for (const section of criticalPath) {
    const sections = result.get(section.spanID);
    if (sections) {
      sections.push(section);
    } else {
      result.set(section.spanID, [section]);
    }
  }

  return result;
}

function buildPrunedCriticalPaths(
  pathBySpanID: ReturnType<typeof buildCriticalPathIndex>,
  prunedServices: Set<string>,
  spans: ReadonlyArray<IOtelSpan>
): Map<string, CriticalPathSection[]> {
  if (prunedServices.size === 0) return new Map();
  const result = new Map<string, CriticalPathSection[]>();

  const collectFromSubtree = (s: IOtelSpan, sections: CriticalPathSection[]) => {
    const spanSections = pathBySpanID.get(s.spanID);
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

export type CriticalPathContext = {
  sectionsFor(span: IOtelSpan, isCollapsed: boolean, hasPrunedChildren: boolean): CriticalPathSection[];
};

export function makeCriticalPathContext(
  trace: IOtelTrace,
  criticalPath: CriticalPathSection[],
  prunedServices: Set<string>
): CriticalPathContext {
  const index = buildCriticalPathIndex(criticalPath);
  const pruned = buildPrunedCriticalPaths(index, prunedServices, trace.spans);
  const collapsedCache = new Map<string, CriticalPathSection[]>();
  const prunedCombinedCache = new Map<string, CriticalPathSection[]>();

  return {
    sectionsFor(span, isCollapsed, hasPrunedChildren) {
      if (isCollapsed) {
        let cached = collapsedCache.get(span.spanID);
        if (!cached) {
          cached = mergeChildrenCriticalPath(trace, span.spanID, criticalPath);
          collapsedCache.set(span.spanID, cached);
        }
        return cached;
      }

      const ownSections = index.get(span.spanID) ?? [];

      if (hasPrunedChildren) {
        let cachedCombined = prunedCombinedCache.get(span.spanID);
        if (!cachedCombined) {
          const prunedSections = pruned.get(span.spanID);
          if (prunedSections && prunedSections.length > 0) {
            cachedCombined = [...ownSections, ...prunedSections];
          } else {
            cachedCombined = ownSections;
          }
          prunedCombinedCache.set(span.spanID, cachedCombined);
        }
        return cachedCombined;
      }

      return ownSections;
    },
  };
}
