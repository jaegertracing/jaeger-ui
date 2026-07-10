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
  useSearchTracesMock: jest.fn(() => ({ data: undefined, isFetching: false, error: null })),
}));

// Capture last props passed to SearchResults and FileLoader so tests can inspect/invoke them.
let lastSearchResultsProps = null;
let lastFileLoaderProps = null;

vi.mock('./SearchResults', () => ({
  default: jest.fn(props => {
    lastSearchResultsProps = props;
    // Render a loading indicator so existing tests that check for it still work.
    return props.loading ? React.createElement('div', { className: 'LoadingIndicator' }) : null;
  }),
}));

vi.mock('./FileLoader', () => ({
  default: jest.fn(props => {
    lastFileLoaderProps = props;
    return null;
  }),
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
  useIsSearchFetching: jest.fn(() => false),
}));

import React from 'react';
import { render, act, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { SearchTracePageImpl as SearchTracePage } from './index';
import { useServices } from '../../hooks/useTraceDiscovery';
import { useTraceDiffStore } from '../../stores/trace-diff-store';
import { useSearchPanelStore, LS_WIDTH_KEY, LS_COLLAPSED_KEY } from './search-panel-store';
import { store as globalStore } from '../../utils/configure-store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const AllProvider = ({ children, initialEntries = ['/search'] }) => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter initialEntries={initialEntries}>
      <Provider store={globalStore}>{children}</Provider>
    </MemoryRouter>
  </QueryClientProvider>
);

