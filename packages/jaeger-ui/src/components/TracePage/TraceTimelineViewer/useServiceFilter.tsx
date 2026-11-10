// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
import {
  decodeClause,
  EMPTY_SPAN_FILTER,
  encodeClause,
  evaluateSpanFilter,
  hiddenServices,
  IClause,
  isServiceHideClause,
  ISpanFilter,
  spanFiltersEqual,
  withHiddenServices,
} from '../spanFilter';
import { IOtelTrace } from '../../../types/otel';
import type { SpanDetailPanelMode } from '../../../types/config';
import storage from '../../../utils/storage';

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

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

const CLAUSE_PARAM = 'f';

function paramValues(value: string | (string | null)[] | null | undefined): string[] {
  if (value === null || value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).filter((v): v is string => typeof v === 'string');
}

/**
 * Reads the saved default, the pruned service names that "Save as Default" writes under
 * SVC_FILTER_DEFAULTS_KEY; it applies when the trace has those services and at least one of them
 * stays visible.
 */
function readDefaultServices(
  sortedServiceNames: string[],
  rootServiceNames: Set<string>
): Set<string> | null {
  const defaults = storage.getJSON<Partial<SvcFilterDefaults>>(SVC_FILTER_DEFAULTS_KEY);
  if (!defaults || !Array.isArray(defaults.prunedServices)) return null;
  const traceServiceSet = new Set(sortedServiceNames);
  const pruned = new Set(defaults.prunedServices.filter(name => traceServiceSet.has(name)));
  if (pruned.size === 0 || pruned.size >= sortedServiceNames.length) return null;
  return sanitizePrunedServices(pruned, rootServiceNames);
}

/**
 * Resolves the span filter for a trace from the URL.
 * The service hide set comes from svcFilter in the URL, else from the saved default; the other
 * clauses come from the repeated `f` parameter and apply in either case. svcFilter is the only
 * carrier of the hide set on service, because it is what the popover writes and what root protection
 * sanitizes, so a hide clause on service inside `f` is ignored. Returns the filter and, if the
 * svcFilter parameter was stale or sanitized, the cleaned params to navigate to.
 */
export function resolveInitialFilter(
  search: string,
  sortedServiceNames: string[],
  rootServiceNames: Set<string>,
  skipDefaults = false
): { filter: ISpanFilter; cleanSearch?: string } {
  const params = queryString.parse(search);
  const svcFilterParam = typeof params.svcFilter === 'string' ? params.svcFilter : null;
  const clauses = paramValues(params[CLAUSE_PARAM])
    .map(decodeClause)
    .filter((c): c is IClause => c !== null && !isServiceHideClause(c));
  let filter: ISpanFilter = { ...EMPTY_SPAN_FILTER, clauses };
  let cleanSearch: string | undefined;

  if (svcFilterParam) {
    const decoded = decodeSvcFilter(sortedServiceNames, svcFilterParam);
    if (decoded && !decoded.stale) {
      const pruned = new Set<string>();
      for (const name of sortedServiceNames) {
        if (!decoded.visibleServices.has(name)) pruned.add(name);
      }
      const sanitized = sanitizePrunedServices(pruned, rootServiceNames);
      filter = withHiddenServices(filter, sanitized);
      // If sanitization changed the filter, normalize svcFilter in the URL.
      if (!setsEqual(sanitized, pruned)) {
        const nextParams = { ...params };
        if (sanitized.size === 0) {
          delete nextParams.svcFilter;
        } else {
          const visible = new Set(sortedServiceNames.filter(n => !sanitized.has(n)));
          nextParams.svcFilter = encodeSvcFilter(sortedServiceNames, visible);
        }
        const cleaned = queryString.stringify(nextParams);
        cleanSearch = cleaned ? `?${cleaned}` : '';
      }
    } else {
      // Stale or invalid: discard the service filter and show all services.
      // Don't fall through to the saved default — the user opened a shared link
      // that no longer applies, so all-visible is the safest default.
      const nextParams = { ...params };
      delete nextParams.svcFilter;
      const cleaned = queryString.stringify(nextParams);
      cleanSearch = cleaned ? `?${cleaned}` : '';
    }
    return { filter, cleanSearch };
  }

  if (skipDefaults) return { filter };
  const saved = readDefaultServices(sortedServiceNames, rootServiceNames);
  return { filter: saved ? withHiddenServices(filter, saved) : filter };
}

/**
 * Builds the updated search string after a filter change. The hide clause on service is written
 * as svcFilter and every other clause as a repeated `f` parameter. The tree mode is not written yet,
 * because row generation does not support lift mode.
 * Returns the new search string (with leading '?' if non-empty, or '').
 */
