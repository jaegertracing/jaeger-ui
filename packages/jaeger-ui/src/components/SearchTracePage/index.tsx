// Copyright (c) 2026 The Jaeger Authors.
// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient, skipToken } from '@tanstack/react-query';
import { Col, Row, Tabs } from 'antd';
import { useLocation } from 'react-router-dom';

import { useConfig } from '../../hooks/useConfig';

import SearchForm from './SearchForm';
import SearchResults from './SearchResults';
import { getUrlState } from './url';
import * as orderBy from '../../model/order-by';
import ErrorMessage from '../common/ErrorMessage';
import { sortTraceSummaries } from '../../model/search';
import FileLoader from './FileLoader';

import './index.css';
import JaegerLogo from '../../img/jaeger-logo.svg';
import withRouteProps from '../../utils/withRouteProps';
import { trackSortByChange } from './SearchForm.track';
import { useTraceDiffStore } from '../../stores/trace-diff-store';
import { useEmbeddedState } from '../../stores/embedded-store';
import { useShallow } from 'zustand/react/shallow';
import { SearchQuery } from '../../types/search';
import { useSearchTraces } from '../../hooks/useTraceDiscovery';
import type { TraceSummary } from '../../types/trace-summary';

// export for tests
export function SearchTracePageImpl() {
  const embedded = useEmbeddedState();

  const location = useLocation();
  const urlQueryParams = useMemo(() => {
    const query = getUrlState(location.search);
    return Object.keys(query).length > 0 ? query : null;
  }, [location.search]);

  const isHomepage = urlQueryParams === null;

  // Derive SearchQuery from URL params; null when no service is present (disables the fetch).
  // Note: SearchForm always resolves lookback to explicit start/end before pushing to the URL,
  // so start/end are expected to be present for any real search. The lookback field is kept in
  // the query for compatibility with the SearchForm but is not forwarded to fetchTraceSummaries
  // (fetchTraceSummaries omits start_time_min/max when start/end are absent).
  const searchQuery = useMemo((): SearchQuery | null => {
    const q = urlQueryParams;
    if (!q?.service) return null;
    return {
      service: String(q.service ?? ''),
      operation: typeof q.operation === 'string' ? q.operation : undefined,
      start: String(q.start ?? ''),
      end: String(q.end ?? ''),
      limit: (() => {
        const n = Number(Array.isArray(q.limit) ? q.limit[0] : q.limit);
        return Number.isFinite(n) && n > 0 ? n : 20;
      })(),
      lookback: String(q.lookback ?? '1h'),
      minDuration: typeof q.minDuration === 'string' ? q.minDuration : undefined,
      maxDuration: typeof q.maxDuration === 'string' ? q.maxDuration : undefined,
      tags: typeof q.tags === 'string' ? q.tags : undefined,
    };
  }, [urlQueryParams]);

  const {
    data: apiTraceSummaries = [],
    isLoading: loadingTraces,
    error: searchError,
  } = useSearchTraces(searchQuery);

  const queryClient = useQueryClient();

  // Uploaded summaries and raw traces are singleton caches — there is only one set of
  // uploaded results at any time, not one per uploaded file. skipToken means no fetch
  // is triggered; the hooks just subscribe to cache updates so the component re-renders
  // when setQueryData is called after file upload.
  // gcTime: Infinity is justified (same reasoning as ['traceSummaries']): exactly one
  // entry exists, so keeping it alive indefinitely does not cause memory growth, and it
  // ensures the Back button always returns to uploaded results regardless of how long
  // the user spent on the trace page.
  // Uploaded results are cleared when a new API search is submitted (see effect below).
  const { data: uploadedSummaries = [] } = useQuery<TraceSummary[]>({
    queryKey: ['uploadedSummaries'],
    queryFn: skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const { data: uploadedRawTraces = [] } = useQuery<unknown[]>({
    queryKey: ['uploadedRawTraces'],
    queryFn: skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // When the search parameters change, invalidate the cached results so React Query
  // re-runs the fetch with the new query, and clear uploaded traces so the result list
  // reflects only the current search context.
  // Do NOT clear when searchQuery becomes null (e.g. Back from a trace with no active
  // search) — that would wipe upload-only results on the homepage.
  //
  // The effect has no dependency array so it runs on every render and uses a ref to
  // compare the previous and current searchQuery by reference. A [searchQuery] dependency
  // array cannot distinguish "first render with a non-null query" from "same query on
  // re-render", which would cause spurious invalidations.
  const prevSearchQueryRef = React.useRef(searchQuery);
  useEffect(() => {
    const prev = prevSearchQueryRef.current;
    prevSearchQueryRef.current = searchQuery;
    if (searchQuery !== null && prev !== searchQuery) {
      queryClient.invalidateQueries({ queryKey: ['traceSummaries'] });
      queryClient.setQueryData(['uploadedSummaries'], []);
      queryClient.setQueryData(['uploadedRawTraces'], []);
    }
  });

  const handleTracesLoaded = useCallback(
    (summaries: TraceSummary[], rawTraces: unknown[]) => {
      queryClient.setQueryData<TraceSummary[]>(['uploadedSummaries'], prev => [
        ...(prev ?? []),
        ...summaries,
      ]);
      queryClient.setQueryData<unknown[]>(['uploadedRawTraces'], prev => [...(prev ?? []), ...rawTraces]);
    },
    [queryClient]
  );

  // Merge API and uploaded summaries, deduplicating by traceID (API results take precedence).
  // Duplicates arise when the same file is uploaded twice or an uploaded trace also appears
  // in API results; without dedup the list gets duplicate React keys and may render incorrectly.
  // `seen` is updated as each uploaded entry is accepted so duplicates within uploads are
  // also removed (not just duplicates between uploads and API results).
  //
  // uploadedTraceIDs is derived from uniqueUploaded (not all uploadedSummaries) so that
  // traces present in both API results and uploads are not incorrectly badged as "Uploaded"
  // — the API result takes precedence and the badge should not appear on it.
  const { traceSummaries, uploadedTraceIDs } = useMemo(() => {
    const seen = new Set(apiTraceSummaries.map(s => s.traceID));
    const uniqueUploaded = uploadedSummaries.filter(s => {
      if (seen.has(s.traceID)) return false;
      seen.add(s.traceID);
      return true;
    });
    return {
      traceSummaries: [...apiTraceSummaries, ...uniqueUploaded],
      uploadedTraceIDs: new Set(uniqueUploaded.map(s => s.traceID)),
    };
  }, [apiTraceSummaries, uploadedSummaries]);

  const [sortBy, setSortBy] = useState(orderBy.MOST_RECENT);

  const sortedTraceSummaries = useMemo(
    () => sortTraceSummaries(traceSummaries, sortBy),
    [traceSummaries, sortBy]
  );

  const maxTraceDuration = useMemo(
    () => Math.max(0, ...traceSummaries.map(t => t.duration)),
    [traceSummaries]
  );

  // On Search: when we click "add to compare" / remove, we write that list
  // straight into the store. So the list is not only updated when the
  // tracediff is open - search updates it itself.
  //
  // On compare page: the browser URL is what we trust for that view.
  // When that screen loads, we compare URL vs store and, if they differ,
  // we copy the URL into the store so everything matches.
  //
  // So in normal use: search fills the list from clicks; compare corrects
  // the list from the URL when we open it. TopNav reads the store to build
  // the Compare link - same list search is using. Having both URL
  // and store can sound like two sources of truth. The idea is: URL wins
  // when we are on compare; while we are on Search, the list in the store
  // is whatever we set with the ui actions, not something that only updates
  // when we open the compare page.
  const { cohortAddTrace, cohortRemoveTrace } = useTraceDiffStore(
    useShallow(s => ({
      cohortAddTrace: s.cohortAddTrace,
      cohortRemoveTrace: s.cohortRemoveTrace,
    }))
  );
  const cohort = useTraceDiffStore(s => s.cohort);

  const diffCohort = useMemo(() => {
    const summaryMap = new Map(sortedTraceSummaries.map(s => [s.traceID, s]));
    return cohort.flatMap(id => {
      const s = summaryMap.get(id);
      return s ? [s] : [];
    });
  }, [cohort, sortedTraceSummaries]);

  const config = useConfig();
  const { disableFileUploadControl } = config;

  const handleSortChange = useCallback((newSortBy: string) => {
    setSortBy(newSortBy);
    trackSortByChange(newSortBy);
  }, []);

  const errors: Array<{ message: string }> = searchError
    ? [{ message: searchError instanceof Error ? searchError.message : String(searchError) }]
    : [];

  const hasTraceResults = sortedTraceSummaries.length > 0;
  const showErrors = errors.length > 0 && !loadingTraces;
  const showLogo = isHomepage && !hasTraceResults && !loadingTraces && !errors.length && !embedded;

  const tabItems = [];
  // Always show the search form, loading is handled by SearchForm
  tabItems.push({
    label: 'Search',
    key: 'searchForm',
    children: <SearchForm key={JSON.stringify(urlQueryParams)} />,
  });
  if (!disableFileUploadControl) {
    tabItems.push({
      label: 'Upload',
      key: 'fileLoader',
      children: <FileLoader onTracesLoaded={handleTracesLoaded} />,
    });
  }

  return (
    <Row className="SearchTracePage--row">
      {!embedded && (
        <Col xs={24} sm={6} className="SearchTracePage--column">
          <div className="SearchTracePage--find">
            <Tabs size="large" items={tabItems} />
          </div>
        </Col>
      )}
      <Col xs={24} sm={!embedded ? 18 : 24} className="SearchTracePage--column">
        {showErrors && (
          <div className="js-test-error-message">
            <h2>There was an error loading traces: </h2>
            {errors.map(err => (
              <ErrorMessage key={err.message} error={err} />
            ))}
          </div>
        )}
        {!showErrors && (
          // SearchResults is wrapped with withRouteProps, so its prop types aren't visible to TS.
          <SearchResults
            {...({
              cohortAddTrace,
              cohortRemoveTrace,
              diffCohort,
              disableComparisons: !!embedded,
              hideGraph: Boolean(embedded?.searchHideGraph),
              loading: loadingTraces,
              maxTraceDuration,
              queryOfResults: searchQuery,
              showStandaloneLink: Boolean(embedded),
              skipMessage: isHomepage,
              spanLinks: urlQueryParams?.spanLinks,
              traceSummaries: sortedTraceSummaries,
              uploadedTraceIDs,
              rawTraces: uploadedRawTraces,
              sortBy,
              handleSortChange,
            } as any)}
          />
        )}
        {showLogo && (
          <img
            className="SearchTracePage--logo js-test-logo"
            alt="presentation"
            src={JaegerLogo}
            width="400"
          />
        )}
      </Col>
    </Row>
  );
}

export default withRouteProps(SearchTracePageImpl);
