// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import queryString from 'query-string';

import ServiceFilter from './ServiceFilter';
import { getSelectedSpanID, useTraceTimelineStore } from './store';
import {
  decodeSvcFilter,
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
// The parameter that carried the service hide set before `f` did, as a checksum and a bitmask over
// the trace's sorted service names. It is read so that an existing link keeps working, and the URL
// is rewritten without it.
const LEGACY_SERVICE_PARAM = 'svcFilter';

function paramValues(value: string | (string | null)[] | null | undefined): string[] {
  if (value === null || value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).filter((v): v is string => typeof v === 'string');
}

/**
 * Whether the URL states a filter: an `f` parameter, even an empty one, or a legacy svcFilter. The
 * saved default applies only while it does not, and an edit always leaves one, so the default does
 * not come back on a later render of the edited URL.
 */
function urlHasFilterParams(params: queryString.ParsedQuery): boolean {
  return (
    CLAUSE_PARAM in params ||
    (typeof params[LEGACY_SERVICE_PARAM] === 'string' && params[LEGACY_SERVICE_PARAM] !== '')
  );
}

function searchOf(params: queryString.ParsedQuery): string {
  const search = queryString.stringify(params);
  return search ? `?${search}` : '';
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

function hasSavedDefault(): boolean {
  const defaults = storage.getJSON<Partial<SvcFilterDefaults>>(SVC_FILTER_DEFAULTS_KEY);
  return Array.isArray(defaults?.prunedServices) && defaults.prunedServices.length > 0;
}

/**
 * Resolves the span filter for a trace from the URL. The clauses come from the repeated `f`
 * parameter. A legacy svcFilter is read as the hide clause on service, in place of one that `f`
 * carries, and a stale one, whose checksum is for another service list, hides nothing. Root
 * protection then sanitizes the hide clause on service. The saved default applies only while the
 * URL states no filter. Returns the filter and, when the URL carried a legacy svcFilter or a hide
 * set that sanitization changed, the rewritten search to navigate to.
 */
export function resolveInitialFilter(
  search: string,
  sortedServiceNames: string[],
  rootServiceNames: Set<string>
): { filter: ISpanFilter; cleanSearch?: string } {
  const params = queryString.parse(search);
  const clauses = paramValues(params[CLAUSE_PARAM])
    .map(decodeClause)
    .filter((c): c is IClause => c !== null);
  let filter: ISpanFilter = { ...EMPTY_SPAN_FILTER, clauses };

  const legacy = params[LEGACY_SERVICE_PARAM];
  let rewrite = typeof legacy === 'string' && legacy !== '';
  if (rewrite) {
    const decoded = decodeSvcFilter(sortedServiceNames, legacy as string);
    if (decoded && !decoded.stale) {
      const pruned = new Set(sortedServiceNames.filter(name => !decoded.visibleServices.has(name)));
      filter = withHiddenServices(filter, pruned);
    }
  }

  if (!urlHasFilterParams(params)) {
    const saved = readDefaultServices(sortedServiceNames, rootServiceNames);
    return { filter: saved ? withHiddenServices(filter, saved) : filter };
  }

  const requested = hiddenServices(filter);
  const sanitized = sanitizePrunedServices(requested, rootServiceNames);
  if (!setsEqual(sanitized, requested)) {
    filter = withHiddenServices(filter, sanitized);
    rewrite = true;
  }
  if (!rewrite) return { filter };
  const nextParams = { ...params };
  delete nextParams[LEGACY_SERVICE_PARAM];
  writeClauses(nextParams, filter);
  return { filter, cleanSearch: searchOf(nextParams) };
}

/** Writes the clauses as repeated `f` parameters; an empty list is written as an empty `f=`. */
function writeClauses(params: queryString.ParsedQuery, filter: ISpanFilter): void {
  const encoded = filter.clauses.map(encodeClause);
  params[CLAUSE_PARAM] = encoded.length ? encoded : '';
}

/**
 * Builds the updated search string after a filter change. Every clause is written as a repeated `f`
 * parameter, and a legacy svcFilter is dropped. An empty clause list is written as an empty `f=`
 * when the URL already stated a filter or a default is saved, so that the saved default does not
 * come back on a later render; otherwise `f` is removed. The tree mode is not written yet, because
 * row generation does not support lift mode.
 * Returns the new search string (with leading '?' if non-empty, or '').
 */
export function buildFilterSearch(currentSearch: string, filter: ISpanFilter): string {
  const params = queryString.parse(currentSearch);
  const statedFilter = urlHasFilterParams(params);
  delete params[LEGACY_SERVICE_PARAM];
  if (filter.clauses.length || statedFilter || hasSavedDefault()) {
    writeClauses(params, filter);
  } else {
    delete params[CLAUSE_PARAM];
  }
  return searchOf(params);
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

  // Resolve the filter from the URL or the saved default whenever relevant inputs change
  // (trace identity, URL search string). Guards against loops by comparing the
  // resolved filter to the current state before writing.
  useEffect(() => {
    const { filter, cleanSearch } = resolveInitialFilter(
      location.search,
      sortedServiceNames,
      rootServiceNames
    );

    // Avoid unnecessary Zustand writes (and re-renders) when the resolved filter matches.
    const current = useTraceTimelineStore.getState().spanFilter;
    if (!spanFiltersEqual(current, filter)) {
      setSpanFilter(filter);
    }
    if (cleanSearch != null && cleanSearch !== location.search) {
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

      const search = buildFilterSearch(location.search, nextFilter);
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
      navigate,
    ]
  );

  const serviceFilterNode = useMemo(
    () => <ServiceFilter trace={trace} prunedServices={prunedServices} onApply={handleServiceFilterApply} />,
    [trace, prunedServices, handleServiceFilterApply]
  );

  return { prunedServices, serviceFilterNode };
}
