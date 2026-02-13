// Copyright (c) 2026 The Jaeger Authors.
// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useEffect, useCallback } from 'react';
import { Col, Row, Tabs } from 'antd';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import store from 'store';
import memoizeOne from 'memoize-one';

import { useConfig } from '../../hooks/useConfig';

import SearchForm from './SearchForm';
import SearchResults from './SearchResults';
import { isSameQuery, getUrlState } from './url';
import * as jaegerApiActions from '../../actions/jaeger-api';
import * as fileReaderActions from '../../actions/file-reader-api';
import * as orderBy from '../../model/order-by';
import ErrorMessage from '../common/ErrorMessage';
import { actions as traceDiffActions } from '../TraceDiff/duck';
import { fetchedState } from '../../constants';
import { sortTraces } from '../../model/search';
import FileLoader from './FileLoader';

import './index.css';
import JaegerLogo from '../../img/jaeger-logo.svg';
import withRouteProps from '../../utils/withRouteProps';
import { trackSortByChange } from './SearchForm.track';
import { ReduxState, FetchedTrace } from '../../types';
import { SearchQuery } from '../../types/search';
import { Trace } from '../../types/trace';
import { IOtelTrace } from '../../types/otel';
import type { TUrlState } from './url';

interface IQueryOfResults extends Partial<SearchQuery> {
  service?: string;
  limit?: string | number;
}

interface IEmbeddedConfig {
  searchHideGraph?: boolean;
}

interface ISearchTracePageImplOwnProps {
  isHomepage?: boolean;
}

// Props from mapStateToProps
interface IStateProps {
  queryOfResults: IQueryOfResults | null;
  diffCohort: FetchedTrace[];
  embedded?: IEmbeddedConfig;
  loadingTraces: boolean;
  traces: Trace[];
  traceResultsToDownload: unknown[];
  errors: Array<{ message: string }> | null;
  maxTraceDuration: number;
  sortedTracesXformer: (traces: Trace[], sortBy: string) => IOtelTrace[];
  urlQueryParams: TUrlState | null;
}

// Props from mapDispatchToProps
interface IDispatchProps {
  cohortAddTrace: (traceId: string) => void;
  cohortRemoveTrace: (traceId: string) => void;
  fetchMultipleTraces: (traceIds: string[]) => void;
  searchTraces: (query: TUrlState) => void;
  loadJsonTraces: (fileList: { file: File }) => void;
}

type SearchTracePageImplProps = ISearchTracePageImplOwnProps & IStateProps & IDispatchProps;