export function buildFilterSearch(
  currentSearch: string,
  sortedServiceNames: string[],
  filter: ISpanFilter
): string {
  const params = queryString.parse(currentSearch);
  const pruned = hiddenServices(filter);
  const encodedServices = encodeSvcFilter(
    sortedServiceNames,
    new Set(sortedServiceNames.filter(name => !pruned.has(name)))
  );
  if (encodedServices) {
    params.svcFilter = encodedServices;
  } else {
    delete params.svcFilter;
  }
  const others = filter.clauses.filter(c => !isServiceHideClause(c)).map(encodeClause);
  if (others.length) {
    params[CLAUSE_PARAM] = others;
  } else {
    delete params[CLAUSE_PARAM];
  }
  const search = queryString.stringify(params);
  return search ? `?${search}` : '';
}

type UseServiceFilterResult = {
  prunedServices: Set<string>;
  serviceFilterNode: React.ReactNode;
};

/**
 * Hook that manages span filter state, URL sync, saved defaults, and side panel cleanup.
 * Returns the services the filter hides and a React node to render in the timeline header.
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

  const spanFilter = useTraceTimelineStore(s => s.spanFilter);
  const setSpanFilter = useTraceTimelineStore(s => s.setSpanFilter);
  const prunedServices = useMemo(() => hiddenServices(spanFilter), [spanFilter]);

  // After cleaning a stale/sanitized URL, the effect re-runs because location.search changes.
  // This ref prevents that re-run from falling through to the saved default.
  // One hop is sufficient: the cleaned URL either decodes to a valid filter (handled by the
  // URL branch) or has no svcFilter param at all (no further navigation).
  // In neither case does resolveInitialFilter produce another cleanSearch.
  const skipDefaultsRef = useRef(false);

  // Resolve the filter from the URL or the saved default whenever relevant inputs change
  // (trace identity, URL search string). Guards against loops by comparing the
  // resolved filter to the current state before writing.
  useEffect(() => {
    const skipDefaults = skipDefaultsRef.current;
    skipDefaultsRef.current = false;

    const { filter, cleanSearch } = resolveInitialFilter(
      location.search,
      sortedServiceNames,
      rootServiceNames,
      skipDefaults
    );

    // Avoid unnecessary Zustand writes (and re-renders) when the resolved filter matches.
    const current = useTraceTimelineStore.getState().spanFilter;
    if (!spanFiltersEqual(current, filter)) {
      setSpanFilter(filter);
    }
    if (cleanSearch != null && cleanSearch !== location.search) {
      skipDefaultsRef.current = true;
      navigate(
        { pathname: location.pathname, search: cleanSearch },
        { replace: true, state: location.state }
      );
    }
  }, [
    location.pathname,
    location.search,
    location.state,
    navigate,
    rootServiceNames,
    sortedServiceNames,
    trace.traceID,
    setSpanFilter,
  ]);

  const handleServiceFilterApply = useCallback(
    (requested: Set<string>) => {
      // Enforce root service protection even if the UI somehow allows it.
      const nextPruned = sanitizePrunedServices(requested, rootServiceNames);
      const nextFilter = withHiddenServices(useTraceTimelineStore.getState().spanFilter, nextPruned);
      setSpanFilter(nextFilter);

      // If the currently selected span (side panel) is now hidden, deselect it. The hidden set is
      // computed here for the requested services, once per Apply, in one pass over the spans; the
      // memoized set that TracePage holds is for the committed services and is not yet updated.
      if (nextPruned.size > 0 && detailPanelMode === 'sidepanel') {
        const currentDetailStates = useTraceTimelineStore.getState().detailStates;
        const currentSelectedID = getSelectedSpanID(currentDetailStates);
        if (
          currentSelectedID &&
          evaluateSpanFilter(trace.spans, nextFilter).hiddenIDs.has(currentSelectedID)
        ) {
          // In sidepanel mode detailStates holds at most one entry (the selected span).
          // The Map shape is a leftover from inline mode where multiple spans can be
          // expanded simultaneously. Clearing the whole map is correct here.
          useTraceTimelineStore.setState({ detailStates: new Map() });
        }
      }

      const search = buildFilterSearch(location.search, sortedServiceNames, nextFilter);
      // The navigation re-runs the resolve effect when it changes the URL. The user just chose this
      // filter, so the saved default must not come back on that run when the selection is empty.
      // An unchanged URL runs no effect, and the flag would otherwise leak into the next trace.
      if (search !== location.search) skipDefaultsRef.current = true;
      navigate({ pathname: location.pathname, search }, { replace: true, state: location.state });
    },
    [
      setSpanFilter,
      detailPanelMode,
      rootServiceNames,
      trace.spans,
      location.pathname,
      location.search,
      location.state,
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
