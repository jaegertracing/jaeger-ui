// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import queryString from 'query-string';

import ServiceFilter from './ServiceFilter';
import { getSelectedSpanID, useTraceTimelineStore } from './store';
import {
  decodeSvcFilter,
  encodeSvcFilter,
  getSortedServiceNames,
  SVC_FILTER_DEFAULTS_KEY,
  SvcFilterDefaults,
} from '../url/svcFilter';
import { IOtelTrace } from '../../../types/otel';
import type { SpanDetailPanelMode } from '../../../types/config';

/**
 * Sanitize a pruned set against root service protection rules:
 * - If there's a single root service, it must not be pruned.
 * - If all root services would be pruned, discard the filter entirely.
 */
function sanitizePrunedServices(pruned: Set<string>, rootServiceNames: Set<string>): Set<string> {
  if (pruned.size === 0) return pruned;
  if (rootServiceNames.size === 1) {
    const rootName = rootServiceNames.values().next().value as string;
    if (pruned.has(rootName)) {
      const sanitized = new Set(pruned);
      sanitized.delete(rootName);
      return sanitized;
    }
    return pruned;
  }
  // Multiple roots: ensure at least one root remains visible.
  let anyRootVisible = false;
  for (const name of rootServiceNames) {
    if (!pruned.has(name)) {
      anyRootVisible = true;
      break;
    }
  }
  return anyRootVisible ? pruned : new Set();
}

/**
 * Resolves the initial prunedServices set for a trace.
 * Priority: URL svcFilter param > localStorage defaults > empty (no filter).
 * Returns the pruned set and, if the URL param was stale/invalid, the cleaned params to navigate to.
 */
export function resolveInitialFilter(
  search: string,
  sortedServiceNames: string[],
  rootServiceNames: Set<string>
): { pruned: Set<string>; cleanSearch?: string } {
  const params = queryString.parse(search);
  const svcFilterParam = typeof params.svcFilter === 'string' ? params.svcFilter : null;

  if (svcFilterParam) {
    const decoded = decodeSvcFilter(sortedServiceNames, svcFilterParam);
    if (decoded && !decoded.stale) {
      const allServices = new Set(sortedServiceNames);
      const pruned = new Set<string>();
      for (const name of allServices) {
        if (!decoded.visibleServices.has(name)) pruned.add(name);
      }
      return { pruned: sanitizePrunedServices(pruned, rootServiceNames) };
    }
    // Stale or invalid: build cleaned search string without svcFilter.
    const nextParams = { ...params };
    delete nextParams.svcFilter;
    const cleaned = queryString.stringify(nextParams);
    return { pruned: new Set(), cleanSearch: cleaned ? `?${cleaned}` : '' };
  }

  // No URL param: try localStorage defaults.
  try {
    const stored = localStorage.getItem(SVC_FILTER_DEFAULTS_KEY);
    if (stored) {
      const defaults = JSON.parse(stored) as Partial<SvcFilterDefaults>;
      if (Array.isArray(defaults.prunedServices)) {
        const traceServiceSet = new Set(sortedServiceNames);
        const pruned = new Set(defaults.prunedServices.filter(name => traceServiceSet.has(name)));
        if (pruned.size > 0 && pruned.size < sortedServiceNames.length) {
          return { pruned: sanitizePrunedServices(pruned, rootServiceNames) };
        }
      }
    }
  } catch {
    // Ignore localStorage errors.
  }

  return { pruned: new Set() };
}

/**
 * Builds the updated search string after a filter change.
 * Returns the new search string (with leading '?' if non-empty, or '').
 */
export function buildFilterSearch(
  currentSearch: string,
  sortedServiceNames: string[],
  nextPruned: Set<string>
): string {
  const params = queryString.parse(currentSearch);
  if (nextPruned.size === 0) {
    delete params.svcFilter;
  } else {
    const visible = new Set(sortedServiceNames.filter(name => !nextPruned.has(name)));
    const encoded = encodeSvcFilter(sortedServiceNames, visible);
    if (encoded) {
      params.svcFilter = encoded;
    } else {
      delete params.svcFilter;
    }
  }
  const search = queryString.stringify(params);
  return search ? `?${search}` : '';
}

type UseServiceFilterResult = {
  prunedServices: Set<string>;
  serviceFilterNode: React.ReactNode;
};

/**
 * Hook that manages service filter state, URL sync, localStorage defaults,
 * and side panel cleanup. Returns the current pruned set and a React node
 * to render in the timeline header.
 */
export function useServiceFilter(
  trace: IOtelTrace,
  detailPanelMode: SpanDetailPanelMode
): UseServiceFilterResult {
  const location = useLocation();
  const navigate = useNavigate();
  const sortedServiceNames = useMemo(() => getSortedServiceNames(trace.services), [trace.services]);
  const rootServiceNames = useMemo(() => {
    const names = new Set<string>();
    for (const span of trace.rootSpans) {
      names.add(span.resource.serviceName);
    }
    return names;
  }, [trace.rootSpans]);

  const prunedServices = useTraceTimelineStore(s => s.prunedServices);
  const zustandSetPrunedServices = useTraceTimelineStore(s => s.setPrunedServices);

  // On mount (or trace change): resolve initial filter from URL or localStorage.
  useEffect(() => {
    const { pruned, cleanSearch } = resolveInitialFilter(
      location.search,
      sortedServiceNames,
      rootServiceNames
    );
    zustandSetPrunedServices(pruned);
    if (cleanSearch != null) {
      navigate({ pathname: location.pathname, search: cleanSearch }, { replace: true });
    }
    // Intentionally only re-run when the trace identity changes, not on URL/navigate changes.
    // oxlint-disable-next-line react-x/exhaustive-deps
  }, [trace.traceID]);

  const handleServiceFilterApply = useCallback(
    (nextPruned: Set<string>) => {
      zustandSetPrunedServices(nextPruned);

      // If the currently selected span (side panel) belongs to a pruned service, deselect it.
      if (nextPruned.size > 0 && detailPanelMode === 'sidepanel') {
        const currentDetailStates = useTraceTimelineStore.getState().detailStates;
        const currentSelectedID = getSelectedSpanID(currentDetailStates);
        if (currentSelectedID) {
          const selectedSpan = trace.spanMap.get(currentSelectedID);
          if (selectedSpan && nextPruned.has(selectedSpan.resource.serviceName)) {
            useTraceTimelineStore.setState({ detailStates: new Map() });
          }
        }
      }

      const search = buildFilterSearch(location.search, sortedServiceNames, nextPruned);
      navigate({ pathname: location.pathname, search }, { replace: true });
    },
    [
      zustandSetPrunedServices,
      detailPanelMode,
      trace.spanMap,
      location.pathname,
      location.search,
      sortedServiceNames,
      navigate,
    ]
  );

  const serviceFilterNode = useMemo(
    () => <ServiceFilter trace={trace} prunedServices={prunedServices} onApply={handleServiceFilterApply} />,
    [trace, prunedServices, handleServiceFilterApply]
  );

  return { prunedServices, serviceFilterNode };
}
