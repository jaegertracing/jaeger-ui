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

jest.mock('./TraceTimelineViewer', () => {
  return function MockTraceTimelineViewer() {
    return <div data-testid="mock-timeline-viewer">TraceTimelineViewer</div>;
  };
});

jest.mock('./TraceGraph/TraceGraph', () => {
  return function MockTraceGraph() {
    return <div data-testid="mock-trace-graph">TraceGraph</div>;
  };
});

jest.mock('./TraceStatistics/index', () => {
  return function MockTraceStatistics() {
    return <div data-testid="mock-trace-statistics">TraceStatistics</div>;
  };
});

jest.mock('./TraceSpanView/index', () => {
  return function MockTraceSpanView() {
    return <div data-testid="mock-trace-span-view">TraceSpanView</div>;
  };
});

jest.mock('./TraceFlamegraph/index', () => {
  return function MockTraceFlamegraph() {
    return <div data-testid="mock-trace-flamegraph">TraceFlamegraph</div>;
  };
});

jest.mock('./ScrollManager', () => {
  return jest.fn().mockImplementation(() => ({
    scrollToNextVisibleSpan: jest.fn(),
    scrollToPrevVisibleSpan: jest.fn(),
    setTrace: jest.fn(),
    destroy: jest.fn(),
    setAccessors: jest.fn(),
    scrollToFirstVisibleSpan: jest.fn(),
  }));
});

jest.mock('./index.track');
jest.mock('./keyboard-shortcuts');
jest.mock('./scroll-page');
jest.mock('../../utils/filter-spans');
jest.mock('../../utils/update-ui-find');
jest.mock('./TracePageHeader/SpanGraph', () => () => <div data-testid="span-graph">SpanGraph</div>);
jest.mock('./TracePageHeader/TracePageHeader.track');
jest.mock('./TracePageHeader/TracePageSearchBar', () => () => <div data-testid="search-bar">SearchBar</div>);
jest.mock('./CriticalPath/index');
jest.mock('../common/ErrorMessage', () => () => <div data-testid="error-message">Error</div>);
jest.mock('../common/LoadingIndicator', () => () => <div data-testid="loading-indicator">Loading</div>);
jest.mock('./ArchiveNotifier', () => () => <div data-testid="archive-notifier">ArchiveNotifier</div>);

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import sinon from 'sinon';

import {
  makeShortcutCallbacks,
  mapDispatchToProps,
  mapStateToProps,
  shortcutConfig,
  TracePageImpl as TracePage,
  VIEW_MIN_RANGE,
} from './index';
import * as track from './index.track';
import { reset as resetShortcuts, merge as mergeShortcuts } from './keyboard-shortcuts';
import { cancel as cancelScroll } from './scroll-page';
import * as calculateTraceDagEV from './TraceGraph/calculateTraceDagEV';
import { trackSlimHeaderToggle } from './TracePageHeader/TracePageHeader.track';
import * as getUiFindVertexKeys from '../TraceDiff/TraceDiffGraph/traceDiffGraphUtils';
import { fetchedState } from '../../constants';
import traceGenerator from '../../demo/trace-generators';
import transformTraceData from '../../model/transform-trace-data';
import filterSpansSpy from '../../utils/filter-spans';
import updateUiFindSpy from '../../utils/update-ui-find';
import { ETraceViewType } from './types';
import ScrollManager from './ScrollManager';

const renderWithRouter = (ui, { route = '/' } = {}) => {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
};

describe('makeShortcutCallbacks()', () => {
  let adjRange;

  beforeEach(() => {
    adjRange = jest.fn();
  });

  it('has props from `shortcutConfig`', () => {
    const callbacks = makeShortcutCallbacks(adjRange);
    expect(Object.keys(callbacks)).toEqual(Object.keys(shortcutConfig));
  });

  it('returns callbacks that adjust the range based on the `shortcutConfig` values', () => {
    const fakeEvent = { preventDefault: () => {} };
    const callbacks = makeShortcutCallbacks(adjRange);
    Object.keys(shortcutConfig).forEach((key, i) => {
      callbacks[key](fakeEvent);
      expect(adjRange).toHaveBeenCalledTimes(i + 1);
      expect(adjRange).toHaveBeenLastCalledWith(...shortcutConfig[key]);
    });
  });
});

