// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Component } from 'react';
import { Col, Row, Tabs } from 'antd';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import store from 'store';
import memoizeOne from 'memoize-one';

import SearchFormWithOtlpMetadata from './SearchFormWithOtlpMetadata';
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

interface IServiceWithOperations {
  name: string;
  operations: string[];
}

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

interface ISearchTracePageImplState {
  sortBy: string;
}

// Props from mapStateToProps
interface IStateProps {
  queryOfResults: IQueryOfResults | null;
  diffCohort: FetchedTrace[];
  embedded?: IEmbeddedConfig;
  loadingServices: boolean;
  disableFileUploadControl?: boolean;
  loadingTraces: boolean;
  services: IServiceWithOperations[] | null;
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
  fetchServiceOperations: (service: string) => void;
  fetchServices: () => void;
  searchTraces: (query: TUrlState) => void;
  loadJsonTraces: (fileList: { file: File }) => void;
}

type SearchTracePageImplProps = ISearchTracePageImplOwnProps & IStateProps & IDispatchProps;

// export for tests
export class SearchTracePageImpl extends Component<SearchTracePageImplProps, ISearchTracePageImplState> {
  state: ISearchTracePageImplState = {
    sortBy: orderBy.MOST_RECENT,
  };

  componentDidMount() {
    const { diffCohort, fetchMultipleTraces, isHomepage, queryOfResults, searchTraces, urlQueryParams } =
      this.props;
    if (
      !isHomepage &&
      urlQueryParams &&
      queryOfResults &&
      !isSameQuery(urlQueryParams as any, queryOfResults as any)
    ) {
      searchTraces(urlQueryParams);
    }
    const needForDiffs = diffCohort.filter(ft => ft.state == null).map(ft => ft.id);
    if (needForDiffs.length) {
      fetchMultipleTraces(needForDiffs);
    }
    // Note: No longer calling fetchServices() or fetchServiceOperations()
    // The SearchFormWithOtlpMetadata component handles this via React Query
  }

  handleSortChange = (sortBy: string) => {
    this.setState({ sortBy });
    trackSortByChange(sortBy);
  };

  render() {
    const {
      cohortAddTrace,
      cohortRemoveTrace,
      diffCohort,
      embedded,
      errors,
      isHomepage,
      disableFileUploadControl,
      loadingTraces,
      maxTraceDuration,
      traceResultsToDownload,
      queryOfResults,
      loadJsonTraces,
      urlQueryParams,
      sortedTracesXformer,
      traces,
    } = this.props;
    const { sortBy } = this.state;
    const traceResults = sortedTracesXformer(traces, sortBy);
    const hasTraceResults = traceResults && traceResults.length > 0;
    const showErrors = errors && !loadingTraces;
    const showLogo = isHomepage && !hasTraceResults && !loadingTraces && !errors;
    const tabItems = [];
    // Always show the search form, loading is handled by SearchFormWithOtlpMetadata
    tabItems.push({
      label: 'Search',
      key: 'searchForm',
      children: <SearchFormWithOtlpMetadata key={JSON.stringify(urlQueryParams)} />,
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
                sortBy: this.state.sortBy,
                handleSortChange: this.handleSortChange,
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
  const maxDuration = Math.max.apply(
    null,
    traces.map(tr => tr.duration)
  );
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

// export to test
export function mapStateToProps(state: ReduxState): IStateProps & { isHomepage: boolean } {
  const { embedded, router, traceDiff, config } = state;
  const query = getUrlState(router.location.search);
  const isHomepage = !Object.keys(query).length;
  const { disableFileUploadControl } = config;
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
  // Note: Removed serviceError check as we no longer use Redux for services
  return {
    queryOfResults: queryOfResults as IQueryOfResults | null,
    diffCohort,
    embedded,
    isHomepage,
    disableFileUploadControl,
    loadingTraces,
    loadingServices: false, // Stubbed out
    services: null, // Stubbed out
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
    fetchServiceOperations: () => {}, // Stubbed out
    fetchServices: () => {}, // Stubbed out
    searchTraces,
    loadJsonTraces,
  };
}

const connector = connect(mapStateToProps, mapDispatchToProps);

export default withRouteProps(connector(SearchTracePageImpl));
