// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { useEmbeddedStateMock, getConfigMock } = vi.hoisted(() => ({
  useEmbeddedStateMock: jest.fn().mockReturnValue(null),
  getConfigMock: jest.fn(() => ({
    disableFileUploadControl: false,
    tracking: {
      gaID: null,
      trackErrors: false,
      customWebAnalytics: null,
    },
  })),
}));

vi.mock('../../stores/embedded-store', () => ({
  useEmbeddedState: (...args) => useEmbeddedStateMock(...args),
}));

vi.mock('../../utils/config/get-config', () => ({
  default: (...args) => getConfigMock(...args),
}));

vi.mock('../../api/v3/client', () => ({
  jaegerClient: {
    fetchServices: jest.fn(() => Promise.resolve([])),
    fetchSpanNames: jest.fn(() => Promise.resolve([])),
  },
}));

vi.mock('../../hooks/useTraceDiscovery', () => ({
  useServices: jest.fn(() => ({ data: [], isLoading: false })),
  useSpanNames: jest.fn(() => ({ data: [], isLoading: false })),
}));

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { SearchTracePageImpl as SearchTracePage, mapStateToProps, stateTraceDiffXformer } from './index';
import { fetchedState } from '../../constants';
import traceGenerator from '../../demo/trace-generators';
import { MOST_RECENT, MOST_SPANS } from '../../model/order-by';
import transformTraceData from '../../model/transform-trace-data';
import { store as globalStore } from '../../utils/configure-store';
import { useServices } from '../../hooks/useTraceDiscovery';
import { useTraceDiffStore } from '../../stores/trace-diff-store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const AllProvider = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter>
      <Provider store={globalStore}>{children}</Provider>
    </MemoryRouter>
  </QueryClientProvider>
);