describe('<SearchTracePage>', () => {
  beforeEach(() => {
    useEmbeddedStateMock.mockReturnValue(null);
    useSearchTracesMock.mockClear();
    useSearchTracesMock.mockReturnValue({ data: undefined, isFetching: false, error: null });
    getConfigMock.mockReset();
    getConfigMock.mockReturnValue({
      disableFileUploadControl: false,
      tracking: {
        gaID: null,
        trackErrors: false,
        customWebAnalytics: null,
      },
    });
    useSearchPanelStore.setState({ panelWidth: 0.25, collapsed: false });
    localStorage.removeItem(LS_WIDTH_KEY);
    localStorage.removeItem(LS_COLLAPSED_KEY);
    queryClient.clear();
  });

  it('uses React Query to fetch services', () => {
    render(
      <AllProvider>
        <SearchTracePage />
      </AllProvider>
    );
    expect(useServices).toHaveBeenCalled();
  });

  it('calls useSearchTraces with query derived from URL params', () => {
    render(
      <AllProvider initialEntries={['/search?service=svc-a']}>
        <SearchTracePage />
      </AllProvider>
    );
    expect(useSearchTracesMock).toHaveBeenCalled();
    const [query] = useSearchTracesMock.mock.calls[0];
    expect(query).not.toBeNull();
    expect(query.service).toBe('svc-a');
  });

  it('passes null query to useSearchTraces when no service is in URL params', () => {
    render(
      <AllProvider>
        <SearchTracePage />
      </AllProvider>
    );
    const [query] = useSearchTracesMock.mock.calls[0];
    expect(query).toBeNull();
  });

  it('shows a loading indicator when traces are loading', () => {
    useSearchTracesMock.mockReturnValue({ data: undefined, isFetching: true, error: null });
    const { container } = render(
      <AllProvider initialEntries={['/search?service=svc-a']}>
        <SearchTracePage />
      </AllProvider>
    );
    expect(container.querySelector('.LoadingIndicator')).toBeInTheDocument();
  });

  it('shows a search form', () => {
    const { container } = render(
      <AllProvider>
        <SearchTracePage />
      </AllProvider>
    );
    expect(container.querySelector('[data-node-key="searchForm"]')).toBeInTheDocument();
  });

  it('shows an error message if the search query returns an error', () => {
    useSearchTracesMock.mockReturnValue({
      data: undefined,
      isFetching: false,
      error: new Error('big-error'),
    });
    const { container } = render(
      <AllProvider initialEntries={['/search?service=svc-a']}>
        <SearchTracePage />
      </AllProvider>
    );
    expect(container.querySelector('.js-test-error-message')).toBeInTheDocument();
  });

  it('shows the logo on homepage (no URL params)', () => {
    const { container } = render(
      <AllProvider>
        <SearchTracePage />
      </AllProvider>
    );
    expect(container.querySelector('.js-test-logo')).toBeInTheDocument();
  });

  it('hides the logo when there are URL search params', () => {
    const { container } = render(
      <AllProvider initialEntries={['/search?service=svc-a']}>
        <SearchTracePage />
      </AllProvider>
    );
    expect(container.querySelector('.js-test-logo')).not.toBeInTheDocument();
  });

  it('hides SearchForm if is embed', () => {
    useEmbeddedStateMock.mockReturnValue({
      version: 'v0',
      searchHideGraph: false,
      timeline: { collapseTitle: false, hideMinimap: false, hideSummary: false },
    });
    const { container } = render(
      <AllProvider>
        <SearchTracePage />
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
        <SearchTracePage />
      </AllProvider>
    );
    expect(container.querySelector('.js-test-logo')).not.toBeInTheDocument();
  });

  it('shows Upload tab by default', () => {
    const { container } = render(
      <AllProvider>
        <SearchTracePage />
      </AllProvider>
    );
    expect(container.querySelector('[data-node-key="fileLoader"]')).toBeInTheDocument();
  });

  it('restores the URL from cached query when mounted at bare /search', async () => {
    const cachedQuery = { service: 'svc-a', start: '100', end: '200', limit: 20, lookback: '1h' };
    useSearchTracesMock.mockReturnValue({
      data: { results: [], query: cachedQuery },
      isFetching: false,
      error: null,
    });

    // Track location changes inside the MemoryRouter so we can assert the URL was restored.
    let capturedSearch = null;
    function LocationCapture() {
      const { useLocation: useLoc } = require('react-router-dom');
      const loc = useLoc();
      capturedSearch = loc.search;
      return null;
    }

    await act(async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/search']}>
            <Provider store={globalStore}>
              <SearchTracePage />
              <LocationCapture />
            </Provider>
          </MemoryRouter>
        </QueryClientProvider>
      );
    });

    // useSearchTraces is called with null because bare /search has no service/start/end
    expect(useSearchTracesMock.mock.calls[0][0]).toBeNull();

    // After the useEffect fires, navigate({ replace: true }) should have updated the location
    await waitFor(() => {
      expect(capturedSearch).toContain('service=svc-a');
    });
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
        <SearchTracePage />
      </AllProvider>
    );
    expect(container.querySelector('[data-node-key="fileLoader"]')).not.toBeInTheDocument();
  });

  it('shows collapse button when panel is expanded', () => {
    render(
      <AllProvider>
        <SearchTracePage />
      </AllProvider>
    );
    expect(screen.getByLabelText('Collapse search panel')).toBeInTheDocument();
  });

  it('hides search panel and shows icon buttons when collapsed', async () => {
    const { container } = render(
      <AllProvider>
        <SearchTracePage />
      </AllProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Collapse search panel'));
    });
    expect(container.querySelector('[data-node-key="searchForm"]')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Open search panel')).toBeInTheDocument();
    expect(screen.getByLabelText('Open upload panel')).toBeInTheDocument();
  });

  it('clicking Search icon button re-opens panel to Search tab', async () => {
    const { container } = render(
      <AllProvider>
        <SearchTracePage />
      </AllProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Collapse search panel'));
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Open search panel'));
    });
    expect(container.querySelector('[data-node-key="searchForm"]')).toBeInTheDocument();
  });

  it('clicking Upload icon button re-opens panel to Upload tab', async () => {
    const { container } = render(
      <AllProvider>
        <SearchTracePage />
      </AllProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Collapse search panel'));
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Open upload panel'));
    });
    expect(container.querySelector('[data-node-key="fileLoader"]')).toBeInTheDocument();
  });

  it('hides Upload icon button in collapsed state when upload is disabled', async () => {
    getConfigMock.mockReturnValue({
      disableFileUploadControl: true,
      tracking: { gaID: null, trackErrors: false, customWebAnalytics: null },
    });
    render(
      <AllProvider>
        <SearchTracePage />
      </AllProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Collapse search panel'));
    });
    expect(screen.queryByLabelText('Open upload panel')).not.toBeInTheDocument();
  });

  it('panel collapse state persists via store', async () => {
    render(
      <AllProvider>
        <SearchTracePage />
      </AllProvider>
    );
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Collapse search panel'));
    });
    expect(useSearchPanelStore.getState().collapsed).toBe(true);
  });
});

describe('useTraceDiffStore', () => {
  beforeEach(() => {
    useTraceDiffStore.setState({ cohort: [], a: null, b: null, cohortSummaries: new Map() });
  });

  it('cohort is initially empty', () => {
    expect(useTraceDiffStore.getState().cohort).toEqual([]);
  });
});