// export for tests
export function SearchTracePageImpl(props: SearchTracePageImplProps) {
  const {
    cohortAddTrace,
    cohortRemoveTrace,
    diffCohort,
    embedded,
    errors,
    fetchMultipleTraces,
    isHomepage,
    loadingTraces,
    maxTraceDuration,
    traceResultsToDownload,
    queryOfResults,
    loadJsonTraces,
    searchTraces,
    urlQueryParams,
    sortedTracesXformer,
    traces,
  } = props;

  const config = useConfig();
  const { disableFileUploadControl } = config;
  const [sortBy, setSortBy] = useState(orderBy.MOST_RECENT);

  // componentDidMount logic - intentionally runs only on mount
  useEffect(() => {
    if (
      !isHomepage &&
      urlQueryParams &&
      (!queryOfResults || !isSameQuery(urlQueryParams as any, queryOfResults as any))
    ) {
      searchTraces(urlQueryParams);
    }
    const needForDiffs = diffCohort.filter(ft => ft.state == null).map(ft => ft.id);
    if (needForDiffs.length) {
      fetchMultipleTraces(needForDiffs);
    }
    // Intentionally run only on mount, we only want to trigger the initial search
    // and fetch diff traces once when the component loads, not on every state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSortChange = useCallback((newSortBy: string) => {
    setSortBy(newSortBy);
    trackSortByChange(newSortBy);
  }, []);

  const traceResults = sortedTracesXformer(traces, sortBy);
  const hasTraceResults = traceResults && traceResults.length > 0;
  const showErrors = errors && !loadingTraces;
  const showLogo = isHomepage && !hasTraceResults && !loadingTraces && !errors;

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
        <Col span={6} className="SearchTracePage--column">
          <div className="SearchTracePage--find">
            <Tabs size="large" items={tabItems} />
          </div>
        </Col>
      )}
      <Col span={!embedded ? 18 : 24} className="SearchTracePage--column">
        {showErrors && (
          <div className="js-test-error-message">
            <h2>There was an error loading traces: </h2>
            {errors.map(err => (
              <ErrorMessage key={err.message} error={err} />
            ))}
          </div>
        )}
        {!showErrors && (
          <SearchResults
            {...({
              cohortAddTrace,
              cohortRemoveTrace,
              diffCohort,
              disableComparisons: !!embedded,
              hideGraph: embedded && embedded.searchHideGraph,
              loading: loadingTraces,
              maxTraceDuration,
              queryOfResults,
              showStandaloneLink: Boolean(embedded),
              skipMessage: isHomepage,
              spanLinks: urlQueryParams && urlQueryParams.spanLinks,
              traces: traceResults,
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

// Type definitions
interface ITraceMapEntry {
  data: Trace;
}

interface ISearchState {
  query?: SearchQuery;
  results: string[];
  state?: string;
  error?: { message: string } | null;
}

interface IStateTraceDiff {
  cohort: string[];
}

const stateTraceXformer = memoizeOne((stateTrace: ReduxState['trace']) => {
  const { traces: traceMap, search } = stateTrace;
  const { query, results, state, error: traceError } = search;

  const loadingTraces = state === fetchedState.LOADING;
  const traces = results.map(id => traceMap[id].data).filter((t): t is Trace => t !== undefined);
  // rawTraces is populated by the trace reducer when search results are returned
  const rawTraces = (stateTrace as any).rawTraces || [];
  const maxDuration = Math.max(0, ...traces.map(tr => tr.duration || 0));
  return { traces, rawTraces, maxDuration, traceError, loadingTraces, query };
});

const stateTraceDiffXformer = memoizeOne(
  (stateTrace: ReduxState['trace'], stateTraceDiff: IStateTraceDiff) => {
    const { traces } = stateTrace;
    const { cohort } = stateTraceDiff;
    return cohort.map(id => traces[id] || { id, state: null });
  }
);

const sortedTracesXformer = memoizeOne((traces: Trace[], sortBy: string) => {
  const traceResults = traces.slice();
  sortTraces(traceResults, sortBy);
  // Convert to OTEL traces
  return traceResults.map(t => t.asOtelTrace());
});

export function mapStateToProps(state: ReduxState): IStateProps & { isHomepage: boolean } {
  const { embedded, router, traceDiff } = state;
  const query = getUrlState(router.location.search);
  const isHomepage = !Object.keys(query).length;
  const {
    query: queryOfResults,
    traces,
    rawTraces,
    maxDuration,
    traceError,
    loadingTraces,
  } = stateTraceXformer(state.trace);
  const diffCohort = stateTraceDiffXformer(state.trace, traceDiff);
  const errors: Array<{ message: string }> = [];
  if (traceError && typeof traceError === 'object' && 'message' in traceError) {
    errors.push({ message: traceError.message });
  }
  // Note: Removed serviceError, loadingServices and disableFileUploadControl
  // as we no longer use Redux for services (PR 3329).
  return {
    queryOfResults: queryOfResults as IQueryOfResults | null,
    diffCohort,
    embedded,
    isHomepage,
    loadingTraces,
    traces,
    traceResultsToDownload: rawTraces,
    errors: errors.length ? errors : null,
    maxTraceDuration: maxDuration,
    sortedTracesXformer,
    urlQueryParams: Object.keys(query).length > 0 ? query : null,
  };
}

function mapDispatchToProps(dispatch: Dispatch): IDispatchProps {
  const { fetchMultipleTraces, searchTraces } = bindActionCreators(jaegerApiActions, dispatch);
  const { loadJsonTraces } = bindActionCreators(fileReaderActions, dispatch);
  const { cohortAddTrace, cohortRemoveTrace } = bindActionCreators(traceDiffActions, dispatch);
  return {
    cohortAddTrace,
    cohortRemoveTrace,
    fetchMultipleTraces,
    searchTraces,
    loadJsonTraces,
  };
}

const connector = connect(mapStateToProps, mapDispatchToProps);

export default withRouteProps(connector(SearchTracePageImpl));