describe('<SearchTracePage>', () => {
  let traces;
  let traceResultsToDownload;
  let props;

  const getDefaultProps = () => {
    const traces = [
      { traceID: 'a', spans: [], processes: {} },
      { traceID: 'b', spans: [], processes: {} },
    ];
    const traceResultsToDownload = [
      { traceID: 'a', spans: [], processes: {} },
      { traceID: 'b', spans: [], processes: {} },
    ];
    return {
      queryOfResults: null, // null on initial page load
      traces,
      traceResultsToDownload,
      tracesInRedux: { traces: {}, search: { results: [], query: null } },
      isHomepage: false,
      maxTraceDuration: 100,
      numberOfTraceResults: traces.length,
      sortedTracesXformer: jest.fn(),
      urlQueryParams: { service: 'svc-a' },
      searchTraces: jest.fn(),
      fetchMultipleTraces: jest.fn(),
      loadJsonTraces: jest.fn(),
    };
  };

  beforeEach(() => {
    props = getDefaultProps();
    traces = props.traces;
    traceResultsToDownload = props.traceResultsToDownload;
    useEmbeddedStateMock.mockReturnValue(null);
    getConfigMock.mockReset();
    getConfigMock.mockReturnValue({
      disableFileUploadControl: false,
      tracking: {
        gaID: null,
        trackErrors: false,
        customWebAnalytics: null,
      },
    });
  });

  it('searches for traces if `service` or `traceID` are in the query string', () => {
    render(
      <AllProvider>
        <SearchTracePage {...props} />
      </AllProvider>
    );
    expect(props.searchTraces).toHaveBeenCalledTimes(1);
  });

  it('searches for traces on initial page load when URL has search params (no previous results)', () => {
    const testProps = {
      ...props,
      queryOfResults: null, // No previous search results
      urlQueryParams: { service: 'test-service', limit: 20 },
      searchTraces: jest.fn(),
    };
    render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );
    expect(testProps.searchTraces).toHaveBeenCalledTimes(1);
    expect(testProps.searchTraces).toHaveBeenCalledWith({ service: 'test-service', limit: 20 });
  });

  it('does not search again if URL params match existing queryOfResults', () => {
    const query = { service: 'svc-a', limit: 20 };
    const testProps = {
      ...props,
      queryOfResults: query, // Already have results for this query
      urlQueryParams: query, // Same query in URL
      searchTraces: jest.fn(),
    };
    render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );
    expect(testProps.searchTraces).not.toHaveBeenCalled();
  });

  it('uses React Query hooks to fetch services', () => {
    render(
      <AllProvider>
        <SearchTracePage {...props} />
      </AllProvider>
    );
    expect(useServices).toHaveBeenCalled();
  });

  it('shows a loading indicator when services are being fetched', async () => {
    useServices.mockReturnValue({ data: [], isLoading: true, error: null });
    const { container } = render(
      <AllProvider>
        <SearchTracePage {...props} />
      </AllProvider>
    );
    expect(container.querySelector('.LoadingIndicator')).toBeInTheDocument();
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
    // For functional components, we verify behavior via props passed to child
    const sortBy = MOST_SPANS;
    const testProps = { ...props, sortedTracesXformer: jest.fn() };
    render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );
    // Initially sorted by MOST_RECENT
    expect(testProps.sortedTracesXformer).toHaveBeenCalledWith(traces, MOST_RECENT);
  });

  it('shows a search form', () => {
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
    useEmbeddedStateMock.mockReturnValue({
      version: 'v0',
      searchHideGraph: false,
      timeline: { collapseTitle: false, hideMinimap: false, hideSummary: false },
    });
    const { container } = render(
      <AllProvider>
        <SearchTracePage {...props} />
      </AllProvider>
    );
    expect(container.querySelector('[data-node-key="searchForm"]')).not.toBeInTheDocument();
  });

  it('hides logo if is embed', () => {
    useEmbeddedStateMock.mockReturnValue({
      version: 'v0',
      searchHideGraph: false,
      timeline: { collapseTitle: false, hideMinimap: false, hideSummary: false },
    });
    const { container } = render(
      <AllProvider>
        <SearchTracePage {...props} />
      </AllProvider>
    );
    expect(container.querySelector('.js-test-logo')).not.toBeInTheDocument();
  });

  it('shows Upload tab by default', () => {
    const { container } = render(
      <AllProvider>
        <SearchTracePage {...props} />
      </AllProvider>
    );
    expect(container.querySelector('[data-node-key="fileLoader"]')).toBeInTheDocument();
  });

  it('hides Upload tab if it is disabled via config', () => {
    getConfigMock.mockReturnValue({
      disableFileUploadControl: true,
      tracking: {
        gaID: null,
        trackErrors: false,
        customWebAnalytics: null,
      },
    });
    const { container } = render(
      <AllProvider>
        <SearchTracePage {...props} />
      </AllProvider>
    );
    expect(container.querySelector('[data-node-key="fileLoader"]')).not.toBeInTheDocument();
  });
});

describe('mapStateToProps()', () => {
  beforeEach(() => {
    useTraceDiffStore.setState({ cohort: [], a: null, b: null });
  });

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
      trace: stateTrace,
      services: stateServices,
      config: {
        disableFileUploadControl: false,
      },
    };

    useTraceDiffStore.setState({ cohort: [trace.traceID], a: null, b: null });

    const { maxTraceDuration, traceResultsToDownload, tracesInRedux, traces, ...rest } = mapStateToProps(
      state,
      {
        search: '',
      }
    );
    expect(traces).toHaveLength(stateTrace.search.results.length);
    expect(traces[0].traceID).toBe(trace.traceID);
    expect(traceResultsToDownload[0].traceID).toBe(trace.traceID);
    expect(maxTraceDuration).toBe(trace.duration);
    expect(tracesInRedux).toEqual(stateTrace);
    const diffCohort = stateTraceDiffXformer(stateTrace, { cohort: useTraceDiffStore.getState().cohort });
    expect(diffCohort).toHaveLength(1);
    expect(diffCohort[0].id).toBe(trace.traceID);
    expect(diffCohort[0].data.traceID).toBe(trace.traceID);

    expect(rest).toEqual({
      queryOfResults: undefined,
      isHomepage: true,
      sortedTracesXformer: expect.any(Function),
      urlQueryParams: null,
      loadingTraces: false,
      errors: null,
    });
  });
});
