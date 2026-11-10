// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import queryString from 'query-string';

import SpanFilterButton from './ServiceFilter';
import { getSelectedSpanID, useTraceTimelineStore } from './store';
import {
  decodeSvcFilter,
  getSortedServiceNames,
  SVC_FILTER_DEFAULTS_KEY,
  SvcFilterDefaults,
} from '../url/svcFilter';
import {
  decodeClause,
  encodeClause,
  evaluateSpanFilter,
  hiddenServices,
  IClause,
  ISpanFilter,
  spanFiltersEqual,
  TreeMode,
  withHiddenServices,
  normalizeFilter,
} from '../spanFilter';
import { IOtelTrace } from '../../../types/otel';
import { TNil } from '../../../types';
import type { SpanDetailPanelMode } from '../../../types/config';
import { useConfig } from '../../../hooks/useConfig';
import storage from '../../../utils/storage';
import defaultConfig from '../../../constants/default-config';

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
const TREE_PARAM = 'tree';
const REMOVE_VALUE = 'remove';
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
 * not come back on a later render of the edited URL. The tree mode alone states no filter.
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
  rootServiceNames: Set<string>,
  treeMode: TreeMode
): Set<string> | null {
  const defaults = storage.getJSON<Partial<SvcFilterDefaults>>(SVC_FILTER_DEFAULTS_KEY);
  if (!defaults || !Array.isArray(defaults.prunedServices)) return null;
  const traceServiceSet = new Set(sortedServiceNames);
  const pruned = new Set(defaults.prunedServices.filter(name => traceServiceSet.has(name)));
  if (pruned.size === 0 || pruned.size >= sortedServiceNames.length) return null;
  return treeMode === 'remove' ? sanitizePrunedServices(pruned, rootServiceNames) : pruned;
}

function hasSavedDefault(): boolean {
  const defaults = storage.getJSON<Partial<SvcFilterDefaults>>(SVC_FILTER_DEFAULTS_KEY);
  return Array.isArray(defaults?.prunedServices) && defaults.prunedServices.length > 0;
}

/**
 * Resolves the span filter for a trace from the URL. The clauses come from the repeated `f`
 * parameter. The tree mode comes from `tree=remove`, else it is lift; a legacy svcFilter that applies brings remove mode, the mode it was written under, unless the URL names one. A legacy svcFilter is read as the hide clause on service, in place of
 * one that `f` carries, and a stale one, whose checksum is for another service list, hides nothing.
 * Root protection then sanitizes the hide clause on service in remove mode only, where hiding every
 * root empties the tree; in lift mode a hidden root's children become roots. The saved default
 * applies only while the URL states no filter. Returns the filter and, when the URL carried a
 * legacy svcFilter or a hide set that sanitization changed, the rewritten search to navigate to.
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
  const treeMode: TreeMode = params[TREE_PARAM] === REMOVE_VALUE ? 'remove' : 'lift';
  let filter: ISpanFilter = normalizeFilter({ clauses, treeMode });

  const legacy = params[LEGACY_SERVICE_PARAM];
  let rewrite = typeof legacy === 'string' && legacy !== '';
  if (rewrite) {
    const decoded = decodeSvcFilter(sortedServiceNames, legacy as string);
    if (decoded && !decoded.stale) {
      const pruned = new Set(sortedServiceNames.filter(name => !decoded.visibleServices.has(name)));
      filter = normalizeFilter(withHiddenServices(filter, pruned));
      // The link was written when hiding a service pruned its subtree, so it renders that way.
      if (!(TREE_PARAM in params)) filter = { ...filter, treeMode: 'remove' };
    }
  }

  if (!urlHasFilterParams(params)) {
    const saved = readDefaultServices(sortedServiceNames, rootServiceNames, treeMode);
    return { filter: saved ? normalizeFilter(withHiddenServices(filter, saved)) : filter };
  }

  if (filter.treeMode === 'remove') {
    const requested = hiddenServices(filter);
    const sanitized = sanitizePrunedServices(requested, rootServiceNames);
    if (!setsEqual(sanitized, requested)) {
      filter = normalizeFilter(withHiddenServices(filter, sanitized));
      rewrite = true;
    }
  }
  if (!rewrite) return { filter };
  const nextParams = { ...params };
  delete nextParams[LEGACY_SERVICE_PARAM];
  writeFilterParams(nextParams, filter);
  return { filter, cleanSearch: searchOf(nextParams) };
}

/** Writes the clauses as repeated `f` parameters, an empty list as an empty `f=`. */
function writeClauses(params: queryString.ParsedQuery, filter: ISpanFilter): void {
  const encoded = filter.clauses.map(encodeClause);
  params[CLAUSE_PARAM] = encoded.length ? encoded : '';
}

/** Writes remove mode as `tree=remove`; the default mode is written as nothing. */
function writeTreeMode(params: queryString.ParsedQuery, filter: ISpanFilter): void {
  if (filter.treeMode === 'remove') {
    params[TREE_PARAM] = REMOVE_VALUE;
  } else {
    delete params[TREE_PARAM];
  }
}

function writeFilterParams(params: queryString.ParsedQuery, filter: ISpanFilter): void {
  writeClauses(params, filter);
  writeTreeMode(params, filter);
}

