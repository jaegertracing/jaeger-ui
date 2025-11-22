// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';

jest.mock('store');
jest.mock('../../actions/jaeger-api', () => ({
  fetchMultipleTraces: jest.fn(params => ({ type: 'fetchMultipleTraces', params })),
  fetchServiceOperations: jest.fn(service => ({ type: 'fetchServiceOperations', service })),
  fetchServices: jest.fn(() => ({ type: 'fetchServices' })),
  searchTraces: jest.fn(query => ({ type: 'searchTraces', query })),
}));
jest.mock('../../actions/file-reader-api', () => ({
  loadJsonTraces: jest.fn(payload => ({ type: 'loadJsonTraces', payload })),
}));
jest.mock('../TraceDiff/duck', () => ({
  actions: {
    cohortAddTrace: jest.fn(trace => ({ type: 'cohortAddTrace', trace })),
    cohortRemoveTrace: jest.fn(trace => ({ type: 'cohortRemoveTrace', trace })),
  },
}));

import React from 'react';
import { cleanup, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import store from 'store';

import { Provider } from 'react-redux';
import { SearchTracePageImpl as SearchTracePage, mapStateToProps, mapDispatchToProps } from './index';
import { fetchedState } from '../../constants';
import traceGenerator from '../../demo/trace-generators';
import { MOST_RECENT, MOST_SPANS } from '../../model/order-by';
import transformTraceData from '../../model/transform-trace-data';
import { store as globalStore } from '../../utils/configure-store';
import * as searchModel from '../../model/search';
import * as jaegerApiActions from '../../actions/jaeger-api';
import * as fileReaderActions from '../../actions/file-reader-api';
import { actions as traceDiffActions } from '../TraceDiff/duck';

const mockSearchResultsProps = [];
const getLastSearchResultsProps = () => mockSearchResultsProps[mockSearchResultsProps.length - 1];

jest.mock('./SearchResults', () => {
  const React = require('react');
  return function MockSearchResults(props) {
    mockSearchResultsProps.push(props);
    return (
      <div data-testid="search-results-mock" data-disablecomparisons={props.disableComparisons}>
        SearchResultsMock
      </div>
    );
  };
});

const AllProvider = ({ children }) => (
  <BrowserRouter>
    <Provider store={globalStore}>
      <MemoryRouter>
        <CompatRouter>{children}</CompatRouter>
      </MemoryRouter>
    </Provider>
  </BrowserRouter>
);

describe('<SearchTracePage>', () => {
  const queryOfResults = {};
  let traces;
  let traceResultsToDownload;
  let props;

  beforeEach(() => {
    mockSearchResultsProps.length = 0;
    traces = [
      { traceID: 'a', spans: [], processes: {} },
      { traceID: 'b', spans: [], processes: {} },
    ];
    traceResultsToDownload = [
      { traceID: 'a', spans: [], processes: {} },
      { traceID: 'b', spans: [], processes: {} },
    ];
    props = {
      queryOfResults,
      traces,
      traceResultsToDownload,
      diffCohort: [],
      isHomepage: false,
      loadingServices: false,
      loadingTraces: false,
      disableFileUploadControl: false,
      maxTraceDuration: 100,
      numberOfTraceResults: traces.length,
      services: null,
      sortedTracesXformer: jest.fn(() => traces),
      urlQueryParams: { service: 'svc-a' },
      embedded: null,
      errors: null,
      cohortAddTrace: jest.fn(),
      cohortRemoveTrace: jest.fn(),
      loadJsonTraces: jest.fn(),
      // actions
      fetchServiceOperations: jest.fn(),
      fetchServices: jest.fn(),
      fetchMultipleTraces: jest.fn(),
      searchTraces: jest.fn(),
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('searches for traces if `service` or `traceID` are in the query string', () => {
    render(
      <AllProvider>
        <SearchTracePage {...props} />
      </AllProvider>
    );
    expect(props.searchTraces).toHaveBeenCalledTimes(1);
    expect(props.searchTraces).toHaveBeenCalledWith(props.urlQueryParams);
  });

  it('does not search when already on the homepage or when the query matches existing results', () => {
    const searchTraces = jest.fn();

    render(
      <AllProvider>
        <SearchTracePage {...{ ...props, searchTraces, isHomepage: true, urlQueryParams: null }} />
      </AllProvider>
    );

    expect(searchTraces).not.toHaveBeenCalled();

    render(
      <AllProvider>
        <SearchTracePage
          {...{
            ...props,
            searchTraces,
            isHomepage: false,
            urlQueryParams: props.queryOfResults,
          }}
        />
      </AllProvider>
    );

    expect(searchTraces).not.toHaveBeenCalled();
  });

  it('loads the services and operations if a service is stored', () => {
    props.fetchServices.mockClear();
    props.fetchServiceOperations.mockClear();
    const oldFn = store.get;
    store.get = jest.fn(() => ({ service: 'svc-b' }));
    render(
      <AllProvider>
        <SearchTracePage {...{ ...props, urlQueryParams: {} }} />
      </AllProvider>
    );
    expect(props.fetchServices).toHaveBeenCalledTimes(1);
    expect(props.fetchServiceOperations).toHaveBeenCalledTimes(1);
    expect(props.fetchServiceOperations).toHaveBeenCalledWith('svc-b');
    store.get = oldFn;
  });

  it('loads the operations linked to the URL service parameter if present', () => {
    props.fetchServices.mockClear();
    props.fetchServiceOperations.mockClear();
    const oldFn = store.get;
    store.get = jest.fn(() => ({ service: 'svc-b' }));
    render(
      <AllProvider>
        <SearchTracePage {...props} />
      </AllProvider>
    );
    expect(props.fetchServices).toHaveBeenCalledTimes(1);
    expect(props.fetchServiceOperations).toHaveBeenCalledTimes(1);
    expect(props.fetchServiceOperations).toHaveBeenCalledWith('svc-a');
    store.get = oldFn;
  });

  it('keeps services in loading state when selected service from localStorage has no operations loaded', () => {
    const { mapStateToProps } = require('./index');
    const oldFn = store.get;
    store.get = jest.fn(() => ({ service: 'svc-a', operation: 'op-a' }));

    // Create state where service exists but operations are not loaded yet
    const state = {
      embedded: null,
      router: { location: { search: '' } },
      services: {
        loading: false,
        services: ['svc-a', 'svc-b'],
        operationsForService: {}, // No operations loaded yet for svc-a
        error: null,
      },
      traceDiff: { cohort: [] },
      config: { disableFileUploadControl: false },
      trace: {
        search: {
          query: null,
          results: [],
          state: 'DONE',
          error: null,
        },
        traces: {},
        rawTraces: [],
      },
    };
    const result = mapStateToProps(state);
    expect(result.loadingServices).toBe(true);
    expect(result.services).toEqual(['svc-a', 'svc-b']);
    store.get = oldFn;
  });

  it('fetches missing cohort traces when diff selections have no data', () => {
    const testProps = {
      ...props,
      diffCohort: [
        { id: 'trace-1', state: null },
        { id: 'trace-2', state: 'DONE' },
      ],
    };

    render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );

    expect(testProps.fetchMultipleTraces).toHaveBeenCalledWith(['trace-1']);
  });

  it('does not fetch operations when stored service is a placeholder value', () => {
    const oldFn = store.get;
    store.get = jest.fn(() => ({ service: '-' }));
    const testProps = { ...props, urlQueryParams: {} };
    testProps.fetchServiceOperations.mockClear();

    render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );

    expect(testProps.fetchServiceOperations).not.toHaveBeenCalled();
    store.get = oldFn;
  });

  it('calls sortedTracesXformer with correct arguments', () => {
    const sortBy = MOST_RECENT;
    const testProps = { ...props, sortedTracesXformer: jest.fn() };
    render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );
    expect(testProps.sortedTracesXformer).toHaveBeenCalledWith(traces, sortBy);
  });

  it('handles sort change correctly', () => {
    const sortBy = MOST_SPANS;
    const instance = new SearchTracePage(props);

    instance.setState = jest.fn();

    instance.handleSortChange(sortBy);

    expect(instance.setState).toHaveBeenCalledWith({ sortBy });
  });

  it('shows a loading indicator if loading services', () => {
    const testProps = { ...props, loadingServices: true };
    const { container } = render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );
    expect(container.querySelector('.LoadingIndicator')).toBeInTheDocument();
  });

  it('shows a search form when services are loaded', () => {
    const services = [{ name: 'svc-a', operations: ['op-a'] }];
    const testProps = { ...props, services };
    const { container } = render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );
    expect(container.querySelector('[data-node-key="searchForm"]')).toBeInTheDocument();
  });

  it('shows an error message if there is an error message', () => {
    const testProps = { ...props, errors: [{ message: 'big-error' }] };
    const { container, queryByTestId } = render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );
    expect(container.querySelector('.js-test-error-message')).toBeInTheDocument();
    expect(queryByTestId('search-results-mock')).not.toBeInTheDocument();
  });

  it('shows the logo prior to searching', () => {
    const emptyTraces = [];
    const testProps = {
      ...props,
      isHomepage: true,
      traces: emptyTraces,
      sortedTracesXformer: jest.fn(() => emptyTraces),
    };
    const { container } = render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );
    expect(container.querySelector('.js-test-logo')).toBeInTheDocument();
  });

  it('passes skipMessage flag to SearchResults when on the homepage', () => {
    mockSearchResultsProps.length = 0;
    const testProps = { ...props, isHomepage: true };

    render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );

    expect(getLastSearchResultsProps()).toEqual(expect.objectContaining({ skipMessage: true }));
  });

  it('hides SearchForm if is embed', () => {
    const testProps = { ...props, embedded: true };
    const { container } = render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );
    expect(container.querySelector('[data-node-key="searchForm"]')).not.toBeInTheDocument();
  });

  it('hides logo if is embed', () => {
    const testProps = { ...props, embedded: true };
    const { container } = render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );
    expect(container.querySelector('.js-test-logo')).not.toBeInTheDocument();
  });

  it('shows Upload tab by default', () => {
    const testProps = { ...props, services: [{ name: 'svc-a', operations: ['op-a'] }] };
    const { container } = render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );
    expect(container.querySelector('[data-node-key="fileLoader"]')).toBeInTheDocument();
  });

  it('hides Upload tab if it is disabled via config', () => {
    const testProps = {
      ...props,
      disableFileUploadControl: true,
      services: [{ name: 'svc-a', operations: ['op-a'] }],
    };
    const { container } = render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );
    expect(container.querySelector('[data-node-key="fileLoader"]')).not.toBeInTheDocument();
  });

  it('passes embedded-specific props through to SearchResults', () => {
    mockSearchResultsProps.length = 0;
    const spanLinks = { traceA: 'svc-a' };
    const embeddedDetails = { searchHideGraph: true };
    const testProps = {
      ...props,
      embedded: embeddedDetails,
      urlQueryParams: { spanLinks },
    };

    render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );

    expect(getLastSearchResultsProps()).toEqual(
      expect.objectContaining({
        disableComparisons: embeddedDetails,
        hideGraph: true,
        showStandaloneLink: true,
        spanLinks,
      })
    );
  });
});

