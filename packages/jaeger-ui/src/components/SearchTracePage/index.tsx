// Copyright (c) 2026 The Jaeger Authors.
// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback, useMemo } from 'react';
import { Col, Row, Tabs } from 'antd';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import { useConfig } from '../../hooks/useConfig';

import SearchForm from './SearchForm';
import SearchResults from './SearchResults';
import { getUrlState } from './url';
import * as fileReaderActions from '../../actions/file-reader-api';
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
import { ReduxState } from '../../types';
import { SearchQuery } from '../../types/search';
import { useSearchTraces } from '../../hooks/useTraceDiscovery';
import type { TUrlState } from './url';

interface ISearchTracePageImplOwnProps {
  isHomepage?: boolean;
}

// Props from mapStateToProps
interface IStateProps {
  traceResultsToDownload: unknown[];
  urlQueryParams: TUrlState | null;
}

// Props from mapDispatchToProps
interface IDispatchProps {
  loadJsonTraces: (fileList: { file: File }) => void;
}

type SearchTracePageImplProps = ISearchTracePageImplOwnProps & IStateProps & IDispatchProps;

// export for tests
export function SearchTracePageImpl(props: SearchTracePageImplProps) {
  const embedded = useEmbeddedState();
  const { isHomepage, traceResultsToDownload, loadJsonTraces, urlQueryParams } = props;

  // Derive SearchQuery from URL params; null when no service is present (disables the fetch).
  const searchQuery = useMemo((): SearchQuery | null => {
    const q = urlQueryParams;
    if (!q?.service) return null;
    return {
      service: String(q.service ?? ''),
      operation: typeof q.operation === 'string' ? q.operation : null,
      start: String(q.start ?? ''),
      end: String(q.end ?? ''),
      limit: q.limit !== undefined ? Number(q.limit) : 20,
      lookback: String(q.lookback ?? '1h'),
      minDuration: typeof q.minDuration === 'string' ? q.minDuration : null,
      maxDuration: typeof q.maxDuration === 'string' ? q.maxDuration : null,
      tags: typeof q.tags === 'string' ? q.tags : null,
    };
  }, [urlQueryParams]);

  const {
    data: traceSummaries = [],
    isLoading: loadingTraces,
    error: searchError,
  } = useSearchTraces(searchQuery);

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
  const showLogo = isHomepage && !hasTraceResults && !loadingTraces && !errors.length;

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
      children: <FileLoader loadJsonTraces={loadJsonTraces} />,
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
              rawTraces: traceResultsToDownload,
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

export function mapStateToProps(
  state: ReduxState,
  ownProps: { search?: string }
): IStateProps & { isHomepage: boolean } {
  const query = getUrlState(ownProps.search || '');
  const isHomepage = !Object.keys(query).length;
  // rawTraces is populated by the trace reducer when JSON traces are loaded from file.
  // The field exists at runtime but is not in the generated ReduxState type.
  const rawTraces: unknown[] = (state.trace as Record<string, unknown>).rawTraces as unknown[] ?? [];
  return {
    isHomepage,
    traceResultsToDownload: rawTraces,
    urlQueryParams: Object.keys(query).length > 0 ? query : null,
  };
}

function mapDispatchToProps(dispatch: Dispatch): IDispatchProps {
  const { loadJsonTraces } = bindActionCreators(fileReaderActions, dispatch);
  return { loadJsonTraces };
}

const connector = connect(mapStateToProps, mapDispatchToProps);

export default withRouteProps(connector(SearchTracePageImpl));