/**
 * Builds the updated search string after a filter change. Every clause is written as a repeated `f`
 * parameter, remove mode as `tree=remove`, and a legacy svcFilter is dropped. An empty clause list is written as an
 * empty `f=` when the URL already stated a filter or a default is saved, so that the saved default
 * does not come back on a later render; otherwise `f` is removed.
 * Returns the new search string (with leading '?' if non-empty, or '').
 */
export function buildFilterSearch(currentSearch: string, filter: ISpanFilter): string {
  const params = queryString.parse(currentSearch);
  const statedFilter = urlHasFilterParams(params);
  delete params[LEGACY_SERVICE_PARAM];
  writeTreeMode(params, filter);
  if (filter.clauses.length || statedFilter || hasSavedDefault()) {
    writeClauses(params, filter);
  } else {
    delete params[CLAUSE_PARAM];
  }
  return searchOf(params);
}

// The merged config always carries the default, so the fallback only narrows the type.
const DEFAULT_APPLY_THRESHOLD = defaultConfig.traceTimeline?.filterApplyThreshold ?? 10_000;
const NO_SERVICES: IOtelTrace['services'] = [];
const NO_SPANS: IOtelTrace['rootSpans'] = [];

type ApplyOptions = {
  // Save the service selection as the default for future traces.
  saveAsDefault?: boolean;
  // Remove the search text from the URL in the same navigation, for the text-to-chip conversion.
  clearUiFind?: boolean;
};

type UseSpanFilterResult = {
  spanFilter: ISpanFilter;
  applyFilter: (filter: ISpanFilter, options?: ApplyOptions) => void;
  // The funnel button with its popover, rendered once in the header cluster and once in the
  // timeline column header; the two instances edit the same filter.
  spanFilterNode: React.ReactNode;
};

/**
 * Owns the span filter of the trace page: it resolves the filter from the URL and the saved
 * default, writes changes back to the URL, deselects a side panel span that a change hides, and
 * renders the funnel button. The trace is null while the page is loading, and then the hook does
 * nothing.
 */
export function useSpanFilter(
  trace: IOtelTrace | TNil,
  detailPanelMode: SpanDetailPanelMode
): UseSpanFilterResult {
  const location = useLocation();
  const navigate = useNavigate();
  const services = trace?.services ?? NO_SERVICES;
  const rootSpans = trace?.rootSpans ?? NO_SPANS;
  const sortedServiceNames = useMemo(() => getSortedServiceNames(services), [services]);
  const rootServiceNames = useMemo(() => {
    const names = new Set<string>();
    for (const span of rootSpans) {
      names.add(span.resource.serviceName);
    }
    return names;
  }, [rootSpans]);
  const applyThreshold = useConfig().traceTimeline?.filterApplyThreshold ?? DEFAULT_APPLY_THRESHOLD;

  const spanFilter = useTraceTimelineStore(s => s.spanFilter);
  const setSpanFilter = useTraceTimelineStore(s => s.setSpanFilter);
  const hiddenIDs = useMemo(
    () => evaluateSpanFilter(trace?.spans, spanFilter).hiddenIDs,
    [trace?.spans, spanFilter]
  );

  // Resolve the filter from the URL or the saved default whenever relevant inputs change
  // (trace identity, URL search string). Guards against loops by comparing the
  // resolved filter to the current state before writing.
  const traceID = trace?.traceID;
  useEffect(() => {
    if (!traceID) return;
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
    traceID,
    setSpanFilter,
  ]);

  const applyFilter = useCallback(
    (requested: ISpanFilter, options: ApplyOptions = {}) => {
      if (!trace) return;
      // Enforce root service protection in remove mode even if the UI somehow allows it.
      const requestedServices = hiddenServices(requested);
      const nextPruned =
        requested.treeMode === 'remove'
          ? sanitizePrunedServices(requestedServices, rootServiceNames)
          : requestedServices;
      const nextFilter = normalizeFilter(withHiddenServices(requested, nextPruned));
      setSpanFilter(nextFilter);
      if (options.saveAsDefault) {
        const defaults: SvcFilterDefaults = { prunedServices: [...nextPruned] };
        storage.set(SVC_FILTER_DEFAULTS_KEY, defaults);
      }

      // If the currently selected span (side panel) is now hidden, deselect it. The hidden set is
      // computed here for the requested filter, once per apply, in one pass over the spans; the
      // memoized set that TracePage holds is for the committed filter and is not yet updated.
      if (detailPanelMode === 'sidepanel') {
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

      let search = buildFilterSearch(location.search, nextFilter);
      if (options.clearUiFind) {
        const params = queryString.parse(search);
        delete params.uiFind;
        const cleaned = queryString.stringify(params);
        search = cleaned ? `?${cleaned}` : '';
      }
      navigate({ pathname: location.pathname, search }, { replace: true, state: location.state });
    },
    [
      setSpanFilter,
      detailPanelMode,
      rootServiceNames,
      trace,
      location.pathname,
      location.search,
      location.state,
      navigate,
    ]
  );

  const spanFilterNode = useMemo(
    () =>
      trace ? (
        <SpanFilterButton
          key={trace.traceID}
          trace={trace}
          filter={spanFilter}
          hiddenCount={hiddenIDs.size}
          onChange={applyFilter}
          applyThreshold={applyThreshold}
        />
      ) : null,
    [trace, spanFilter, hiddenIDs.size, applyFilter, applyThreshold]
  );

  return { spanFilter, applyFilter, spanFilterNode };
}