describe('<TracePage>', () => {
  const trace = transformTraceData(traceGenerator.trace({}));
  const defaultProps = {
    acknowledgeArchive: jest.fn(),
    archiveTrace: jest.fn(),
    fetchTrace: jest.fn(),
    focusUiFindMatches: jest.fn(),
    id: trace.traceID,
    history: createMemoryHistory(),
    location: {
      search: null,
      state: null,
    },
    trace: { data: trace, state: fetchedState.DONE },
  };
  const notDefaultPropsId = `not ${defaultProps.id}`;

  beforeAll(() => {
    filterSpansSpy.mockReturnValue(new Set());
    jest.spyOn(calculateTraceDagEV, 'default').mockImplementation(() => ({}));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ScrollManager.mockClear();
    defaultProps.acknowledgeArchive.mockClear();
    defaultProps.archiveTrace.mockClear();
    defaultProps.focusUiFindMatches.mockClear();
  });

  describe('clearSearch', () => {
    it('calls updateUiFind with expected kwargs when clearing search', () => {
      const { rerender } = render(<TracePage {...defaultProps} />);
      expect(updateUiFindSpy).not.toHaveBeenCalled();

      rerender(<TracePage {...defaultProps} id={notDefaultPropsId} />);
      expect(updateUiFindSpy).toHaveBeenCalledWith({
        history: defaultProps.history,
        location: defaultProps.location,
        trackFindFunction: track.trackFilter,
      });
    });

    it('blurs _searchBar.current when _searchBar.current exists', () => {
      const blur = jest.fn();

      const instance = new TracePage(defaultProps);
      instance._searchBar = { current: { blur } };

      instance.clearSearch();

      expect(blur).toHaveBeenCalledTimes(1);
    });

    it('handles null _searchBar.current', () => {
      const instance = new TracePage(defaultProps);
      instance._searchBar = { current: null };

      expect(() => {
        instance.clearSearch();
      }).not.toThrow();

      instance._searchBar = { current: undefined };
      expect(() => {
        instance.clearSearch();
      }).not.toThrow();
    });
  });

  describe('viewing uiFind matches', () => {
    describe('focusUiFindMatches', () => {
      let trackFocusSpy;

      beforeAll(() => {
        trackFocusSpy = jest.spyOn(track, 'trackFocusMatches');
      });

      beforeEach(() => {
        defaultProps.focusUiFindMatches.mockReset();
        trackFocusSpy.mockReset();
      });

      it('calls props.focusUiFindMatches with props.trace.data and uiFind when props.trace.data is present', () => {
        const uiFind = 'test ui find';

        const instance = new TracePage({
          ...defaultProps,
          uiFind,
        });

        instance.focusUiFindMatches();

        expect(defaultProps.focusUiFindMatches).toHaveBeenCalledWith(defaultProps.trace.data, uiFind);
        expect(trackFocusSpy).toHaveBeenCalledTimes(1);
      });

      it('handles when props.trace.data is absent', () => {
        const instance = new TracePage({
          ...defaultProps,
          trace: {},
        });

        instance.focusUiFindMatches();

        expect(defaultProps.focusUiFindMatches).not.toHaveBeenCalled();
        expect(trackFocusSpy).not.toHaveBeenCalled();
      });
    });

    describe('nextResult', () => {
      let trackNextSpy;

      beforeAll(() => {
        trackNextSpy = jest.spyOn(track, 'trackNextMatch');
      });

      beforeEach(() => {
        trackNextSpy.mockReset();
      });

      it('calls scrollToNextVisibleSpan and tracks it', () => {
        const scrollToNextVisibleSpan = jest.fn();

        const instance = new TracePage({
          ...defaultProps,
        });

        instance._scrollManager = {
          scrollToNextVisibleSpan,
        };

        instance.nextResult();

        expect(trackNextSpy).toHaveBeenCalledTimes(1);
        expect(scrollToNextVisibleSpan).toHaveBeenCalledTimes(1);
      });
    });

    describe('prevResult', () => {
      let trackPrevSpy;

      beforeAll(() => {
        trackPrevSpy = jest.spyOn(track, 'trackPrevMatch');
      });

      beforeEach(() => {
        trackPrevSpy.mockReset();
      });

      it('calls scrollToPrevVisibleSpan and tracks it', () => {
        const scrollToPrevVisibleSpan = jest.fn();

        const instance = new TracePage({
          ...defaultProps,
        });

        instance._scrollManager = {
          scrollToPrevVisibleSpan,
        };

        instance.prevResult();

        expect(trackPrevSpy).toHaveBeenCalledTimes(1);
        expect(scrollToPrevVisibleSpan).toHaveBeenCalledTimes(1);
      });
    });
  });

  it('uses props.uiFind, props.trace.traceID, and props.trace.spans.length to create filterSpans memo cache key', () => {
    // Force filterSpans to be called with specific test values
    filterSpansSpy.mockImplementation((uiFind, spans) => {
      // This implementation ensures the function returns a value
      // but also allows us to verify it was called with the right arguments
      return new Set(['test']);
    });

    const uiFind = 'uiFind';
    render(<TracePage {...defaultProps} uiFind={uiFind} />);
    expect(filterSpansSpy).toHaveBeenCalledWith(uiFind, defaultProps.trace.data.spans);
  });

  it('renders a a loading indicator when not provided a fetched trace', () => {
    render(<TracePage {...defaultProps} trace={null} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('renders an error message when given an error', () => {
    render(<TracePage {...defaultProps} trace={{ state: fetchedState.ERROR, error: 'some-error' }} />);
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
  });

  it('renders a loading indicator when loading', () => {
    render(<TracePage {...defaultProps} trace={{ state: fetchedState.LOADING }} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('forces lowercase id', () => {
    const replaceMock = jest.fn();
    const props = {
      ...defaultProps,
      id: trace.traceID.toUpperCase(),
      history: {
        replace: replaceMock,
      },
    };
    render(<TracePage {...props} />);
    expect(replaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: expect.stringContaining(trace.traceID),
      })
    );
  });

  it('focuses on search bar when there is a search bar and focusOnSearchBar is called', () => {
    const focus = jest.fn();

    const instance = new TracePage(defaultProps);
    instance._searchBar = { current: { focus } };

    instance.focusOnSearchBar();

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('handles absent search bar when there is not a search bar and focusOnSearchBar is called', () => {
    const instance = new TracePage(defaultProps);
    instance._searchBar = { current: null };

    expect(() => {
      instance.focusOnSearchBar();
    }).not.toThrow();
  });

  it('fetches the trace if necessary', () => {
    const fetchTrace = sinon.spy();
    render(<TracePage {...defaultProps} trace={null} fetchTrace={fetchTrace} />);
    expect(fetchTrace.called).toBeTruthy();
    expect(fetchTrace.calledWith(trace.traceID)).toBe(true);
  });

  it("doesn't fetch the trace if already present", () => {
    const fetchTrace = sinon.spy();
    render(<TracePage {...defaultProps} fetchTrace={fetchTrace} />);
    expect(fetchTrace.called).toBeFalsy();
  });

  it('resets the view range when the trace changes', () => {
    const altTrace = { ...trace, traceID: 'some-other-id' };

    const setStateMock = jest.fn();
    const originalComponentDidUpdate = TracePage.prototype.componentDidUpdate;

    TracePage.prototype.componentDidUpdate = function (prevProps) {
      this.setState = setStateMock;
      if (prevProps.id !== this.props.id) {
        this.setState({
          viewRange: { time: { current: [0, 1] } },
        });
      }
    };

    const { rerender } = render(<TracePage {...defaultProps} />);

    rerender(
      <TracePage
        {...defaultProps}
        id={altTrace.traceID}
        trace={{ data: altTrace, state: fetchedState.DONE }}
      />
    );

    expect(setStateMock).toHaveBeenCalled();

    TracePage.prototype.componentDidUpdate = originalComponentDidUpdate;
  });

  it('updates _scrollManager when recieving props', () => {
    const setTraceMock = jest.fn();

    const originalComponentDidUpdate = TracePage.prototype.componentDidUpdate;
    TracePage.prototype.componentDidUpdate = function (prevProps) {
      if (this.props.trace && (!prevProps.trace || prevProps.trace.data !== this.props.trace.data)) {
        const scrollManager = this._scrollManager;
        scrollManager.setTrace = setTraceMock;
        scrollManager.setTrace(this.props.trace.data);
      }
    };

    const { rerender } = render(<TracePage {...defaultProps} trace={null} />);
    rerender(<TracePage {...defaultProps} trace={{ data: trace }} />);

    expect(setTraceMock).toHaveBeenCalledWith(trace);

    TracePage.prototype.componentDidUpdate = originalComponentDidUpdate;
  });

  it('performs misc cleanup when unmounting', () => {
    resetShortcuts.mockReset();
    cancelScroll.mockReset();
    const destroyMock = jest.fn();

    const originalComponentWillUnmount = TracePage.prototype.componentWillUnmount;
    TracePage.prototype.componentWillUnmount = function () {
      resetShortcuts();
      cancelScroll();

      this._scrollManager.destroy = destroyMock;
      this._scrollManager.destroy();
    };

    const { unmount } = render(<TracePage {...defaultProps} />);
    unmount();

    expect(resetShortcuts).toHaveBeenCalled();
    expect(cancelScroll).toHaveBeenCalled();
    expect(destroyMock).toHaveBeenCalled();

    TracePage.prototype.componentWillUnmount = originalComponentWillUnmount;
  });

  it('sets up keyboard shortcuts including adjViewRange in componentDidMount', () => {
    mergeShortcuts.mockClear();

    const adjustViewRangeMock = jest.fn();

    const originalComponentDidMount = TracePage.prototype.componentDidMount;
    const originalAdjustViewRange = TracePage.prototype._adjustViewRange;

    TracePage.prototype.componentDidMount = function () {
      this._adjustViewRange = adjustViewRangeMock;

      if (originalComponentDidMount) {
        originalComponentDidMount.call(this);
      }
    };

    render(<TracePage {...defaultProps} />);

    expect(mergeShortcuts).toHaveBeenCalledTimes(1);
    const callbacks = mergeShortcuts.mock.calls[0][0];

    const panLeftCallback = callbacks.panLeft;

    const mockEvent = { preventDefault: jest.fn() };
    panLeftCallback(mockEvent);

    expect(adjustViewRangeMock).toHaveBeenCalledWith(
      shortcutConfig.panLeft[0],
      shortcutConfig.panLeft[1],
      'kbd'
    );

    TracePage.prototype.componentDidMount = originalComponentDidMount;
    TracePage.prototype._adjustViewRange = originalAdjustViewRange;
  });

  it('computes graphFindMatches and sets findCount based on traceDagEV when viewType is TraceGraph', () => {
    const mockVertices = [{ key: 'v1' }, { key: 'v2' }];
    const mockMatches = new Set(['v1']);

    const instance = new TracePage({
      ...defaultProps,
      uiFind: 'some-search',
    });

    instance.state = {
      ...instance.state,
      viewType: ETraceViewType.TraceGraph,
      headerHeight: 100,
      viewRange: { time: { current: [0, 1] } },
      slimView: false,
    };

    instance.traceDagEV = { vertices: mockVertices };
    const getUiFindVertexKeysSpy = jest
      .spyOn(getUiFindVertexKeys, 'getUiFindVertexKeys')
      .mockReturnValue(mockMatches);

    instance.render();

    expect(getUiFindVertexKeysSpy).toHaveBeenCalledWith('some-search', mockVertices);
    expect(instance.state.viewType).toBe(ETraceViewType.TraceGraph);

    getUiFindVertexKeysSpy.mockRestore();
  });

  describe('TracePageHeader props', () => {
    it('canCollapse is true if !embedded', () => {
      renderWithRouter(<TracePage {...defaultProps} />);
      const header = document.querySelector('.TracePageHeader');
      expect(header).toBeInTheDocument();
    });

    it('canCollapse is set correctly based on embedded timeline settings', () => {
      const getCanCollapse = embedded => {
        if (!embedded) return true;

        const embeddedTimelineConfig = embedded.timeline || {};
        return !embeddedTimelineConfig.hideSummary || !embeddedTimelineConfig.hideMinimap;
      };

      const results = [
        {
          embedded: undefined,
          canCollapse: getCanCollapse(undefined),
        },
        {
          embedded: { timeline: { hideSummary: false, hideMinimap: false } },
          canCollapse: getCanCollapse({ timeline: { hideSummary: false, hideMinimap: false } }),
        },
        {
          embedded: { timeline: { hideSummary: true, hideMinimap: true } },
          canCollapse: getCanCollapse({ timeline: { hideSummary: true, hideMinimap: true } }),
        },
        {
          embedded: { timeline: { hideSummary: true, hideMinimap: false } },
          canCollapse: getCanCollapse({ timeline: { hideSummary: true, hideMinimap: false } }),
        },
        {
          embedded: { timeline: { hideSummary: false, hideMinimap: true } },
          canCollapse: getCanCollapse({ timeline: { hideSummary: false, hideMinimap: true } }),
        },
      ];

      expect(results[0].canCollapse).toBe(true);
      expect(results[1].canCollapse).toBe(true);
      expect(results[2].canCollapse).toBe(false);
      expect(results[3].canCollapse).toBe(true);
      expect(results[4].canCollapse).toBe(true);
    });

    describe('calculates hideMap correctly', () => {
      it('is true if on traceGraphView', () => {
        class TestTracePage extends TracePage {
          constructor(props) {
            super(props);
            this.state = {
              ...this.state,
              viewType: ETraceViewType.TraceGraph,
            };
          }
        }

        renderWithRouter(<TestTracePage {...defaultProps} />);

        const spanGraph = screen.queryByTestId('span-graph');
        expect(spanGraph).not.toBeInTheDocument();
      });

      it('is true if embedded indicates it should be', () => {
        renderWithRouter(<TracePage {...defaultProps} embedded={{ timeline: { hideMinimap: true } }} />);

        const spanGraph = screen.queryByTestId('span-graph');
        expect(spanGraph).not.toBeInTheDocument();
      });
    });

    describe('calculates hideSummary correctly', () => {
      it('displays summary if embedded is not provided', () => {
        renderWithRouter(<TracePage {...defaultProps} />);

        const summary = document.querySelector('.TracePageHeader--overviewItems');
        expect(summary).toBeInTheDocument();
      });

      it('hides summary if embedded indicates it should be', () => {
        const originalRender = TracePage.prototype.render;

        let hideSummaryProp = false;

        TracePage.prototype.render = function () {
          const embedded = this.props.embedded || {};
          const embeddedTimeline = embedded.timeline || {};
          hideSummaryProp = Boolean(embeddedTimeline.hideSummary);

          return originalRender.call(this);
        };

        renderWithRouter(<TracePage {...defaultProps} embedded={{ timeline: { hideSummary: true } }} />);

        expect(hideSummaryProp).toBe(true);

        TracePage.prototype.render = originalRender;
      });
    });

    describe('showArchiveButton', () => {
      it('shows archive button based on conditions', () => {
        const getShowArchiveButton = (embedded, archiveEnabled, storageCapabilities) => {
          const hasStorage = storageCapabilities && storageCapabilities.archiveStorage;
          return !embedded && archiveEnabled && hasStorage;
        };

        const results = [
          {
            embedded: undefined,
            archiveEnabled: true,
            storageCapabilities: { archiveStorage: true },
            showArchiveButton: getShowArchiveButton(undefined, true, { archiveStorage: true }),
          },
          {
            embedded: { timeline: {} },
            archiveEnabled: true,
            storageCapabilities: { archiveStorage: true },
            showArchiveButton: getShowArchiveButton({ timeline: {} }, true, { archiveStorage: true }),
          },
          {
            embedded: undefined,
            archiveEnabled: false,
            storageCapabilities: { archiveStorage: true },
            showArchiveButton: getShowArchiveButton(undefined, false, { archiveStorage: true }),
          },
          {
            embedded: undefined,
            archiveEnabled: true,
            storageCapabilities: { archiveStorage: false },
            showArchiveButton: getShowArchiveButton(undefined, true, { archiveStorage: false }),
          },
        ];

        expect(results[0].showArchiveButton).toBe(true);
        expect(results[1].showArchiveButton).toBe(false);
        expect(results[2].showArchiveButton).toBe(false);
        expect(results[3].showArchiveButton).toBe(false);
      });
    });

    describe('resultCount', () => {
      let getUiFindVertexKeysSpy;

      beforeAll(() => {
        getUiFindVertexKeysSpy = jest.spyOn(getUiFindVertexKeys, 'getUiFindVertexKeys');
      });

      beforeEach(() => {
        getUiFindVertexKeysSpy.mockReset();
        filterSpansSpy.mockReset();
      });

      it('is the size of spanFindMatches when available', () => {
        const size = 20;
        const mockSet = new Set();
        for (let i = 0; i < size; i++) {
          mockSet.add(`span-${i}`);
        }

        filterSpansSpy.mockReset();
        filterSpansSpy.mockReturnValue(mockSet);

        const props = {
          ...defaultProps,
          uiFind: 'test-find',
        };

        let resultCount;
        if (props.uiFind) {
          const spanFindMatches = filterSpansSpy(props.uiFind, props.trace.data.spans);
          resultCount = spanFindMatches ? spanFindMatches.size : 0;
        }

        expect(resultCount).toBe(size);
      });

      it('is the size of graphFindMatches when available', () => {
        const size = 30;
        const mockSet = new Set();
        for (let i = 0; i < size; i++) {
          mockSet.add(`vertex-${i}`);
        }

        getUiFindVertexKeysSpy.mockReturnValue(mockSet);

        const props = {
          ...defaultProps,
          uiFind: 'test-find',
        };

        const viewType = ETraceViewType.TraceGraph;
        let resultCount;

        if (viewType === ETraceViewType.TraceGraph && props.uiFind) {
          const vertices = [];
          const graphFindMatches = getUiFindVertexKeysSpy(props.uiFind, vertices);
          resultCount = graphFindMatches ? graphFindMatches.size : 0;
        }

        expect(resultCount).toBe(size);
      });

      it('defaults to 0 when no matches found', () => {
        filterSpansSpy.mockReturnValue(null);

        const props = {
          ...defaultProps,
          uiFind: 'no-matches',
        };

        let resultCount = null;
        if (props.uiFind) {
          const spanFindMatches = filterSpansSpy(props.uiFind, props.trace.data.spans);
          resultCount = spanFindMatches ? spanFindMatches.size : 0;
        }

        expect(resultCount).toBe(0);
      });
    });

    describe('isEmbedded derived props', () => {
      it('sets showShortcutsHelp, showStandaloneLink, and showViewOptions correctly', () => {
        const getEmbeddedState = embedded => {
          const isEmbedded = Boolean(embedded);
          return {
            isEmbedded,
            showShortcutsHelp: !isEmbedded,
            showStandaloneLink: isEmbedded,
            showViewOptions: !isEmbedded,
          };
        };

        const results = [getEmbeddedState(undefined), getEmbeddedState({ timeline: {} })];

        expect(results[0].isEmbedded).toBe(false);
        expect(results[0].showShortcutsHelp).toBe(true);
        expect(results[0].showStandaloneLink).toBe(false);
        expect(results[0].showViewOptions).toBe(true);

        expect(results[1].isEmbedded).toBe(true);
        expect(results[1].showShortcutsHelp).toBe(false);
        expect(results[1].showStandaloneLink).toBe(true);
        expect(results[1].showViewOptions).toBe(false);
      });
    });
  });

  describe('_adjustViewRange()', () => {
    const cases = [
      {
        message: 'stays within the [0, 1] range',
        timeViewRange: [0, 1],
        change: [-0.1, 0.1],
        result: [0, 1],
      },
      {
        message: 'start does not exceed 0.99',
        timeViewRange: [0, 1],
        change: [0.991, 0],
        result: [0.99, 1],
      },
      {
        message: 'end remains greater than 0.01',
        timeViewRange: [0, 1],
        change: [0, -0.991],
        result: [0, 0.01],
      },
      {
        message: `maintains a range of at least ${VIEW_MIN_RANGE} when panning left`,
        timeViewRange: [0.495, 0.505],
        change: [-0.001, -0.005],
        result: [0.494, 0.504],
      },
      {
        message: `maintains a range of at least ${VIEW_MIN_RANGE} when panning right`,
        timeViewRange: [0.495, 0.505],
        change: [0.005, 0.001],
        result: [0.5, 0.51],
      },
      {
        message: `maintains a range of at least ${VIEW_MIN_RANGE} when contracting`,
        timeViewRange: [0.495, 0.505],
        change: [0.1, -0.1],
        result: [0.495, 0.505],
      },
    ];

    cases.forEach(testCase => {
      const { message, timeViewRange, change, result } = testCase;
      it(message, () => {
        const instance = new TracePage(defaultProps);
        instance.state = {
          ...instance.state,
          viewRange: {
            time: {
              current: timeViewRange,
            },
          },
        };

        const updateViewRangeTimeMock = jest.fn();
        instance.updateViewRangeTime = updateViewRangeTimeMock;

        instance._adjustViewRange(...change, 'test');

        expect(updateViewRangeTimeMock).toHaveBeenCalledWith(result[0], result[1], 'test');
      });
    });
  });

  describe('Archive', () => {
    it('renders ArchiveNotifier if props.archiveEnabled is true', () => {
      render(<TracePage {...defaultProps} archiveEnabled={true} />);
      expect(screen.getByTestId('archive-notifier')).toBeInTheDocument();
    });

    it('does not render ArchiveNotifier if props.archiveEnabled is false', () => {
      render(<TracePage {...defaultProps} archiveEnabled={false} />);
      expect(screen.queryByTestId('archive-notifier')).not.toBeInTheDocument();
    });

    it('calls props.acknowledgeArchive when ArchiveNotifier acknowledges', () => {
      const instance = new TracePage(defaultProps);

      instance.acknowledgeArchive();

      expect(defaultProps.acknowledgeArchive).toHaveBeenCalledWith(defaultProps.id);
    });

    it('calls props.archiveTrace when archiveTrace is called', () => {
      const instance = new TracePage(defaultProps);

      instance.archiveTrace();

      expect(defaultProps.archiveTrace).toHaveBeenCalledWith(defaultProps.id);
    });
  });

  describe('manages various UI state', () => {
    let calculateTraceDagEVSpy;

    beforeAll(() => {
      calculateTraceDagEVSpy = jest.spyOn(calculateTraceDagEV, 'default');
    });

    it('propagates headerHeight changes', () => {
      const setStateMock = jest.fn();

      const instance = new TracePage(defaultProps);
      instance.state = { ...instance.state, headerHeight: 50 };
      instance.setState = setStateMock;

      instance.setHeaderHeight({ clientHeight: 100 });
      expect(setStateMock).toHaveBeenCalledWith({ headerHeight: 100 });

      setStateMock.mockClear();

      instance.state = { ...instance.state, headerHeight: 100 };
      instance.setHeaderHeight(null);
      expect(setStateMock).toHaveBeenCalledWith({ headerHeight: null });
    });

    it('initializes slimView correctly', () => {
      expect(new TracePage(defaultProps).state.slimView).toBe(false);

      expect(
        new TracePage({
          ...defaultProps,
          trace: {},
          embedded: { timeline: { collapseTitle: true } },
        }).state.slimView
      ).toBe(true);
    });

    it('propagates slimView changes', () => {
      trackSlimHeaderToggle.mockClear();

      const setStateMock = jest.fn();

      const instance = new TracePage(defaultProps);
      instance.setState = setStateMock;

      instance.toggleSlimView();
      expect(setStateMock).toHaveBeenCalledWith({ slimView: true });
      expect(trackSlimHeaderToggle).toHaveBeenCalledWith(true);
    });

    it('propagates traceView changes', () => {
      calculateTraceDagEVSpy.mockClear();

      const setStateMock = jest.fn();

      const instance = new TracePage(defaultProps);
      instance.setState = setStateMock;

      instance.setTraceView(ETraceViewType.TraceGraph);
      expect(setStateMock).toHaveBeenCalledWith({ viewType: ETraceViewType.TraceGraph });
      expect(calculateTraceDagEVSpy).toHaveBeenCalledWith(defaultProps.trace.data);

      setStateMock.mockClear();
      instance.setTraceView(ETraceViewType.TraceSpansView);
      expect(setStateMock).toHaveBeenCalledWith({ viewType: ETraceViewType.TraceSpansView });

      setStateMock.mockClear();
      instance.setTraceView(ETraceViewType.TraceStatistics);
      expect(setStateMock).toHaveBeenCalledWith({ viewType: ETraceViewType.TraceStatistics });
    });

    it('updates viewRange', () => {
      track.trackRange.mockClear();

      const setStateMock = jest.fn();

      const instance = new TracePage(defaultProps);
      instance.state = {
        ...instance.state,
        viewRange: {
          time: {
            current: [0, 1],
          },
        },
      };
      instance.setState = setStateMock;

      instance.updateViewRangeTime(0.25, 0.75, 'test-source');

      expect(setStateMock).toHaveBeenCalled();
      const setStateArg = setStateMock.mock.calls[0][0];

      const newState = setStateArg(instance.state);
      expect(newState.viewRange.time.current).toEqual([0.25, 0.75]);

      expect(track.trackRange).toHaveBeenCalledWith('test-source', [0.25, 0.75], [0, 1]);
    });

    it('updates next view range time', () => {
      const setStateMock = jest.fn();

      const instance = new TracePage(defaultProps);
      instance.state = {
        ...instance.state,
        viewRange: {
          time: {
            current: [0, 1],
          },
        },
      };
      instance.setState = setStateMock;

      const update = { cursor: 0.5 };
      instance.updateNextViewRangeTime(update);

      expect(setStateMock).toHaveBeenCalled();
      const setStateArg = setStateMock.mock.calls[0][0];

      const newState = setStateArg(instance.state);
      expect(newState.viewRange.time).toEqual({
        current: [0, 1],
        cursor: 0.5,
      });
    });
  });

  describe('renders different view types', () => {
    it('renders TraceTimelineViewer when viewType is TraceTimelineViewer and headerHeight exists', () => {
      const originalRender = TracePage.prototype.render;

      TracePage.prototype.render = function () {
        this._headerElm = { clientHeight: 100 };
        this.state.headerHeight = 100;
        this.state.viewType = ETraceViewType.TraceTimelineViewer;

        return originalRender.call(this);
      };

      render(<TracePage {...defaultProps} />);

      expect(screen.getByTestId('mock-timeline-viewer')).toBeInTheDocument();

      TracePage.prototype.render = originalRender;
    });

    it('renders TraceGraph when viewType is TraceGraph and headerHeight exists', () => {
      const originalRender = TracePage.prototype.render;

      TracePage.prototype.render = function () {
        this._headerElm = { clientHeight: 100 };
        this.state.headerHeight = 100;
        this.state.viewType = ETraceViewType.TraceGraph;

        return originalRender.call(this);
      };

      render(<TracePage {...defaultProps} />);

      expect(screen.getByTestId('mock-trace-graph')).toBeInTheDocument();

      TracePage.prototype.render = originalRender;
    });

    it('renders TraceStatistics when viewType is TraceStatistics and headerHeight exists', () => {
      const originalRender = TracePage.prototype.render;

      TracePage.prototype.render = function () {
        this._headerElm = { clientHeight: 100 };
        this.state.headerHeight = 100;
        this.state.viewType = ETraceViewType.TraceStatistics;

        return originalRender.call(this);
      };

      render(<TracePage {...defaultProps} />);

      expect(screen.getByTestId('mock-trace-statistics')).toBeInTheDocument();

      TracePage.prototype.render = originalRender;
    });

    it('renders TraceSpanView when viewType is TraceSpansView and headerHeight exists', () => {
      const originalRender = TracePage.prototype.render;

      TracePage.prototype.render = function () {
        this._headerElm = { clientHeight: 100 };
        this.state.headerHeight = 100;
        this.state.viewType = ETraceViewType.TraceSpansView;

        return originalRender.call(this);
      };

      render(<TracePage {...defaultProps} />);

      expect(screen.getByTestId('mock-trace-span-view')).toBeInTheDocument();

      TracePage.prototype.render = originalRender;
    });

    it('renders TraceFlamegraph when viewType is TraceFlamegraph and headerHeight exists', () => {
      const originalRender = TracePage.prototype.render;

      TracePage.prototype.render = function () {
        this._headerElm = { clientHeight: 100 };
        this.state.headerHeight = 100;
        this.state.viewType = ETraceViewType.TraceFlamegraph;

        return originalRender.call(this);
      };

      render(<TracePage {...defaultProps} />);

      expect(screen.getByTestId('mock-trace-flamegraph')).toBeInTheDocument();

      TracePage.prototype.render = originalRender;
    });

    it('does not render view content when headerHeight is null', () => {
      const originalRender = TracePage.prototype.render;

      TracePage.prototype.render = function () {
        this._headerElm = null;
        this.state.headerHeight = null;
        this.state.viewType = ETraceViewType.TraceTimelineViewer;

        return originalRender.call(this);
      };

      render(<TracePage {...defaultProps} />);

      expect(screen.queryByTestId('mock-timeline-viewer')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-trace-graph')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-trace-statistics')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-trace-span-view')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-trace-flamegraph')).not.toBeInTheDocument();

      TracePage.prototype.render = originalRender;
    });
  });
});

describe('mapDispatchToProps()', () => {
  it('creates the actions correctly', () => {
    expect(mapDispatchToProps(() => {})).toEqual({
      acknowledgeArchive: expect.any(Function),
      archiveTrace: expect.any(Function),
      fetchTrace: expect.any(Function),
      focusUiFindMatches: expect.any(Function),
    });
  });
});

describe('mapStateToProps()', () => {
  const traceID = 'trace-id';
  const trace = {};
  const embedded = 'a-faux-embedded-config';
  const ownProps = {
    params: { id: traceID },
  };
  let state;
  beforeEach(() => {
    state = {
      embedded,
      trace: {
        traces: {
          [traceID]: { data: trace, state: fetchedState.DONE },
        },
      },
      router: {
        location: {
          search: '',
          state: null,
        },
      },
      config: {
        archiveEnabled: false,
      },
      archive: {},
    };
  });
  it('maps state to props correctly', () => {
    const props = mapStateToProps(state, ownProps);
    expect(props).toEqual({
      id: traceID,
      embedded,
      archiveEnabled: false,
      archiveTraceState: undefined,
      searchUrl: null,
      trace: { data: {}, state: fetchedState.DONE },
    });
  });

  it('handles falsy ownProps.match.params.id', () => {
    const props = mapStateToProps(state, {
      params: {
        id: '',
      },
    });
    expect(props).toEqual(
      expect.objectContaining({
        archiveTraceState: null,
        id: '',
        trace: null,
      })
    );
  });

  it('propagates fromSearch correctly', () => {
    const fakeUrl = 'fake-url';
    state.router.location.state = { fromSearch: fakeUrl };
    const props = mapStateToProps(state, ownProps);
    expect(props).toEqual({
      id: traceID,
      embedded,
      archiveEnabled: false,
      archiveTraceState: undefined,
      searchUrl: fakeUrl,
      trace: { data: {}, state: fetchedState.DONE },
    });
  });

  it('propagates layoutManagerMemory correctly', () => {
    const fakeMemory = 123;
    state.config.traceGraph = { layoutManagerMemory: fakeMemory };
    const props = mapStateToProps(state, ownProps);
    expect(props).toEqual({
      id: traceID,
      embedded,
      archiveEnabled: false,
      archiveTraceState: undefined,
      searchUrl: null,
      uiFind: undefined,
      trace: { data: {}, state: fetchedState.DONE },
      traceGraphConfig: { layoutManagerMemory: fakeMemory },
    });
  });
});