describe('mapStateToProps()', () => {
  it('converts state to the necessary props', () => {
    const trace = transformTraceData(traceGenerator.trace({}));
    const stateTrace = {
      search: {
        results: [trace.traceID],
        state: fetchedState.DONE,
      },
      traces: {
        [trace.traceID]: { id: trace.traceID, data: trace, state: fetchedState.DONE },
      },
      rawTraces: [trace],
    };
    const stateServices = {
      loading: false,
      services: ['svc-a'],
      operationsForService: {},
      error: null,
    };
    const state = {
      router: { location: { search: '' } },
      trace: stateTrace,
      traceDiff: {
        cohort: [trace.traceID],
      },
      services: stateServices,
      config: {
        disableFileUploadControl: false,
      },
    };

    const { maxTraceDuration, traceResultsToDownload, diffCohort, traces, ...rest } = mapStateToProps(state);
    expect(traces).toHaveLength(stateTrace.search.results.length);
    expect(traces[0].traceID).toBe(trace.traceID);
    expect(traceResultsToDownload[0].traceID).toBe(trace.traceID);
    expect(maxTraceDuration).toBe(trace.duration);
    expect(diffCohort).toHaveLength(state.traceDiff.cohort.length);
    expect(diffCohort[0].id).toBe(trace.traceID);
    expect(diffCohort[0].data.traceID).toBe(trace.traceID);

    expect(rest).toEqual({
      disableFileUploadControl: false,
      embedded: undefined,
      queryOfResults: undefined,
      isHomepage: true,
      sortedTracesXformer: expect.any(Function),
      urlQueryParams: null,
      services: [
        {
          name: stateServices.services[0],
          operations: [],
        },
      ],
      loadingTraces: false,
      loadingServices: false,
      errors: null,
    });
  });

  it('combines trace and service errors into a single array', () => {
    const state = {
      router: { location: { search: '' } },
      trace: {
        search: {
          results: [],
          state: fetchedState.DONE,
          error: { message: 'trace boom' },
          query: {},
        },
        traces: {},
        rawTraces: [],
      },
      traceDiff: { cohort: [] },
      services: {
        loading: false,
        services: [],
        operationsForService: {},
        error: { message: 'service boom' },
      },
      config: { disableFileUploadControl: false },
    };

    const result = mapStateToProps(state);
    expect(result.errors).toEqual([{ message: 'trace boom' }, { message: 'service boom' }]);
  });

  it('provides a sortedTracesXformer that clones before sorting', () => {
    const traceA = transformTraceData(traceGenerator.trace({}));
    const traceB = transformTraceData(traceGenerator.trace({}));
    const state = {
      router: { location: { search: '' } },
      trace: {
        search: {
          results: [traceA.traceID, traceB.traceID],
          state: fetchedState.DONE,
          error: null,
          query: {},
        },
        traces: {
          [traceA.traceID]: { id: traceA.traceID, data: traceA },
          [traceB.traceID]: { id: traceB.traceID, data: traceB },
        },
        rawTraces: [traceA, traceB],
      },
      traceDiff: { cohort: [] },
      services: {
        loading: false,
        services: [],
        operationsForService: {},
        error: null,
      },
      config: { disableFileUploadControl: false },
    };

    const sortSpy = jest.spyOn(searchModel, 'sortTraces');
    const { sortedTracesXformer } = mapStateToProps(state);
    const original = [traceB, traceA];
    const snapshot = [...original];

    const sorted = sortedTracesXformer(original, MOST_RECENT);

    expect(sortSpy).toHaveBeenCalledWith(expect.any(Array), MOST_RECENT);
    expect(sortSpy.mock.calls[0][0]).not.toBe(original);
    expect(original).toEqual(snapshot);
    expect(sorted).toEqual(sortSpy.mock.calls[0][0]);

    sortSpy.mockRestore();
  });
});

