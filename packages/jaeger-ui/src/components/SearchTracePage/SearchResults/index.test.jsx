// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { UnconnectedSearchResults as SearchResults, SelectSort } from '.';
import { useSearchResultsStore } from '../store.search-results';
import * as track from './index.track';
import * as searchFormTrack from '../SearchForm.track';
import * as orderBy from './order-by';
import { getUrl } from '../url';
import ResultItem from './ResultItem';
import ScatterPlot from './ScatterPlot';
import DiffSelection from './DiffSelection';

const mockNavigate = jest.fn();
vi.mock('react-router-dom', async () => {
  const { MemoryRouter: ActualMemoryRouter } = await vi.importActual('react-router-dom');
  return {
    MemoryRouter: ActualMemoryRouter,
    Link: ({ to, children, className, ...rest }) => (
      <a href={typeof to === 'string' ? to : '#'} className={className} {...rest}>
        {children}
      </a>
    ),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('./AltViewOptions', () =>
  mockDefault(
    jest.fn(({ onDdgViewClicked }) => (
      <button type="button" data-testid="alt-toggle" onClick={onDdgViewClicked}>
        toggle
      </button>
    ))
  )
);

vi.mock('./DiffSelection', () =>
  mockDefault(jest.fn(({ traces }) => <div data-testid="diffselection">{traces.length}</div>))
);

vi.mock('./ResultItem', () =>
  mockDefault(jest.fn(({ traceSummary }) => <div data-testid={`result-${traceSummary.traceID}`} />))
);

vi.mock('./ScatterPlot', () => mockDefault(jest.fn(props => <div data-testid="scatterplot" {...props} />)));

vi.mock('./DownloadResults', () =>
  mockDefault(jest.fn(() => <button type="button" data-testid="download" />))
);

vi.mock('../../DeepDependencies/traces', () => mockDefault(jest.fn(() => <div data-testid="ddg" />)));

vi.mock('../../common/LoadingIndicator', () => mockDefault(jest.fn(() => <div data-testid="loading" />)));

vi.mock('./TraceTable', () => mockDefault(jest.fn(() => <div data-testid="trace-table" />)));

vi.mock('../../common/NewWindowIcon', () =>
  mockDefault(jest.fn(() => <span data-testid="new-window-icon" />))
);

vi.mock('../../common/SearchableSelect', () => {
  return mockDefault(function MockSearchableSelect({ value, onChange, children, ...rest }) {
    const options = React.Children.map(children, child => (
      <option key={child.props.value} value={child.props.value}>
        {child.props.children}
      </option>
    ));
    return (
      <select
        data-testid="searchable-select"
        value={value}
        onChange={e => onChange(e.target.value)}
        {...rest}
      >
        {options}
      </select>
    );
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const baseTraces = [
  {
    traceID: 'a',
    traceName: 'trace-a',
    rootServiceName: 'svc-a',
    rootOperationName: 'op-a',
    startTime: 0,
    duration: 1000,
    spanCount: 0,
    errorSpanCount: 0,
    orphanSpanCount: 0,
    services: [],
  },
  {
    traceID: 'b',
    traceName: 'trace-b',
    rootServiceName: 'svc-b',
    rootOperationName: 'op-b',
    startTime: 0,
    duration: 1000,
    spanCount: 0,
    errorSpanCount: 0,
    orphanSpanCount: 0,
    services: [],
  },
];

const baseRawTraces = [
  { traceID: 'a', spans: [], durationMicros: 1000, startTimeUnixMicros: 0, endTimeUnixMicros: 1000 },
  { traceID: 'b', spans: [], durationMicros: 1000, startTimeUnixMicros: 0, endTimeUnixMicros: 1000 },
];

const baseProps = {
  addTraceToCohort: jest.fn(),
  removeTraceFromCohort: jest.fn(),
  diffCohort: [],
  disableComparisons: false,
  hideGraph: false,
  loading: false,
  location: { search: '' },
  maxTraceDuration: 1,
  showStandaloneLink: false,
  skipMessage: false,
  spanLinks: undefined,
  traceSummaries: baseTraces,
  uploadedTraceIDs: new Set(),
  rawTraces: baseRawTraces,
};

// to wrap component with Router context (for use in rerender)
const withRouter = ui => <MemoryRouter>{ui}</MemoryRouter>;

// function that automatically wraps with Router context
const renderWithRouter = (ui, options = {}) => {
  return render(withRouter(ui), options);
};

describe('<SearchResults>', () => {
  it('shows the "no results" message when the search result is empty', () => {
    renderWithRouter(<SearchResults {...baseProps} traceSummaries={[]} />);
    expect(screen.getByText(/No trace results\. Try another query\./i)).toBeInTheDocument();
  });

  it('uses default skipMessage value when not provided', () => {
    const { skipMessage: _unused, ...propsWithoutSkipMessage } = baseProps;
    renderWithRouter(<SearchResults {...propsWithoutSkipMessage} traceSummaries={[]} />);
    expect(screen.getByText(/No trace results\. Try another query\./i)).toBeInTheDocument();
  });

  it('shows a loading indicator if loading traces', () => {
    renderWithRouter(<SearchResults {...baseProps} loading />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('hide scatter plot if queryparam hideGraph', () => {
    const { rerender } = renderWithRouter(<SearchResults {...baseProps} hideGraph={false} />);
    expect(screen.getByTestId('scatterplot')).toBeInTheDocument();

    rerender(<SearchResults {...baseProps} hideGraph />);
    expect(screen.queryByTestId('scatterplot')).not.toBeInTheDocument();
  });

  it('hide DiffSelection when disableComparisons = true', () => {
    const cohortTrace = {
      traceID: 'a',
      traceName: 'T',
      duration: 1,
      services: [],
      startTime: 0,
      spanCount: 1,
      errorSpanCount: 0,
    };
    const { rerender } = renderWithRouter(
      <SearchResults {...baseProps} disableComparisons={false} diffCohort={[cohortTrace]} />
    );
    expect(screen.getByTestId('diffselection')).toBeInTheDocument();

    rerender(<SearchResults {...baseProps} disableComparisons diffCohort={[cohortTrace]} />);
    expect(screen.queryByTestId('diffselection')).not.toBeInTheDocument();
  });

  it('adds or removes trace from cohort based on flag', () => {
    const add = jest.fn();
    const remove = jest.fn();
    renderWithRouter(
      <SearchResults
        {...baseProps}
        addTraceToCohort={add}
        removeTraceFromCohort={remove}
        diffCohort={[
          {
            traceID: 'existing',
            traceName: 'T',
            duration: 1,
            services: [],
            startTime: 0,
            spanCount: 1,
            errorSpanCount: 0,
          },
        ]}
      />
    );
    const diffSelectionProps = DiffSelection.mock.calls[0][0];
    const toggleComparison = diffSelectionProps.toggleComparison;
    toggleComparison('a');
    toggleComparison('b', true);
    expect(add).toHaveBeenCalledWith(baseTraces[0]);
    expect(remove).toHaveBeenCalledWith('b');
  });

  it('does not call addTraceToCohort when the traceID has no matching summary', () => {
    const add = jest.fn();
    renderWithRouter(<SearchResults {...baseProps} addTraceToCohort={add} />);
    const diffSelectionProps = DiffSelection.mock.calls[0][0];
    diffSelectionProps.toggleComparison('not-a-real-id');
    expect(add).not.toHaveBeenCalled();
  });

  it('sets trace color to red if errorSpanCount > 0', () => {
    const errorTrace = [
      {
        traceID: 'err',
        traceName: 'T',
        rootServiceName: 'svc-A',
        rootOperationName: 'op-A',
        startTime: 0,
        duration: 1,
        spanCount: 1,
        errorSpanCount: 1,
        orphanSpanCount: 0,
        services: [{ name: 'svc-A', spanCount: 1, errorSpanCount: 1 }],
      },
    ];
    renderWithRouter(<SearchResults {...baseProps} traceSummaries={errorTrace} />);
    const scatterProps = ScatterPlot.mock.calls[0][0];
    expect(scatterProps.data[0].color).toBe('red');
  });

  it('renders DiffSelection when diffCohort is provided', () => {
    renderWithRouter(
      <SearchResults
        {...baseProps}
        diffCohort={[
          {
            traceID: 'id-1',
            traceName: 'T',
            duration: 1,
            services: [],
            startTime: 0,
            spanCount: 1,
            errorSpanCount: 0,
          },
        ]}
      />
    );
    expect(screen.getByTestId('diffselection')).toBeInTheDocument();
  });

  it('calls navigate when a ScatterPlot point is clicked', () => {
    renderWithRouter(<SearchResults {...baseProps} />);
    const scatterProps = ScatterPlot.mock.calls[0][0];
    scatterProps.onValueClick({ traceID: 'a' });
    expect(mockNavigate).toHaveBeenCalled();
    const navigateCall = mockNavigate.mock.calls[0];
    expect(navigateCall[0]).toContain('/trace/a');
  });

  it('uses location.pathname+search as Back URL (upload-only context, no search params)', () => {
    // When traces come from a file upload (no API search), location.search is empty and
    // the Back link on the trace page must use the current URL so the user returns to
    // the upload results, not an empty or incorrect search page.
    renderWithRouter(<SearchResults {...baseProps} location={{ pathname: '/search', search: '' }} />);
    const scatterProps = ScatterPlot.mock.calls[0][0];
    scatterProps.onValueClick({ traceID: 'a' });
    expect(mockNavigate).toHaveBeenCalled();
    // fromSearch state should be based on current location, not getUrl()
    const navigateState = mockNavigate.mock.calls[0][1]?.state;
    expect(navigateState?.fromSearch).toBe('/search');
  });

  it('handles trace with zero spans', () => {
    renderWithRouter(
      <SearchResults
        {...baseProps}
        traceSummaries={[
          {
            traceID: 'no-spans',
            traceName: 'Empty Trace',
            rootServiceName: '',
            rootOperationName: '',
            startTime: 0,
            duration: 1,
            spanCount: 0,
            errorSpanCount: 0,
            orphanSpanCount: 0,
            services: [],
          },
        ]}
      />
    );
    const data = ScatterPlot.mock.calls[0][0].data[0];
    expect(data.serviceCount).toBe(0);
  });

  it('handles trace with empty services list', () => {
    renderWithRouter(
      <SearchResults
        {...baseProps}
        traceSummaries={[
          {
            traceID: 'no-services',
            traceName: 'No Services',
            rootServiceName: 'test-service',
            rootOperationName: 'test-operation',
            startTime: 0,
            duration: 1,
            spanCount: 1,
            errorSpanCount: 0,
            orphanSpanCount: 0,
            services: [],
          },
        ]}
      />
    );
    const data = ScatterPlot.mock.calls[0][0].data[0];
    expect(data.serviceCount).toBe(0);
  });

  describe('search finished with results', () => {
    beforeEach(() => {
      useSearchResultsStore.setState({ viewMode: 'list' });
    });

    it('shows a scatter plot', () => {
      renderWithRouter(<SearchResults {...baseProps} />);
      expect(screen.getByTestId('scatterplot')).toBeInTheDocument();
    });

    it('shows a result entry for each trace', () => {
      renderWithRouter(<SearchResults {...baseProps} />);
      expect(ResultItem.mock.calls).toHaveLength(baseTraces.length);
    });

    it('passes isUploaded=true only for IDs in uploadedTraceIDs', () => {
      renderWithRouter(<SearchResults {...baseProps} uploadedTraceIDs={new Set(['a'])} />);
      const [first, second] = ResultItem.mock.calls;
      expect(first[0].isUploaded).toBe(true);
      expect(second[0].isUploaded).toBe(false);
    });

    it('deep links traces', () => {
      const spanLinks = { [baseTraces[0].traceID]: 'foobar' };
      renderWithRouter(<SearchResults {...baseProps} spanLinks={spanLinks} />);
      const [first, second] = ResultItem.mock.calls;
      expect(first[0].linkTo.search).toBe('uiFind=foobar');
      expect(second[0].linkTo.search).toBeUndefined();
    });

    it('deep links traces using exact ID match (opaque strings)', () => {
      const uiFind0 = 'ui-find-0';
      const uiFind1 = 'ui-find-1';
      const traceID0 = '00traceID0';
      const traceID1 = '000traceID1';
      const spanLinks = {
        [traceID0]: uiFind0,
        [traceID1]: uiFind1,
      };
      const traces = [
        {
          traceID: traceID0,
          traceName: traceID0,
          rootServiceName: '',
          rootOperationName: '',
          startTime: 0,
          duration: 1000,
          spanCount: 0,
          errorSpanCount: 0,
          orphanSpanCount: 0,
          services: [],
        },
        {
          traceID: traceID1,
          traceName: traceID1,
          rootServiceName: '',
          rootOperationName: '',
          startTime: 0,
          duration: 1000,
          spanCount: 0,
          errorSpanCount: 0,
          orphanSpanCount: 0,
          services: [],
        },
      ];
      renderWithRouter(<SearchResults {...baseProps} traceSummaries={traces} spanLinks={spanLinks} />);
      const calls = ResultItem.mock.calls;
      expect(calls[0][0].linkTo.search).toBe(`uiFind=${uiFind0}`);
      expect(calls[1][0].linkTo.search).toBe(`uiFind=${uiFind1}`);
    });

    describe('ddg', () => {
      const searchParam = 'view';
      const otherParam = 'param';
      const otherValue = 'value';
      const otherSearch = `?${otherParam}=${otherValue}`;
      let spy;

      beforeAll(() => {
        spy = jest.spyOn(track, 'trackAltView');
      });

      it('updates url to view ddg and back and back again - and tracks changes', () => {
        const { rerender } = renderWithRouter(
          <SearchResults {...baseProps} location={{ search: otherSearch }} />
        );

        fireEvent.click(screen.getByTestId('alt-toggle'));
        expect(mockNavigate).toHaveBeenLastCalledWith(
          getUrl({ [otherParam]: otherValue, service: 'svc-a', [searchParam]: 'ddg' })
        );
        expect(spy).toHaveBeenLastCalledWith('ddg');

        rerender(
          withRouter(
            <SearchResults {...baseProps} location={{ search: `${otherSearch}&${searchParam}=ddg` }} />
          )
        );
        fireEvent.click(screen.getByTestId('alt-toggle'));
        expect(mockNavigate).toHaveBeenLastCalledWith(
          getUrl({ [otherParam]: otherValue, service: 'svc-a', [searchParam]: 'traces' })
        );
        expect(spy).toHaveBeenLastCalledWith('traces');

        mockNavigate.mockClear();
        rerender(
          withRouter(
            <SearchResults {...baseProps} location={{ search: `${otherSearch}&${searchParam}=traces` }} />
          )
        );
        fireEvent.click(screen.getByTestId('alt-toggle'));
        expect(mockNavigate).toHaveBeenLastCalledWith(
          getUrl({ [otherParam]: otherValue, service: 'svc-a', [searchParam]: 'ddg' })
        );
        expect(spy).toHaveBeenLastCalledWith('ddg');
      });

      it('shows ddg instead of scatterplot and results', () => {
        const { rerender } = renderWithRouter(<SearchResults {...baseProps} />);
        expect(screen.queryByTestId('ddg')).not.toBeInTheDocument();
        expect(ResultItem.mock.calls).toHaveLength(baseTraces.length);
        expect(screen.queryByTestId('scatterplot')).toBeInTheDocument();

        ResultItem.mockClear();
        rerender(withRouter(<SearchResults {...baseProps} location={{ search: '?view=ddg' }} />));
        expect(screen.getByTestId('ddg')).toBeInTheDocument();
        expect(ResultItem).not.toHaveBeenCalled();
        expect(screen.queryByTestId('scatterplot')).not.toBeInTheDocument();
      });
    });

    describe('DownloadResults', () => {
      it('shows DownloadResults when view is not ddg', () => {
        renderWithRouter(<SearchResults {...baseProps} location={{ search: '?view=traces' }} />);
        expect(screen.getByTestId('download')).toBeInTheDocument();
      });

      it('shows DownloadResults even when rawTraces is empty (API-only results)', () => {
        renderWithRouter(
          <SearchResults {...baseProps} rawTraces={[]} location={{ search: '?view=traces' }} />
        );
        expect(screen.getByTestId('download')).toBeInTheDocument();
      });

      it('does not show DownloadResults when view is ddg', () => {
        const { rerender } = renderWithRouter(
          <SearchResults {...baseProps} location={{ search: '?view=traces' }} />
        );
        expect(screen.getByTestId('download')).toBeInTheDocument();

        rerender(withRouter(<SearchResults {...baseProps} location={{ search: '?view=ddg' }} />));
        expect(screen.queryByTestId('download')).not.toBeInTheDocument();
      });
    });
  });

  describe('<SelectSort>', () => {
    it('calls handleSortChange when selection changes', () => {
      const handleSortChange = jest.fn();
      render(<SelectSort sortBy={orderBy.MOST_RECENT} handleSortChange={handleSortChange} />);
      fireEvent.change(screen.getByTestId('searchable-select'), {
        target: { value: orderBy.LONGEST_FIRST },
      });
      expect(handleSortChange).toHaveBeenCalledWith(orderBy.LONGEST_FIRST);
    });

    it('updates selected value when sortBy prop changes', () => {
      const { rerender } = render(<SelectSort sortBy={orderBy.MOST_RECENT} handleSortChange={() => {}} />);
      rerender(<SelectSort sortBy={orderBy.SHORTEST_FIRST} handleSortChange={() => {}} />);
      expect(screen.getByTestId('searchable-select')).toHaveValue(orderBy.SHORTEST_FIRST);
    });
  });

  describe('sort integration', () => {
    const distinctTraces = [
      { ...baseTraces[0], traceID: 'short', duration: 100 },
      { ...baseTraces[1], traceID: 'long', duration: 5000 },
    ];

    beforeEach(() => {
      useSearchResultsStore.setState({ viewMode: 'list', sortBy: orderBy.MOST_RECENT });
    });

    it('reads sortBy from the store and sorts unsorted traceSummaries internally', () => {
      renderWithRouter(<SearchResults {...baseProps} traceSummaries={distinctTraces} />);
      const items = screen.getAllByTestId(/^result-/);
      expect(items[0]).toHaveAttribute('data-testid', 'result-short');
      expect(items[1]).toHaveAttribute('data-testid', 'result-long');
    });

    it('re-sorts the rendered results when the sort dropdown changes', () => {
      renderWithRouter(<SearchResults {...baseProps} traceSummaries={distinctTraces} />);

      fireEvent.change(screen.getByTestId('searchable-select'), {
        target: { value: orderBy.LONGEST_FIRST },
      });

      const items = screen.getAllByTestId(/^result-/);
      expect(items[0]).toHaveAttribute('data-testid', 'result-long');
      expect(items[1]).toHaveAttribute('data-testid', 'result-short');
      expect(useSearchResultsStore.getState().sortBy).toBe(orderBy.LONGEST_FIRST);
    });

    it('tracks the sanitized sortBy, not a raw unrecognized value, when an invalid key reaches the handler', () => {
      const trackSortByChange = vi.spyOn(searchFormTrack, 'trackSortByChange').mockImplementation(() => {});
      renderWithRouter(<SearchResults {...baseProps} traceSummaries={distinctTraces} />);

      fireEvent.change(screen.getByTestId('searchable-select'), {
        target: { value: 'NOT_A_REAL_SORT_KEY' },
      });

      expect(trackSortByChange).toHaveBeenCalledWith(orderBy.MOST_RECENT);
      trackSortByChange.mockRestore();
    });
  });

  describe('showStandaloneLink', () => {
    it('renders Link when showStandaloneLink is true', () => {
      renderWithRouter(<SearchResults {...baseProps} showStandaloneLink />);
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(screen.getByTestId('new-window-icon')).toBeInTheDocument();
    });

    it('does not render Link when showStandaloneLink is false', () => {
      renderWithRouter(<SearchResults {...baseProps} showStandaloneLink={false} />);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.queryByTestId('new-window-icon')).not.toBeInTheDocument();
    });
  });

  describe('view mode toggle', () => {
    beforeEach(() => {
      localStorage.clear();
      useSearchResultsStore.setState(useSearchResultsStore.getInitialState());
    });

    it('defaults to table view', () => {
      renderWithRouter(<SearchResults {...baseProps} />);
      expect(screen.getByTestId('trace-table')).toBeInTheDocument();
      expect(screen.queryByTestId('result-a')).not.toBeInTheDocument();
    });

    it('switches to list view when List button is clicked', () => {
      renderWithRouter(<SearchResults {...baseProps} />);
      fireEvent.click(screen.getByText('List'));
      expect(screen.getByTestId('result-a')).toBeInTheDocument();
      expect(screen.queryByTestId('trace-table')).not.toBeInTheDocument();
    });

    it('switches back to table view when Table button is clicked', () => {
      renderWithRouter(<SearchResults {...baseProps} />);
      fireEvent.click(screen.getByText('List'));
      fireEvent.click(screen.getByText('Table'));
      expect(screen.getByTestId('trace-table')).toBeInTheDocument();
      expect(screen.queryByTestId('result-a')).not.toBeInTheDocument();
    });
  });
});
