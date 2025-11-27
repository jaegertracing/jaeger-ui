// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';

jest.mock('store');

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import store from 'store';

import { Provider } from 'react-redux';
import { SearchTracePageImpl as SearchTracePage, mapStateToProps } from './index';
import { fetchedState } from '../../constants';
import traceGenerator from '../../demo/trace-generators';
import { MOST_RECENT, MOST_SPANS } from '../../model/order-by';
import transformTraceData from '../../model/transform-trace-data';
import { store as globalStore } from '../../utils/configure-store';

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
  let wrapper;
  let traces;
  let traceResultsToDownload;
  let props;

  beforeEach(() => {
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
      sortedTracesXformer: jest.fn(),
      urlQueryParams: { service: 'svc-a' },
      // actions
      fetchServiceOperations: jest.fn(),
      fetchServices: jest.fn(),
      searchTraces: jest.fn(),
    };
    wrapper = render(
      <AllProvider>
        <SearchTracePage {...props} />
      </AllProvider>
    );
  });

  it('searches for traces if `service` or `traceID` are in the query string', () => {
    expect(props.searchTraces).toHaveBeenCalledTimes(1);
  });

  it('loads the services and operations if a service is stored', () => {
    props.fetchServices.mockClear();
    props.fetchServiceOperations.mockClear();
    const oldFn = store.get;
    store.get = jest.fn(() => ({ service: 'svc-b' }));
    wrapper = render(
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
    wrapper = render(
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
    const { container } = render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );
    expect(container.querySelector('.js-test-error-message')).toBeInTheDocument();
  });

  it('shows the logo prior to searching', () => {
    const testProps = { ...props, isHomepage: true, traces: [] };
    const { container } = render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );
    expect(container.querySelector('.js-test-logo')).toBeInTheDocument();
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
});
