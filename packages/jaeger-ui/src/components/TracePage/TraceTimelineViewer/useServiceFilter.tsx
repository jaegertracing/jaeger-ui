// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  EMPTY_SPAN_FILTER,
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
 * saved default and the view default apply only while it does not, and an edit always leaves one,
 * so neither default comes back on a later render of the edited URL. The tree mode alone states no
 * filter; it applies on top of whichever default does.
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
 * Resolves the span filter for a trace from the URL. While the URL states no filter, the view
 * default applies, and the saved default adds its hide clause on service next to it; a `tree`
 * parameter sets the mode of either. Otherwise the clauses come from the repeated `f` parameter and
 * the tree mode from `tree=remove`, else lift. A legacy svcFilter is read as the hide clause on
 * service, in place of one that `f` carries, and brings remove mode, the mode it was written under,
 * unless the URL names one; a stale one, whose checksum is for another service list, hides nothing.
 * Root protection then sanitizes the hide clause on service in remove mode only, where hiding every
 * root empties the tree; in lift mode a hidden root's children become roots. Returns the filter
 * and, when the URL carried a legacy svcFilter or a hide set that sanitization changed, the
 * rewritten search to navigate to, which states the filter so that no default replaces it.
 */
export function resolveInitialFilter(
  search: string,
  sortedServiceNames: string[],
  rootServiceNames: Set<string>,
  viewDefault: ISpanFilter | null = null
): { filter: ISpanFilter; cleanSearch?: string } {
  const params = queryString.parse(search);
  const namesMode = TREE_PARAM in params;
  const treeMode: TreeMode = params[TREE_PARAM] === REMOVE_VALUE ? 'remove' : 'lift';

  if (!urlHasFilterParams(params)) {
    let filter = viewDefault ?? EMPTY_SPAN_FILTER;
    if (namesMode || !viewDefault) filter = { ...filter, treeMode };
    const saved = readDefaultServices(sortedServiceNames, rootServiceNames, filter.treeMode);
    return { filter: saved ? normalizeFilter(withHiddenServices(filter, saved)) : filter };
  }

  const clauses = paramValues(params[CLAUSE_PARAM])
    .map(decodeClause)
    .filter((c): c is IClause => c !== null);
  let filter: ISpanFilter = normalizeFilter({ clauses, treeMode });

  const legacy = params[LEGACY_SERVICE_PARAM];
  let rewrite = typeof legacy === 'string' && legacy !== '';
  if (rewrite) {
    const decoded = decodeSvcFilter(sortedServiceNames, legacy as string);
    if (decoded && !decoded.stale) {
      const pruned = new Set(sortedServiceNames.filter(name => !decoded.visibleServices.has(name)));
      filter = normalizeFilter(withHiddenServices(filter, pruned));
      if (!namesMode) filter = { ...filter, treeMode: 'remove' };
    }
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
  writeClauses(nextParams, filter);
  writeTreeMode(nextParams, filter);
  return { filter, cleanSearch: searchOf(nextParams) };
}

/** Writes the clauses as repeated `f` parameters, an empty list as an empty `f=`. */
function writeClauses(params: queryString.ParsedQuery, filter: ISpanFilter): void {
  const encoded = filter.clauses.map(encodeClause);
  params[CLAUSE_PARAM] = encoded.length ? encoded : '';
}

/** Writes remove mode as `tree=remove`; lift mode, the default, is written as nothing. */
function writeTreeMode(params: queryString.ParsedQuery, filter: ISpanFilter): void {
  if (filter.treeMode === 'remove') {
    params[TREE_PARAM] = REMOVE_VALUE;
  } else {
    delete params[TREE_PARAM];
  }
}

/**
 * Builds the updated search string after a filter change. Every clause is written as a repeated `f`
 * parameter, remove mode as `tree=remove`, and a legacy svcFilter is dropped. An empty clause list
 * is written as an empty `f=` when the URL already stated a filter, a view default applies or a
 * default is saved, so that no default comes back on a later render; otherwise `f` is removed.
 * Returns the new search string (with leading '?' if non-empty, or '').
 */
export function buildFilterSearch(
  currentSearch: string,
  filter: ISpanFilter,
  viewDefault: ISpanFilter | null = null
): string {
  const params = queryString.parse(currentSearch);
  const statedFilter = urlHasFilterParams(params);
  delete params[LEGACY_SERVICE_PARAM];
  writeTreeMode(params, filter);
  if (filter.clauses.length || statedFilter || viewDefault || hasSavedDefault()) {
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
  // The trace the filter was last resolved for. A new trace renders with the filter of the previous
  // one until the resolve effect runs, so the timeline takes the load focus only once this is the
  // trace it shows.
  filterTrace: IOtelTrace | TNil;
  applyFilter: (filter: ISpanFilter, options?: ApplyOptions) => void;
  // The funnel button with its popover, rendered once in the header cluster and once in the
  // timeline column header; the two instances edit the same filter.
  spanFilterNode: React.ReactNode;
};

/**
 * Owns the span filter of the trace page: it resolves the filter from the URL, the saved default
 * and the view default, writes changes back to the URL, deselects a side panel span that a change
 * hides, and renders the funnel button. The trace is null while the page is loading, and then the
 * hook does nothing. The view default is the filter a view applies while the URL is silent, such
 * as the GenAI view's hide clause on the Non-GenAI span type; null for a view without one.
 */
export function useSpanFilter(
  trace: IOtelTrace | TNil,
  detailPanelMode: SpanDetailPanelMode,
  viewDefault: ISpanFilter | null = null
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
  const [filterTrace, setFilterTrace] = useState<IOtelTrace | TNil>(null);
  const hiddenIDs = useMemo(
    () => evaluateSpanFilter(trace?.spans, spanFilter).hiddenIDs,
    [trace?.spans, spanFilter]
  );

  // The search string the hook last navigated to, after an edit or a URL cleanup, so that the
  // resolve effect can tell a stale render for the previous URL from a new navigation. A string
  // rather than a flag survives a re-run for the old URL that lands between the navigation and its
  // commit, which React batches with a view switch.
  const writtenSearch = useRef<string | null>(null);

  // The side panel shows one selected span, and a filter that hides it deselects it, whether the
  // filter came from a control, the URL or a view default. The hidden set is evaluated here for
  // that filter, once per change, in one pass over the spans; the memoized set that TracePage holds
  // is for the committed filter and is not yet updated. The trace and the panel mode are read
  // through a ref so that a change to either does not re-run the resolve effect below.
  const latestProps = useRef({ trace, detailPanelMode });
  latestProps.current = { trace, detailPanelMode };
  const deselectHidden = useCallback((filter: ISpanFilter) => {
    const { trace: current, detailPanelMode: mode } = latestProps.current;
    if (!current || mode !== 'sidepanel') return;
    const currentSelectedID = getSelectedSpanID(useTraceTimelineStore.getState().detailStates);
    if (currentSelectedID && evaluateSpanFilter(current.spans, filter).hiddenIDs.has(currentSelectedID)) {
      // In sidepanel mode detailStates holds at most one entry (the selected span).
      // The Map shape is a leftover from inline mode where multiple spans can be
      // expanded simultaneously. Clearing the whole map is correct here.
      useTraceTimelineStore.setState({ detailStates: new Map() });
    }
  }, []);

  // Resolve the filter from the URL, the saved default or the view default whenever relevant
  // inputs change (trace identity, URL search string, view). Guards against loops by comparing
  // the resolved filter to the current state before writing.
  const lastResolved = useRef<{ search: string; key: string; traceID: string } | null>(null);
  const traceID = trace?.traceID;
  useEffect(() => {
    if (!traceID) return;
    const last = lastResolved.current;
    const sameTrace = last?.traceID === traceID;
    const written = writtenSearch.current === location.search;
    if (writtenSearch.current !== null && !written) {
      // A navigation is pending. A run for the location already resolved, with the same key, is the
      // stale render before that navigation commits, and resolving it would overwrite the filter the
      // user just applied. A run for any other location, including one that restored the same search
      // under a new key, means another navigation won, so the pending one is forgotten.
      if (sameTrace && last.search === location.search && last.key === location.key) return;
      writtenSearch.current = null;
    }
    if (written) writtenSearch.current = null;
    lastResolved.current = { search: location.search, key: location.key, traceID };

    const current = useTraceTimelineStore.getState().spanFilter;
    const resolve = (view: ISpanFilter | null) =>
      resolveInitialFilter(location.search, sortedServiceNames, rootServiceNames, view);
    const spans = latestProps.current.trace?.spans;
    const leavesNothing = (f: ISpanFilter) =>
      Boolean(spans?.length) && evaluateSpanFilter(spans!, f).hiddenIDs.size >= spans!.length;
    let { filter, cleanSearch } = resolve(viewDefault);
    // A default that would leave no span is not applied: first the view default goes, then the
    // saved service default. The check walks the trace, so it runs only when a default applied,
    // which is only while the URL states no filter.
    const urlSilent = !urlHasFilterParams(queryString.parse(location.search));
    if (urlSilent && viewDefault !== null && leavesNothing(filter)) ({ filter, cleanSearch } = resolve(null));
    if (urlSilent && hiddenServices(filter).size > 0 && leavesNothing(filter)) {
      // The saved default is the only source of the hide clause on service while the URL is silent,
      // and it is dropped only when it is the cause.
      const without = withHiddenServices(filter, new Set());
      if (!leavesNothing(without)) filter = without;
    }
    // Avoid unnecessary Zustand writes (and re-renders) when the resolved filter matches. The
    // selection is checked either way, because a trace that arrives after the filter can select a
    // span the filter hides.
    if (!spanFiltersEqual(current, filter)) setSpanFilter(filter);
    deselectHidden(filter);
    setFilterTrace(latestProps.current.trace);
    if (cleanSearch != null && cleanSearch !== location.search) {
      writtenSearch.current = cleanSearch;
      navigate(
        { pathname: location.pathname, search: cleanSearch },
        { replace: true, state: location.state }
      );
    }
  }, [
    deselectHidden,
    location.key,
    location.pathname,
    location.search,
    location.state,
    navigate,
    rootServiceNames,
    sortedServiceNames,
    traceID,
    setSpanFilter,
    viewDefault,
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

      deselectHidden(nextFilter);

      let search = buildFilterSearch(location.search, nextFilter, viewDefault);
      if (options.clearUiFind) {
        const params = queryString.parse(search);
        delete params.uiFind;
        const cleaned = queryString.stringify(params);
        search = cleaned ? `?${cleaned}` : '';
      }
      // An unchanged URL runs no effect, so nothing is pending for it, and a value left over from an
      // edit that a later edit undid before its navigation committed is dropped.
      writtenSearch.current = search !== location.search ? search : null;
      navigate({ pathname: location.pathname, search }, { replace: true, state: location.state });
    },
    [
      setSpanFilter,
      deselectHidden,
      rootServiceNames,
      trace,
      location.pathname,
      location.search,
      location.state,
      navigate,
      viewDefault,
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

  return { spanFilter, filterTrace, applyFilter, spanFilterNode };
}
