// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import '@testing-library/jest-dom';

import { createBlob, UnconnectedSearchResults as SearchResults, SelectSort } from '.';
import * as track from './index.track';
import * as orderBy from '../../../model/order-by';
import readJsonFile from '../../../utils/readJsonFile';
import { getUrl } from '../url';
import ResultItem from './ResultItem';
import ScatterPlot from './ScatterPlot';
import DiffSelection from './DiffSelection';
import { StatusCode } from '../../../types/otel';

const mockNavigate = jest.fn();
jest.mock('react-router-dom-v5-compat', () => {
  const actual = jest.requireActual('react-router-dom-v5-compat');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('./AltViewOptions', () =>
  jest.fn(({ onDdgViewClicked }) => (
    <button type="button" data-testid="alt-toggle" onClick={onDdgViewClicked}>
      toggle
    </button>
  ))
);

jest.mock('./DiffSelection', () =>
  jest.fn(({ traces }) => <div data-testid="diffselection">{traces.length}</div>)
);

jest.mock('./ResultItem', () => jest.fn(({ trace }) => <div data-testid={`result-${trace.traceID}`} />));

jest.mock('./ScatterPlot', () => jest.fn(props => <div data-testid="scatterplot" {...props} />));

jest.mock('./DownloadResults', () =>
  jest.fn(({ onDownloadResultsClicked }) => (
    <button type="button" data-testid="download" onClick={onDownloadResultsClicked}>
      download
    </button>
  ))
);

jest.mock('../../DeepDependencies/traces', () => jest.fn(() => <div data-testid="ddg" />));

jest.mock('../../common/LoadingIndicator', () => jest.fn(() => <div data-testid="loading" />));

jest.mock('../../common/NewWindowIcon', () => jest.fn(() => <span data-testid="new-window-icon" />));

jest.mock('../../common/SearchableSelect', () => {
  const mockReact = jest.requireActual('react');
  return function MockSearchableSelect({ value, onChange, children, ...rest }) {
    const options = mockReact.Children.map(children, child => (
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
  };
});

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

const baseTraces = [
  { traceID: 'a', spans: [], processes: {}, asOtelTrace: () => ({ spans: [] }) },
  { traceID: 'b', spans: [], processes: {}, asOtelTrace: () => ({ spans: [] }) },
];
const baseProps = {
  cohortAddTrace: jest.fn(),
  cohortRemoveTrace: jest.fn(),
  diffCohort: [],
  disableComparisons: false,
  hideGraph: false,
  loading: false,
  location: { search: '' },
  maxTraceDuration: 1,
  queryOfResults: {},
  showStandaloneLink: false,
  skipMessage: false,
  spanLinks: undefined,
  traces: baseTraces,
  rawTraces: baseTraces,
  sortBy: orderBy.MOST_RECENT,
  handleSortChange: jest.fn(),
};

// to wrap component with Router context (for use in rerender)
const withRouter = ui => (
  <MemoryRouter>
    <CompatRouter>{ui}</CompatRouter>
  </MemoryRouter>
);

// function that automatically wraps with Router context
const renderWithRouter = (ui, options = {}) => {
  return render(withRouter(ui), options);
};

describe('<SearchResults>', () => {
  it('shows the "no results" message when the search result is empty', () => {
    renderWithRouter(<SearchResults {...baseProps} traces={[]} />);
    expect(screen.getByText(/No trace results\. Try another query\./i)).toBeInTheDocument();
  });

  it('uses default skipMessage value when not provided', () => {
    const { skipMessage, ...propsWithoutSkipMessage } = baseProps;
    renderWithRouter(<SearchResults {...propsWithoutSkipMessage} traces={[]} />);
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
    const { rerender } = renderWithRouter(
      <SearchResults {...baseProps} disableComparisons={false} diffCohort={[{ id: 'a' }]} />
    );
    expect(screen.getByTestId('diffselection')).toBeInTheDocument();

    rerender(<SearchResults {...baseProps} disableComparisons diffCohort={[{ id: 'a' }]} />);
    expect(screen.queryByTestId('diffselection')).not.toBeInTheDocument();
  });

  it('adds or removes trace from cohort based on flag', () => {
    const add = jest.fn();
    const remove = jest.fn();
    renderWithRouter(
      <SearchResults
        {...baseProps}
        cohortAddTrace={add}
        cohortRemoveTrace={remove}
        diffCohort={[{ id: 'existing' }]}
      />
    );
    const diffSelectionProps = DiffSelection.mock.calls[0][0];
    const toggleComparison = diffSelectionProps.toggleComparison;
    toggleComparison('id-1');
    toggleComparison('id-2', true);
    expect(add).toHaveBeenCalledWith('id-1');
    expect(remove).toHaveBeenCalledWith('id-2');
  });

  it('sets trace color to red if error tag is present', () => {
    const errorTrace = [
      {
        traceID: 'err',
        traceName: 'T',
        startTime: 0,
        duration: 1,
        processes: {},
        spans: [
          {
            process: { serviceName: 'svc-A' },
            operationName: 'op-A',
            tags: [{ key: 'error', value: true }],
          },
        ],
        asOtelTrace: () => ({
          spans: [
            {
              status: { code: StatusCode.ERROR },
            },
          ],
        }),
      },
    ];
    renderWithRouter(<SearchResults {...baseProps} traces={errorTrace} />);
    const scatterProps = ScatterPlot.mock.calls[0][0];
    expect(scatterProps.data[0].color).toBe('red');
  });

  it('renders DiffSelection when diffCohort is provided', () => {
    renderWithRouter(<SearchResults {...baseProps} diffCohort={[{ id: 'id-1' }]} />);
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

  it('handles trace with no spans', () => {
    renderWithRouter(
      <SearchResults
        {...baseProps}
        traces={[
          {
            traceID: 'no-spans',
            traceName: 'Empty Trace',
            startTime: 0,
            duration: 1,
            processes: {},
            spans: [],
            asOtelTrace: () => ({ spans: [] }),
          },
        ]}
      />
    );
    const data = ScatterPlot.mock.calls[0][0].data[0];
    expect(data.rootSpanName).toBe('Unknown');
    expect(data.services).toEqual([]);
  });

  it('handles trace with no services property', () => {
    renderWithRouter(
      <SearchResults
        {...baseProps}
        traces={[
          {
            traceID: 'no-services',
            traceName: 'No Services',
            startTime: 0,
            duration: 1,
            processes: {},
            spans: [
              {
                process: { serviceName: 'test-service' },
                operationName: 'test-operation',
                tags: [],
              },
            ],
            asOtelTrace: () => ({ spans: [] }),
          },
        ]}
      />
    );
    const data = ScatterPlot.mock.calls[0][0].data[0];
    expect(data.services).toEqual([]);
    expect(data.rootSpanName).toBe('op-A');
  });

  describe('search finished with results', () => {
    it('shows a scatter plot', () => {
      renderWithRouter(<SearchResults {...baseProps} />);
      expect(screen.getByTestId('scatterplot')).toBeInTheDocument();
    });

    it('shows a result entry for each trace', () => {
      renderWithRouter(<SearchResults {...baseProps} />);
      expect(ResultItem.mock.calls).toHaveLength(baseTraces.length);
    });

    it('deep links traces', () => {
      const spanLinks = { [baseTraces[0].traceID]: 'foobar' };
      renderWithRouter(<SearchResults {...baseProps} spanLinks={spanLinks} />);
      const [first, second] = ResultItem.mock.calls;
      expect(first[0].linkTo.search).toBe('uiFind=foobar');
      expect(second[0].linkTo.search).toBeUndefined();
    });

    it('deep links traces with leading 0', () => {
      const uiFind0 = 'ui-find-0';
      const uiFind1 = 'ui-find-1';
      const traceID0 = '00traceID0';
      const traceID1 = 'traceID1';
      const spanLinks = {
        [traceID0]: uiFind0,
        [traceID1]: uiFind1,
      };
      const zeroIDTraces = [
        { traceID: traceID0, spans: [], processes: {}, asOtelTrace: () => ({ spans: [] }) },
        { traceID: `000${traceID1}`, spans: [], processes: {}, asOtelTrace: () => ({ spans: [] }) },
      ];
      renderWithRouter(<SearchResults {...baseProps} traces={zeroIDTraces} spanLinks={spanLinks} />);
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
          getUrl({ [otherParam]: otherValue, [searchParam]: 'ddg' })
        );
        expect(spy).toHaveBeenLastCalledWith('ddg');

        rerender(
          withRouter(
            <SearchResults {...baseProps} location={{ search: `${otherSearch}&${searchParam}=ddg` }} />
          )
        );
        fireEvent.click(screen.getByTestId('alt-toggle'));
        expect(mockNavigate).toHaveBeenLastCalledWith(
          getUrl({ [otherParam]: otherValue, [searchParam]: 'traces' })
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
          getUrl({ [otherParam]: otherValue, [searchParam]: 'ddg' })
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

      it('does not show DownloadResults when view is ddg', () => {
        const { rerender } = renderWithRouter(
          <SearchResults {...baseProps} location={{ search: '?view=traces' }} />
        );
        expect(screen.getByTestId('download')).toBeInTheDocument();

        rerender(withRouter(<SearchResults {...baseProps} location={{ search: '?view=ddg' }} />));
        expect(screen.queryByTestId('download')).not.toBeInTheDocument();
      });

      it('when click on DownloadResults then call download function', () => {
        const orig = global.Blob;
        global.Blob = class {
          constructor(text, options) {
            this.text = text;
            this.options = options;
          }
        };
        URL.createObjectURL = jest.fn(() => 'blob://url');
        URL.revokeObjectURL = jest.fn();

        renderWithRouter(<SearchResults {...baseProps} location={{ search: '?view=traces' }} />);
        fireEvent.click(screen.getByTestId('download'));

        expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
        const blobArg = URL.createObjectURL.mock.calls[0][0];
        expect(blobArg.text).toEqual([`{"data":${JSON.stringify(baseProps.rawTraces)}}`]);
        expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);

        global.Blob = orig;
      });

      it('when create a download file then it can be read back', async () => {
        const content = `{"data":${JSON.stringify(baseProps.rawTraces)}}`;
        const file = new File([createBlob(baseProps.rawTraces)], 'test.json');
        const contentFile = await readJsonFile({ file });
        expect(JSON.stringify(contentFile)).toBe(content);
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
  });
});
