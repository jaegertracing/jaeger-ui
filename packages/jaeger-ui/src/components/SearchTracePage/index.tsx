// Copyright (c) 2026 The Jaeger Authors.
// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback, useMemo, useEffect } from 'react';

import { Tabs, Tooltip } from 'antd';
import { IoSearch, IoCloudUpload } from 'react-icons/io5';
import { LuPanelLeftClose } from 'react-icons/lu';
import { useLocation, useNavigate } from 'react-router-dom';

import { useConfig } from '../../hooks/useConfig';

import SearchForm from './SearchForm';
import SearchResults from './SearchResults';
import {
  getUrlState,
  searchQueryFromUrl,
  searchQueryToUrlState,
  getUrl,
  isSameQuery,
  isQueryEmpty,
} from './url';
import ErrorMessage from '../common/ErrorMessage';
import { sortTraceSummaries } from '../../model/search';
import FileLoader from './FileLoader';
import { useUploadedTraces } from './useUploadedTraces';
import VerticalResizer from '../common/VerticalResizer';
import { useSearchPanelStore, PANEL_WIDTH_MIN, PANEL_WIDTH_MAX } from './search-panel-store';

import './index.css';
import JaegerLogo from '../../img/jaeger-logo.svg';
import withRouteProps from '../../utils/withRouteProps';
import { trackSortByChange } from './SearchForm.track';
import { useTraceDiffStore } from '../../stores/trace-diff-store';
import { useEmbeddedState } from '../../stores/embedded-store';
import { useShallow } from 'zustand/react/shallow';
import { useSearchTraces } from '../../hooks/useTraceDiscovery';
import { useSearchResultsStore } from './store.search-results';

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

  const navigate = useNavigate();

  const { data: searchData, isFetching: loadingTraces, error: searchError } = useSearchTraces(searchQuery);

  // When the user returns to /search via TopNav (URL loses query params), restore the URL
  // from the cached query so the address bar remains shareable and bookmarkable.
  // replace:true avoids adding a spurious history entry.
  // isQueryEmpty guards against navigating to a URL that would still parse as null,
  // which would re-trigger this effect on the next render.
  useEffect(() => {
    if (!searchQuery && searchData?.query && !isQueryEmpty(searchData.query)) {
      navigate(getUrl(searchQueryToUrlState(searchData.query)), { replace: true });
    }
  }, [searchQuery, searchData?.query, navigate]);

  // Upgrade legacy URLs that carry only `lookback` without `start`/`end`
  // (e.g. links from HotROD). searchQueryFromUrl derives the timestamps in
  // memory so the API call succeeds, then we rewrite the URL to the canonical
  // form so the link becomes repeatable and shareable.
  const rawUrlState = useMemo(() => getUrlState(location.search), [location.search]);
  useEffect(() => {
    if (searchQuery?.start && searchQuery?.end && !rawUrlState.start && !rawUrlState.end) {
      navigate(getUrl(searchQueryToUrlState(searchQuery)), { replace: true });
    }
  }, [searchQuery, rawUrlState, navigate]);

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
    const apiTraceSummaries = searchData?.results ?? [];
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
  }, [searchData, uploadedSummaries]);

  const { sortBy, setSortBy } = useSearchResultsStore(
    useShallow(s => ({ sortBy: s.sortBy, setSortBy: s.setSortBy }))
  );
  const [activeTab, setActiveTab] = useState<'searchForm' | 'fileLoader'>('searchForm');

  const { panelWidth, collapsed, setPanelWidth, setCollapsed } = useSearchPanelStore(
    useShallow(s => ({
      panelWidth: s.panelWidth,
      collapsed: s.collapsed,
      setPanelWidth: s.setPanelWidth,
      setCollapsed: s.setCollapsed,
    }))
  );

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
  const { addTraceToCohort, removeTraceFromCohort } = useTraceDiffStore(
    useShallow(s => ({
      addTraceToCohort: s.addTraceToCohort,
      removeTraceFromCohort: s.removeTraceFromCohort,
    }))
  );
  const cohortIDs = useTraceDiffStore(s => s.cohort);
  const cohortSummaries = useTraceDiffStore(s => s.cohortSummaries);

  const diffCohort = useMemo(() => {
    const summaryMap = new Map(sortedTraceSummaries.map(s => [s.traceID, s]));
    return cohortIDs.flatMap(id => {
      const s = summaryMap.get(id) ?? cohortSummaries.get(id);
      return s ? [s] : [];
    });
  }, [cohortIDs, cohortSummaries, sortedTraceSummaries]);

  const config = useConfig();
  const { disableFileUploadControl } = config;

  const handleSortChange = useCallback(
    (newSortBy: string) => {
      setSortBy(newSortBy);
      trackSortByChange(newSortBy);
    },
    [setSortBy]
  );

  // Computed synchronously so the loading indicator shows on the first render after Back
  // navigation, before the new keyed-cache fetch completes and searchData is updated.
  const isStale = Boolean(searchQuery && searchData?.query && !isSameQuery(searchQuery, searchData.query));

  const errors: Array<{ message: string }> = searchError
    ? [{ message: searchError instanceof Error ? searchError.message : String(searchError) }]
    : [];

  const hasTraceResults = sortedTraceSummaries.length > 0;
  const showErrors = errors.length > 0 && !loadingTraces;
  const showLogo = isHomepage && !hasTraceResults && !loadingTraces && !errors.length && !embedded;

  const tabItems = [];
  // Search tab is always shown; trace-result loading is shown in SearchResults
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

  const openPanel = useCallback(
    (tab: 'searchForm' | 'fileLoader') => {
      setActiveTab(tab);
      setCollapsed(false);
    },
    [setCollapsed]
  );

  return (
    <div className="SearchTracePage--row">
      {!embedded && collapsed && (
        <div className="SearchTracePage--collapsedPanel">
          <Tooltip title="Search" placement="right">
            <button
              type="button"
              className="SearchTracePage--iconBtn"
              onClick={() => openPanel('searchForm')}
              aria-label="Open search panel"
            >
              <IoSearch />
            </button>
          </Tooltip>
          {!disableFileUploadControl && (
            <Tooltip title="Upload" placement="right">
              <button
                type="button"
                className="SearchTracePage--iconBtn"
                onClick={() => openPanel('fileLoader')}
                aria-label="Open upload panel"
              >
                <IoCloudUpload />
              </button>
            </Tooltip>
          )}
        </div>
      )}
      {!embedded && !collapsed && (
        <div
          className="SearchTracePage--column SearchTracePage--panelColumn"
          style={{ width: `${panelWidth * 100}%` }}
        >
          <div className="SearchTracePage--find">
            <Tabs
              activeKey={activeTab}
              onChange={key => setActiveTab(key as 'searchForm' | 'fileLoader')}
              size="large"
              items={tabItems}
              tabBarExtraContent={{
                right: (
                  <Tooltip title="Collapse panel" placement="right">
                    <button
                      type="button"
                      className="SearchTracePage--collapseBtn"
                      onClick={() => setCollapsed(true)}
                      aria-label="Collapse search panel"
                    >
                      <LuPanelLeftClose />
                    </button>
                  </Tooltip>
                ),
              }}
            />
          </div>
        </div>
      )}
      {!embedded && !collapsed && (
        <VerticalResizer
          min={PANEL_WIDTH_MIN}
          max={PANEL_WIDTH_MAX}
          onChange={setPanelWidth}
          position={panelWidth}
        />
      )}
      <div className="SearchTracePage--column SearchTracePage--resultsColumn">
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
              addTraceToCohort,
              removeTraceFromCohort,
              diffCohort,
              disableComparisons: !!embedded,
              hideGraph: Boolean(embedded?.searchHideGraph),
              loading: loadingTraces || isStale,
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
      </div>
    </div>
  );
}

export default withRouteProps(SearchTracePageImpl);