describe('mapDispatchToProps()', () => {
  let dispatch;

  beforeEach(() => {
    dispatch = jest.fn();
    jest.clearAllMocks();
  });

  it('binds jaeger API action creators', () => {
    const bound = mapDispatchToProps(dispatch);

    bound.fetchMultipleTraces(['id-a']);
    expect(jaegerApiActions.fetchMultipleTraces).toHaveBeenCalledWith(['id-a']);
    expect(dispatch).toHaveBeenCalledWith({ type: 'fetchMultipleTraces', params: ['id-a'] });

    bound.fetchServiceOperations('svc');
    expect(dispatch).toHaveBeenCalledWith({ type: 'fetchServiceOperations', service: 'svc' });

    bound.fetchServices();
    expect(dispatch).toHaveBeenCalledWith({ type: 'fetchServices' });

    bound.searchTraces({ service: 'svc' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'searchTraces', query: { service: 'svc' } });
  });

  it('binds file loader and trace diff actions', () => {
    const bound = mapDispatchToProps(dispatch);

    bound.loadJsonTraces('blob');
    expect(fileReaderActions.loadJsonTraces).toHaveBeenCalledWith('blob');
    expect(dispatch).toHaveBeenCalledWith({ type: 'loadJsonTraces', payload: 'blob' });

    bound.cohortAddTrace('trace-1');
    expect(traceDiffActions.cohortAddTrace).toHaveBeenCalledWith('trace-1');
    expect(dispatch).toHaveBeenCalledWith({ type: 'cohortAddTrace', trace: 'trace-1' });

    bound.cohortRemoveTrace('trace-2');
    expect(traceDiffActions.cohortRemoveTrace).toHaveBeenCalledWith('trace-2');
    expect(dispatch).toHaveBeenCalledWith({ type: 'cohortRemoveTrace', trace: 'trace-2' });
  });
});