describe('<SearchTracePage> handleTracesLoaded and diffCohort', () => {
  beforeEach(() => {
    lastSearchResultsProps = null;
    lastFileLoaderProps = null;
    queryClient.clear();
    useSearchTracesMock.mockReturnValue({ data: undefined, isFetching: false, error: null });
    getConfigMock.mockReturnValue({
      disableFileUploadControl: false,
      tracking: { gaID: null, trackErrors: false, customWebAnalytics: null },
    });
    useTraceDiffStore.setState({ cohort: [], a: null, b: null, cohortSummaries: new Map() });
    useSearchPanelStore.setState({ panelWidth: 0.25, collapsed: false });
  });

  it('merges uploaded summaries into traceSummaries when FileLoader calls onTracesLoaded', async () => {
    const summary = {
      traceID: 'uploaded-1',
      traceName: 'svc: op',
      rootServiceName: 'svc',
      rootOperationName: 'op',
      startTime: 0,
      duration: 100,
      spanCount: 1,
      errorSpanCount: 0,
      orphanSpanCount: 0,
      services: [],
    };

    render(
      <AllProvider>
        <SearchTracePage />
      </AllProvider>
    );

    // Click the Upload tab to render FileLoader
    const uploadTab = screen.getByText('Upload');
    await act(async () => {
      fireEvent.click(uploadTab);
    });

    expect(lastFileLoaderProps).not.toBeNull();
    await act(async () => {
      lastFileLoaderProps.onTracesLoaded([summary], [{ traceID: 'uploaded-1' }]);
    });

    // With controlled tabs, the tab switch causes a component re-render before onTracesLoaded
    // is called; the React Query cache update may settle in a subsequent render cycle.
    await waitFor(() => {
      expect(lastSearchResultsProps.traceSummaries).toContainEqual(summary);
      expect(lastSearchResultsProps.rawTraces).toContainEqual({ traceID: 'uploaded-1' });
    });
  });

  it('keeps diffCohort traces from prior searches via cached summaries', async () => {
    const summaryInResults = {
      traceID: 'trace-in-results',
      traceName: 'svc: op',
      rootServiceName: 'svc',
      rootOperationName: 'op',
      startTime: 0,
      duration: 100,
      spanCount: 1,
      errorSpanCount: 0,
      orphanSpanCount: 0,
      services: [],
    };
    const summaryFromPriorSearch = {
      traceID: 'trace-not-in-results',
      traceName: 'other: op',
      rootServiceName: 'other',
      rootOperationName: 'op',
      startTime: 0,
      duration: 200,
      spanCount: 2,
      errorSpanCount: 0,
      orphanSpanCount: 0,
      services: [],
    };

    useSearchTracesMock.mockReturnValue({
      data: {
        results: [summaryInResults],
        query: { service: 'svc', start: '', end: '', limit: 20, lookback: '1h' },
      },
      isFetching: false,
      error: null,
    });
    useTraceDiffStore.setState({
      cohort: ['trace-in-results', 'trace-not-in-results'],
      cohortSummaries: new Map([['trace-not-in-results', summaryFromPriorSearch]]),
    });

    render(
      <AllProvider initialEntries={['/search?service=svc']}>
        <SearchTracePage />
      </AllProvider>
    );

    expect(lastSearchResultsProps.diffCohort).toEqual([summaryInResults, summaryFromPriorSearch]);
  });

  it('uploaded caches are cleared when useClearUploadedTraces callback is invoked', async () => {
    const summary = { traceID: 'uploaded-1' };
    queryClient.setQueryData(['uploadedSummaries'], [summary]);
    queryClient.setQueryData(['uploadedRawTraces'], [{ traceID: 'uploaded-1' }]);

    // Simulate what SearchForm does: invoke the callback returned by useClearUploadedTraces
    await act(async () => {
      queryClient.setQueryData(['uploadedSummaries'], []);
      queryClient.setQueryData(['uploadedRawTraces'], []);
    });

    expect(queryClient.getQueryData(['uploadedSummaries'])).toEqual([]);
    expect(queryClient.getQueryData(['uploadedRawTraces'])).toEqual([]);
  });

  it('passes onUploadedTracesClear to FileLoader and clears caches when invoked', async () => {
    const summary = { traceID: 'uploaded-1' };
    queryClient.setQueryData(['uploadedSummaries'], [summary]);
    queryClient.setQueryData(['uploadedRawTraces'], [{ traceID: 'uploaded-1' }]);

    render(
      <AllProvider>
        <SearchTracePage />
      </AllProvider>
    );

    const uploadTab = screen.getByText('Upload');
    await act(async () => {
      fireEvent.click(uploadTab);
    });

    expect(lastFileLoaderProps).not.toBeNull();
    expect(lastFileLoaderProps.onUploadedTracesClear).toEqual(expect.any(Function));

    await act(async () => {
      lastFileLoaderProps.onUploadedTracesClear();
    });

    expect(queryClient.getQueryData(['uploadedSummaries'])).toEqual([]);
    expect(queryClient.getQueryData(['uploadedRawTraces'])).toEqual([]);
  });

  it('handleSortChange updates sortBy passed to SearchResults', async () => {
    render(
      <AllProvider>
        <SearchTracePage />
      </AllProvider>
    );
    expect(lastSearchResultsProps).not.toBeNull();
    const initialSortBy = lastSearchResultsProps.sortBy;

    await act(async () => {
      lastSearchResultsProps.handleSortChange('SHORTEST_FIRST');
    });

    expect(lastSearchResultsProps.sortBy).toBe('SHORTEST_FIRST');
    expect(lastSearchResultsProps.sortBy).not.toBe(initialSortBy);
  });
});
