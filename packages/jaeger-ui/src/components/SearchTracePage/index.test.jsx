// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { useEmbeddedStateMock, getConfigMock, useSearchTracesMock } = vi.hoisted(() => ({
  useEmbeddedStateMock: jest.fn().mockReturnValue(null),
  getConfigMock: jest.fn(() => ({
    disableFileUploadControl: false,
    tracking: {
      gaID: null,
      trackErrors: false,
      customWebAnalytics: null,
    },
  })),
  useSearchTracesMock: jest.fn(() => ({ data: [], isLoading: false, error: null })),
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
  useSearchTraces: (...args) => useSearchTracesMock(...args),
}));

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { SearchTracePageImpl as SearchTracePage, mapStateToProps } from './index';
import { fetchedState } from '../../constants';
import traceGenerator from '../../demo/trace-generators';
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
  let props;

  const getDefaultProps = () => ({
    traceResultsToDownload: [],
    isHomepage: false,
    loadJsonTraces: jest.fn(),
    urlQueryParams: { service: 'svc-a' },
  });

  beforeEach(() => {
    props = getDefaultProps();
    useEmbeddedStateMock.mockReturnValue(null);
    useSearchTracesMock.mockClear();
    useSearchTracesMock.mockReturnValue({ data: [], isLoading: false, error: null });
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

  it('uses React Query to fetch services', () => {
    render(
      <AllProvider>
        <SearchTracePage {...props} />
      </AllProvider>
    );
    expect(useServices).toHaveBeenCalled();
  });

  it('calls useSearchTraces with query derived from URL params', () => {
    render(
      <AllProvider>
        <SearchTracePage {...props} />
      </AllProvider>
    );
    expect(useSearchTracesMock).toHaveBeenCalled();
    const [query] = useSearchTracesMock.mock.calls[0];
    expect(query).not.toBeNull();
    expect(query.service).toBe('svc-a');
  });

  it('passes null query to useSearchTraces when no service is in URL params', () => {
    const testProps = { ...props, urlQueryParams: null };
    render(
      <AllProvider>
        <SearchTracePage {...testProps} />
      </AllProvider>
    );
    const [query] = useSearchTracesMock.mock.calls[0];
    expect(query).toBeNull();
  });

  it('shows a loading indicator when traces are loading', () => {
    useSearchTracesMock.mockReturnValue({ data: [], isLoading: true, error: null });
    const { container } = render(
      <AllProvider>
        <SearchTracePage {...props} />
      </AllProvider>
    );
    expect(container.querySelector('.LoadingIndicator')).toBeInTheDocument();
  });

  it('shows a search form', () => {
    const { container } = render(
      <AllProvider>
        <SearchTracePage {...props} />
      </AllProvider>
    );
    expect(container.querySelector('[data-node-key="searchForm"]')).toBeInTheDocument();
  });

  it('shows an error message if the search query returns an error', () => {
    useSearchTracesMock.mockReturnValue({ data: [], isLoading: false, error: new Error('big-error') });
    const { container } = render(
      <AllProvider>
        <SearchTracePage {...props} />
      </AllProvider>
    );
    expect(container.querySelector('.js-test-error-message')).toBeInTheDocument();
  });

  it('shows the logo prior to searching', () => {
    const testProps = { ...props, isHomepage: true, urlQueryParams: null };
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
    const rawTracePayload = { traceID: trace.traceID, spans: trace.spans, processes: trace.processes };
    const stateTrace = {
      search: {
        results: [trace.traceID],
        state: fetchedState.DONE,
      },
      rawTraces: [rawTracePayload],
    };
    const state = {
      trace: stateTrace,
      config: { disableFileUploadControl: false },
    };

    const { traceResultsToDownload, isHomepage, urlQueryParams } = mapStateToProps(state, {
      search: '',
    });
    expect(isHomepage).toBe(true);
    expect(urlQueryParams).toBeNull();
    expect(traceResultsToDownload[0].traceID).toBe(rawTracePayload.traceID);
  });

  it('sets isHomepage to false when URL has search params', () => {
    const state = {
      trace: { search: { results: [], state: fetchedState.DONE }, rawTraces: [] },
      config: {},
    };
    const { isHomepage, urlQueryParams } = mapStateToProps(state, { search: '?service=svc-a' });
    expect(isHomepage).toBe(false);
    expect(urlQueryParams).not.toBeNull();
    expect(urlQueryParams.service).toBe('svc-a');
  });
});
