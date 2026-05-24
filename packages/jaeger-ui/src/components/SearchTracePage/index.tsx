// Copyright (c) 2026 The Jaeger Authors.
// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback, useMemo, useEffect } from 'react';

import { Col, Row, Tabs } from 'antd';
import { useLocation } from 'react-router-dom';

import { useConfig } from '../../hooks/useConfig';

import SearchForm from './SearchForm';
import SearchResults from './SearchResults';
import { getUrlState, searchQueryFromUrl } from './url';
import * as orderBy from '../../model/order-by';
import ErrorMessage from '../common/ErrorMessage';
import { sortTraceSummaries } from '../../model/search';
import FileLoader from './FileLoader';
import { useUploadedTraces } from './useUploadedTraces';

import './index.css';
import JaegerLogo from '../../img/jaeger-logo.svg';
import withRouteProps from '../../utils/withRouteProps';
import { trackSortByChange } from './SearchForm.track';
import { useTraceDiffStore } from '../../stores/trace-diff-store';
import { useEmbeddedState } from '../../stores/embedded-store';
import { useShallow } from 'zustand/react/shallow';
import { useSearchTraces, useInvalidateTraceSummaries } from '../../hooks/useTraceDiscovery';

// export for tests
export function SearchTracePageImpl() {
  const embedded = useEmbeddedState();

  const location = useLocation();
  const urlQueryParams = useMemo(() => {
    const query = getUrlState(location.search);
    return Object.keys(query).length > 0 ? query : null;
  }, [location.search]);

  const searchQuery = useMemo(() => searchQueryFromUrl(location.search), [location.search]);
  const isHomepage = searchQuery === null;

  const {
    data: apiTraceSummaries = [],
    isFetching: loadingTraces,
    error: searchError,
  } = useSearchTraces(searchQuery);

  const invalidateTraceSummaries = useInvalidateTraceSummaries();

  // Invalidate after every URL change (form submit, bookmark, manual edit, Back/Forward to
  // a different query). Running post-render guarantees that useSearchTraces already holds
  // the new queryFn closure before React Query fires the refetch, which prevents the race
  // where invalidation triggers a fetch with the previous query's closure.
  // isHomepage guard: skip invalidation when there is no search query (homepage).
  useEffect(() => {
    if (!isHomepage) invalidateTraceSummaries();
  }, [location.search, invalidateTraceSummaries, isHomepage]);

  const { uploadedSummaries, uploadedRawTraces, handleTracesLoaded } = useUploadedTraces();

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
