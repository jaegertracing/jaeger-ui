// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import {
  computeAdjustedRange,
  makeShortcutCallbacks,
  mapDispatchToProps,
  mapStateToProps,
  shortcutConfig,
  TracePageImpl as TracePage,
  VIEW_MIN_RANGE,
} from './index';
import * as track from './index.track';
import * as keyboardShortcutsMod from './keyboard-shortcuts';
import { reset as resetShortcuts, merge as mergeShortcuts } from './keyboard-shortcuts';
import * as scrollPageMod from './scroll-page';
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

let capturedHeaderProps = {};
let capturedArchiveNotifierProps = {};

vi.mock('./TraceTimelineViewer', async () => {
  return mockDefault(function MockTraceTimelineViewer() {
    return <div data-testid="mock-timeline-viewer">TraceTimelineViewer</div>;
  });
});

vi.mock('./TraceGraph/TraceGraph', async () => {
  return mockDefault(function MockTraceGraph() {
    return <div data-testid="mock-trace-graph">TraceGraph</div>;
  });
});

vi.mock('./TraceStatistics/index', async () => {
  return mockDefault(function MockTraceStatistics() {
    return <div data-testid="mock-trace-statistics">TraceStatistics</div>;
  });
});

vi.mock('./TraceSpanView/index', async () => {
  return mockDefault(function MockTraceSpanView() {
    return <div data-testid="mock-trace-span-view">TraceSpanView</div>;
  });
});

vi.mock('./TraceFlamegraph/index', async () => {
  return mockDefault(function MockTraceFlamegraph() {
    return <div data-testid="mock-trace-flamegraph">TraceFlamegraph</div>;
  });
});

vi.mock('./TraceLogsView/index', async () => {
  return mockDefault(function MockTraceLogsView() {
    return <div data-testid="mock-trace-logs-view">TraceLogsView</div>;
  });
});

vi.mock('./ScrollManager', async () => {
  return mockDefault(
    jest.fn().mockImplementation(function () {
      return {
        scrollToNextVisibleSpan: jest.fn(),
        scrollToPrevVisibleSpan: jest.fn(),
        setTrace: jest.fn(),
        destroy: jest.fn(),
        setAccessors: jest.fn(),
        scrollToFirstVisibleSpan: jest.fn(),
      };
    })
  );
});

vi.mock('./index.track');
vi.mock('./keyboard-shortcuts');
vi.mock('./scroll-page');
vi.mock('../../utils/filter-spans');
vi.mock('../../utils/update-ui-find');
vi.mock('./TracePageHeader/SpanGraph', async () =>
  mockDefault(() => <div data-testid="span-graph">SpanGraph</div>)
);
vi.mock('./TracePageHeader/TracePageHeader.track');
vi.mock('./TracePageHeader/TracePageSearchBar', async () =>
  mockDefault(() => <div data-testid="search-bar">SearchBar</div>)
);
vi.mock('./CriticalPath/index');
vi.mock('./TraceGraph/calculateTraceDagEV', async () => ({
  default: jest.fn(() => ({})),
}));
vi.mock('../common/ErrorMessage', async () =>
  mockDefault(() => <div data-testid="error-message">Error</div>)
);
vi.mock('../common/LoadingIndicator', async () =>
  mockDefault(() => <div data-testid="loading-indicator">Loading</div>)
);
vi.mock('./ArchiveNotifier', async () =>
  mockDefault(props => {
    capturedArchiveNotifierProps = props;
    return <div data-testid="archive-notifier">ArchiveNotifier</div>;
  })
);

const {
  mockSubmitTraceToArchive,
  mockAcknowledge,
  mockSetDetailPanelMode,
  mockLayoutPrefsStore,
  mockTraceTimelineStore,
  useEmbeddedStateMock,
} = vi.hoisted(() => ({
  mockSubmitTraceToArchive: jest.fn(),
  mockAcknowledge: jest.fn(),
  mockSetDetailPanelMode: jest.fn(),
  mockLayoutPrefsStore: {
    detailPanelMode: 'inline',
    timelineBarsVisible: true,
    setTimelineBarsVisible: jest.fn(),
  },
  mockTraceTimelineStore: {
    focusUiFindMatches: jest.fn(),
    prunedServices: new Set(),
  },
  useEmbeddedStateMock: jest.fn().mockReturnValue(null),
}));

vi.mock('../../stores/archive-store', () => ({
  useArchiveStore: jest.fn(selector =>
    selector({ archives: {}, submitTraceToArchive: mockSubmitTraceToArchive, acknowledge: mockAcknowledge })
  ),
}));

vi.mock('../../stores/embedded-store', () => ({
  useEmbeddedState: (...args) => useEmbeddedStateMock(...args),
}));

vi.mock('./TraceTimelineViewer/store', () => ({
  useLayoutPrefsStore: jest.fn(selector => selector(mockLayoutPrefsStore)),
  useTraceTimelineStore: jest.fn(selector => selector(mockTraceTimelineStore)),
  setDetailPanelMode: (...args) => mockSetDetailPanelMode(...args),
  SPAN_NAME_COLUMN_WIDTH_MIN: 0.15,
  SPAN_NAME_COLUMN_WIDTH_MAX: 0.85,
  SIDE_PANEL_WIDTH_MIN: 0.2,
  SIDE_PANEL_WIDTH_MAX: 0.7,
  MIN_TIMELINE_COLUMN_WIDTH: 0.05,
}));

vi.mock('./TracePageHeader', async () => {
  const { forwardRef } = require('react');
  return {
    default: forwardRef(function MockTracePageHeader(props, ref) {
      capturedHeaderProps = { ...props, ref };
      return (
        <div className="TracePageHeader">
          {!props.hideSummary && <div className="TracePageHeader--overviewItems" />}
          {!props.hideMap && <div data-testid="span-graph">SpanGraph</div>}
        </div>
      );
    }),
  };
});

const mockNavigate = jest.fn();
vi.mock('react-router-dom', async () => {
  const { MemoryRouter: ActualMemoryRouter } = await vi.importActual('react-router-dom');
  return {
    MemoryRouter: ActualMemoryRouter,
    useNavigate: () => mockNavigate,
  };
});

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
    enableSidePanel: false,
    fetchTrace: jest.fn(),
    focusUiFindMatches: jest.fn(),
    id: trace.traceID,
    location: {
      search: null,
      state: null,
    },
    setDetailPanelMode: jest.fn(),
    setTimelineBarsVisible: jest.fn(),
    trace: { data: trace, state: fetchedState.DONE },
  };
  const notDefaultPropsId = `not ${defaultProps.id}`;

  beforeAll(() => {
    filterSpansSpy.mockReturnValue(new Set());
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useEmbeddedStateMock.mockReturnValue(null);
    ScrollManager.mockClear();
    capturedHeaderProps = {};
    capturedArchiveNotifierProps = {};
    defaultProps.focusUiFindMatches.mockClear();
    mockTraceTimelineStore.focusUiFindMatches.mockClear();
  });

  describe('clearSearch', () => {
    it('calls updateUiFind with expected kwargs when clearing search', () => {
      const { rerender } = render(<TracePage {...defaultProps} />);
      expect(updateUiFindSpy).not.toHaveBeenCalled();

      rerender(<TracePage {...defaultProps} id={notDefaultPropsId} />);
      expect(updateUiFindSpy).toHaveBeenCalledWith({
        navigate: expect.any(Function),
        location: defaultProps.location,
        trackFindFunction: track.trackFilter,
      });
    });

    it('blurs _searchBar.current when _searchBar.current exists', () => {
      const blur = jest.fn();
      render(<TracePage {...defaultProps} />);
      capturedHeaderProps.ref.current = { blur };
      capturedHeaderProps.clearSearch();
      expect(blur).toHaveBeenCalledTimes(1);
    });

    it('handles null _searchBar.current', () => {
      render(<TracePage {...defaultProps} />);
      capturedHeaderProps.ref.current = null;
      expect(() => capturedHeaderProps.clearSearch()).not.toThrow();

      capturedHeaderProps.ref.current = undefined;
      expect(() => capturedHeaderProps.clearSearch()).not.toThrow();
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

      it('dual-writes to Redux + Zustand when props.trace.data is present', () => {
        const uiFind = 'test ui find';
        render(<TracePage {...defaultProps} uiFind={uiFind} />);
        capturedHeaderProps.focusUiFindMatches();
        expect(defaultProps.focusUiFindMatches).toHaveBeenCalledWith(
          defaultProps.trace.data.asOtelTrace(),
          uiFind
        );
        expect(mockTraceTimelineStore.focusUiFindMatches).toHaveBeenCalledWith(
          defaultProps.trace.data.asOtelTrace(),
          uiFind
        );
        expect(trackFocusSpy).toHaveBeenCalledTimes(1);
      });

      it('handles when props.trace.data is absent', () => {
        render(<TracePage {...defaultProps} trace={{}} />);
        expect(defaultProps.focusUiFindMatches).not.toHaveBeenCalled();
        expect(mockTraceTimelineStore.focusUiFindMatches).not.toHaveBeenCalled();
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
        render(<TracePage {...defaultProps} />);
        capturedHeaderProps.nextResult();
        expect(trackNextSpy).toHaveBeenCalledTimes(1);
        expect(ScrollManager.mock.results[0].value.scrollToNextVisibleSpan).toHaveBeenCalledTimes(1);
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
        render(<TracePage {...defaultProps} />);
        capturedHeaderProps.prevResult();
        expect(trackPrevSpy).toHaveBeenCalledTimes(1);
        expect(ScrollManager.mock.results[0].value.scrollToPrevVisibleSpan).toHaveBeenCalledTimes(1);
      });
    });
  });

  it('uses uiFind and props.id to compute memo cache key for filterSpans', () => {
    const uiFind = 'uiFind';
    const trace = transformTraceData(traceGenerator.trace({}));
    const baseProps = {
      ...defaultProps,
      uiFind: undefined,
      trace: { data: trace, state: fetchedState.DONE },
    };

    filterSpansSpy.mockClear();
    filterSpansSpy.mockImplementation(() => new Set());

    const { rerender } = render(<TracePage {...baseProps} />);
    expect(filterSpansSpy).not.toHaveBeenCalled();

    // Adding uiFind triggers filterSpans
    rerender(<TracePage {...baseProps} uiFind={uiFind} />);
    expect(filterSpansSpy).toHaveBeenCalledTimes(1);
    expect(filterSpansSpy).toHaveBeenLastCalledWith(uiFind, baseProps.trace.data.spans);

    // Changing the trace id invalidates the cache
    const otherTrace = transformTraceData(traceGenerator.trace({}));
    const newProps = {
      ...baseProps,
      id: 'different-trace-id',
      trace: { data: otherTrace, state: fetchedState.DONE },
    };
    rerender(<TracePage {...newProps} uiFind={uiFind} />);
    expect(filterSpansSpy).toHaveBeenCalledTimes(2);
    expect(filterSpansSpy).toHaveBeenLastCalledWith(uiFind, otherTrace.spans);

    // Same id with different spans should use cached result
    // (spans.length is not part of the cache key because
    // transformTraceData completes synchronously before Redux stores the trace)
    const reducedSpans = baseProps.trace.data.spans.slice(0, baseProps.trace.data.spans.length / 2);
    const newTrace2 = {
      ...baseProps.trace,
      data: {
        ...baseProps.trace.data,
        spans: reducedSpans,
      },
    };
    rerender(<TracePage {...baseProps} uiFind={uiFind} trace={newTrace2} />);
    expect(filterSpansSpy).toHaveBeenCalledTimes(2);
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

  it('renders without error when given uppercase id', () => {
    // URL normalization is handled by the useNormalizeTraceId hook in the wrapper.
    // This test verifies TracePageImpl renders successfully with uppercase IDs.
    const props = {
      ...defaultProps,
      id: trace.traceID.toUpperCase(),
    };
    expect(() => render(<TracePage {...props} />)).not.toThrow();
    expect(document.querySelector('.Tracepage--headerSection')).toBeInTheDocument();
  });

  it('focuses on search bar when there is a search bar and focusOnSearchBar is called', () => {
    const focus = jest.fn();
    render(<TracePage {...defaultProps} />);
    capturedHeaderProps.ref.current = { focus };
    const shortcutCallbacks = mergeShortcuts.mock.calls[0][0];
    shortcutCallbacks.searchSpans();
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('handles absent search bar when there is not a search bar and focusOnSearchBar is called', () => {
    render(<TracePage {...defaultProps} />);
    capturedHeaderProps.ref.current = null;
    const shortcutCallbacks = mergeShortcuts.mock.calls[0][0];
    expect(() => shortcutCallbacks.searchSpans()).not.toThrow();
  });

  it('fetches the trace if necessary', () => {
    const fetchTrace = jest.fn();
    render(<TracePage {...defaultProps} trace={null} fetchTrace={fetchTrace} />);
    expect(fetchTrace).toHaveBeenCalled();
    expect(fetchTrace).toHaveBeenCalledWith(trace.traceID);
  });

  it("doesn't fetch the trace if already present", () => {
    const fetchTrace = jest.fn();
    render(<TracePage {...defaultProps} fetchTrace={fetchTrace} />);
    expect(fetchTrace).not.toHaveBeenCalled();
  });

  it('resets the view range when the trace changes', () => {
    const altTrace = { ...trace, traceID: 'some-other-id' };

    const { rerender } = render(<TracePage {...defaultProps} />);

    act(() => {
      capturedHeaderProps.updateViewRangeTime(0.25, 0.75);
    });
    expect(capturedHeaderProps.viewRange.time.current).toEqual([0.25, 0.75]);

    rerender(
      <TracePage
        {...defaultProps}
        id={altTrace.traceID}
        trace={{ data: altTrace, state: fetchedState.DONE }}
      />
    );

    expect(capturedHeaderProps.viewRange.time.current).toEqual([0, 1]);
  });

  it('calls scrollManager.setTrace when trace data changes', () => {
    const setTraceMock = jest.fn();

    ScrollManager.mockImplementation(function () {
      return {
        scrollToNextVisibleSpan: jest.fn(),
        scrollToPrevVisibleSpan: jest.fn(),
        setAccessors: jest.fn(),
        scrollToFirstVisibleSpan: jest.fn(),
        destroy: jest.fn(),
        setTrace: setTraceMock,
      };
    });

    const { rerender } = render(<TracePage {...defaultProps} trace={null} />);
    rerender(<TracePage {...defaultProps} trace={{ data: trace, state: fetchedState.DONE }} />);

    expect(setTraceMock).toHaveBeenCalledWith(trace.asOtelTrace());
  });

  it('calls resetShortcuts, cancelScroll, and scrollManager.destroy on unmount', () => {
    const destroyMock = jest.fn();
    const scrollManagerMock = {
      scrollToNextVisibleSpan: jest.fn(),
      scrollToPrevVisibleSpan: jest.fn(),
      setAccessors: jest.fn(),
      scrollToFirstVisibleSpan: jest.fn(),
      destroy: destroyMock,
      setTrace: jest.fn(),
    };

    ScrollManager.mockImplementation(function () {
      return scrollManagerMock;
    });

    const resetShortcutsMock = jest.spyOn(keyboardShortcutsMod, 'reset');
    const cancelScrollMock = jest.spyOn(scrollPageMod, 'cancel');

    const { unmount } = render(<TracePage {...defaultProps} />);
    unmount();

    expect(resetShortcutsMock).toHaveBeenCalled();
    expect(cancelScrollMock).toHaveBeenCalled();
    expect(destroyMock).toHaveBeenCalled();
  });

  it('sets up keyboard shortcuts including adjViewRange in componentDidMount', () => {
    mergeShortcuts.mockClear();
    track.trackRange.mockClear();

    render(<TracePage {...defaultProps} />);

    expect(mergeShortcuts).toHaveBeenCalledTimes(1);
    const callbacks = mergeShortcuts.mock.calls[0][0];

    const mockEvent = { preventDefault: jest.fn() };
    act(() => {
      callbacks.panLeft(mockEvent);
    });

    expect(track.trackRange).toHaveBeenCalledWith('kbd', expect.any(Array), [0, 1]);
  });

  it('computes graphFindMatches and sets findCount based on traceDagEV when viewType is TraceGraph', () => {
    const mockVertices = [{ key: 'v1' }, { key: 'v2' }];
    const mockMatches = new Set(['v1']);

    calculateTraceDagEV.default.mockReturnValue({ vertices: mockVertices });
    const getUiFindVertexKeysSpy = jest
      .spyOn(getUiFindVertexKeys, 'getUiFindVertexKeys')
      .mockReturnValue(mockMatches);

    render(<TracePage {...defaultProps} uiFind="some-search" />);

    act(() => {
      capturedHeaderProps.onTraceViewChange(ETraceViewType.TraceGraph);
    });

    expect(getUiFindVertexKeysSpy).toHaveBeenCalledWith('some-search', mockVertices);
    expect(capturedHeaderProps.resultCount).toBe(1);

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
        renderWithRouter(<TracePage {...defaultProps} />);

        act(() => {
          capturedHeaderProps.onTraceViewChange(ETraceViewType.TraceGraph);
        });

        const spanGraph = screen.queryByTestId('span-graph');
        expect(spanGraph).not.toBeInTheDocument();
      });

      it('is true if embedded indicates it should be', () => {
        useEmbeddedStateMock.mockReturnValue({
          version: 'v0',
          searchHideGraph: false,
          timeline: { collapseTitle: false, hideMinimap: true, hideSummary: false },
        });
        renderWithRouter(<TracePage {...defaultProps} />);

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
        useEmbeddedStateMock.mockReturnValue({
          version: 'v0',
          searchHideGraph: false,
          timeline: { collapseTitle: false, hideMinimap: false, hideSummary: true },
        });
        renderWithRouter(<TracePage {...defaultProps} />);

        expect(capturedHeaderProps.hideSummary).toBe(true);
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
      it('sets showStandaloneLink and showViewOptions correctly', () => {
        const getEmbeddedState = embedded => {
          const isEmbedded = Boolean(embedded);
          return {
            isEmbedded,
            showStandaloneLink: isEmbedded,
            showViewOptions: !isEmbedded,
          };
        };

        const results = [getEmbeddedState(undefined), getEmbeddedState({ timeline: {} })];

        expect(results[0].isEmbedded).toBe(false);
        expect(results[0].showStandaloneLink).toBe(false);
        expect(results[0].showViewOptions).toBe(true);

        expect(results[1].isEmbedded).toBe(true);
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
      it(`${message}`, () => {
        const [start, end] = computeAdjustedRange(timeViewRange[0], timeViewRange[1], change[0], change[1]);
        expect([start, end]).toEqual(result);
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

    it('calls store.acknowledge when ArchiveNotifier acknowledges', () => {
      render(<TracePage {...defaultProps} archiveEnabled />);
      capturedArchiveNotifierProps.acknowledge();
      expect(mockAcknowledge).toHaveBeenCalledWith(defaultProps.id);
    });

    it('calls store.submitTraceToArchive when archiveTrace is called', () => {
      render(<TracePage {...defaultProps} />);
      capturedHeaderProps.onArchiveClicked();
      expect(mockSubmitTraceToArchive).toHaveBeenCalledWith(defaultProps.id);
    });
  });

  describe('layout toggle handlers', () => {
    beforeEach(() => {
      defaultProps.setDetailPanelMode.mockClear();
      defaultProps.setTimelineBarsVisible.mockClear();
      mockSetDetailPanelMode.mockClear();
      mockLayoutPrefsStore.setTimelineBarsVisible.mockClear();
    });

    it('calls setDetailPanelMode (Zustand + Redux) with sidepanel when detailPanelMode is inline', () => {
      mockLayoutPrefsStore.detailPanelMode = 'inline';
      render(<TracePage {...defaultProps} />);
      capturedHeaderProps.onDetailPanelModeToggle();
      expect(mockSetDetailPanelMode).toHaveBeenCalledWith('sidepanel');
      expect(defaultProps.setDetailPanelMode).toHaveBeenCalledWith('sidepanel');
    });

    it('calls setDetailPanelMode (Zustand + Redux) with inline when detailPanelMode is sidepanel', () => {
      mockLayoutPrefsStore.detailPanelMode = 'sidepanel';
      render(<TracePage {...defaultProps} />);
      capturedHeaderProps.onDetailPanelModeToggle();
      expect(mockSetDetailPanelMode).toHaveBeenCalledWith('inline');
      expect(defaultProps.setDetailPanelMode).toHaveBeenCalledWith('inline');
    });

    it('calls setTimelineBarsVisible (Zustand + Redux) with false when timelineBarsVisible is true', () => {
      mockLayoutPrefsStore.timelineBarsVisible = true;
      render(<TracePage {...defaultProps} />);
      capturedHeaderProps.onTimelineToggle();
      expect(mockLayoutPrefsStore.setTimelineBarsVisible).toHaveBeenCalledWith(false);
      expect(defaultProps.setTimelineBarsVisible).toHaveBeenCalledWith(false);
    });

    it('calls setTimelineBarsVisible (Zustand + Redux) with true when timelineBarsVisible is false', () => {
      mockLayoutPrefsStore.timelineBarsVisible = false;
      render(<TracePage {...defaultProps} />);
      capturedHeaderProps.onTimelineToggle();
      expect(mockLayoutPrefsStore.setTimelineBarsVisible).toHaveBeenCalledWith(true);
      expect(defaultProps.setTimelineBarsVisible).toHaveBeenCalledWith(true);
    });
  });

  describe('manages various UI state', () => {
    beforeAll(() => {
      calculateTraceDagEV.default.mockClear();
    });

    it('propagates headerHeight changes', () => {
      jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100);
      render(<TracePage {...defaultProps} />);

      const section = document.querySelector('section');
      expect(section).toBeInTheDocument();
      expect(section.style.paddingTop).toBe('100px');

      jest.restoreAllMocks();
    });

    it('initializes slimView correctly', () => {
      const { unmount } = render(<TracePage {...defaultProps} />);
      expect(capturedHeaderProps.slimView).toBe(false);
      unmount();

      useEmbeddedStateMock.mockReturnValue({
        version: 'v0',
        searchHideGraph: false,
        timeline: { collapseTitle: true, hideMinimap: false, hideSummary: false },
      });
      render(<TracePage {...defaultProps} />);
      expect(capturedHeaderProps.slimView).toBe(true);
    });

    it('propagates slimView changes', () => {
      trackSlimHeaderToggle.mockClear();

      render(<TracePage {...defaultProps} />);

      expect(capturedHeaderProps.slimView).toBe(false);

      act(() => {
        capturedHeaderProps.onSlimViewClicked();
      });

      expect(capturedHeaderProps.slimView).toBe(true);
      expect(trackSlimHeaderToggle).toHaveBeenCalledWith(true);
    });

    it('propagates traceView changes', () => {
      calculateTraceDagEV.default.mockClear();

      render(<TracePage {...defaultProps} />);

      act(() => {
        capturedHeaderProps.onTraceViewChange(ETraceViewType.TraceGraph);
      });
      expect(capturedHeaderProps.viewType).toBe(ETraceViewType.TraceGraph);
      expect(calculateTraceDagEV.default).toHaveBeenCalledWith(defaultProps.trace.data.asOtelTrace());

      act(() => {
        capturedHeaderProps.onTraceViewChange(ETraceViewType.TraceSpansView);
      });
      expect(capturedHeaderProps.viewType).toBe(ETraceViewType.TraceSpansView);

      act(() => {
        capturedHeaderProps.onTraceViewChange(ETraceViewType.TraceStatistics);
      });
      expect(capturedHeaderProps.viewType).toBe(ETraceViewType.TraceStatistics);
    });

    it('updates viewRange', () => {
      track.trackRange.mockClear();

      render(<TracePage {...defaultProps} />);

      act(() => {
        capturedHeaderProps.updateViewRangeTime(0.25, 0.75, 'test-source');
      });

      expect(capturedHeaderProps.viewRange.time.current).toEqual([0.25, 0.75]);
      expect(track.trackRange).toHaveBeenCalledWith('test-source', [0.25, 0.75], [0, 1]);
    });

    it('updates next view range time', () => {
      render(<TracePage {...defaultProps} />);

      const update = { cursor: 0.5 };
      act(() => {
        capturedHeaderProps.updateNextViewRangeTime(update);
      });

      expect(capturedHeaderProps.viewRange.time).toEqual({
        current: [0, 1],
        cursor: 0.5,
      });
    });
  });

  describe('renders different view types', () => {
    let clientHeightSpy;

    beforeEach(() => {
      clientHeightSpy = jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100);
    });

    afterEach(() => {
      clientHeightSpy.mockRestore();
    });

    it('renders TraceTimelineViewer when viewType is TraceTimelineViewer and headerHeight exists', () => {
      render(<TracePage {...defaultProps} />);
      expect(screen.getByTestId('mock-timeline-viewer')).toBeInTheDocument();
    });

    it('renders TraceGraph when viewType is TraceGraph and headerHeight exists', () => {
      render(<TracePage {...defaultProps} />);
      act(() => {
        capturedHeaderProps.onTraceViewChange(ETraceViewType.TraceGraph);
      });
      expect(screen.getByTestId('mock-trace-graph')).toBeInTheDocument();
    });

    it('renders TraceStatistics when viewType is TraceStatistics and headerHeight exists', () => {
      render(<TracePage {...defaultProps} />);
      act(() => {
        capturedHeaderProps.onTraceViewChange(ETraceViewType.TraceStatistics);
      });
      expect(screen.getByTestId('mock-trace-statistics')).toBeInTheDocument();
    });

    it('renders TraceSpanView when viewType is TraceSpansView and headerHeight exists', () => {
      render(<TracePage {...defaultProps} />);
      act(() => {
        capturedHeaderProps.onTraceViewChange(ETraceViewType.TraceSpansView);
      });
      expect(screen.getByTestId('mock-trace-span-view')).toBeInTheDocument();
    });

    it('renders TraceFlamegraph when viewType is TraceFlamegraph and headerHeight exists', () => {
      render(<TracePage {...defaultProps} />);
      act(() => {
        capturedHeaderProps.onTraceViewChange(ETraceViewType.TraceFlamegraph);
      });
      expect(screen.getByTestId('mock-trace-flamegraph')).toBeInTheDocument();
    });

    it('renders TraceLogsView when viewType is TraceLogs and headerHeight exists', () => {
      render(<TracePage {...defaultProps} />);
      act(() => {
        capturedHeaderProps.onTraceViewChange(ETraceViewType.TraceLogs);
      });
      expect(screen.getByTestId('mock-trace-logs-view')).toBeInTheDocument();
    });

    it('does not render view content when headerHeight is null', () => {
      clientHeightSpy.mockRestore();
      clientHeightSpy = jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(0);

      render(<TracePage {...defaultProps} />);

      expect(screen.queryByTestId('mock-timeline-viewer')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-trace-graph')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-trace-statistics')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-trace-span-view')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-trace-flamegraph')).not.toBeInTheDocument();
    });
  });
});

describe('mapDispatchToProps()', () => {
  it('creates the actions correctly', () => {
    expect(mapDispatchToProps(() => {})).toEqual({
      fetchTrace: expect.any(Function),
      focusUiFindMatches: expect.any(Function),
      setDetailPanelMode: expect.any(Function),
      setTimelineBarsVisible: expect.any(Function),
    });
  });
});

describe('mapStateToProps()', () => {
  const traceID = 'trace-id';
  const trace = {};
  const ownProps = {
    params: { id: traceID },
  };
  let state;
  beforeEach(() => {
    state = {
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
      traceTimeline: {},
    };
  });
  it('maps state to props correctly', () => {
    const props = mapStateToProps(state, ownProps);
    expect(props).toEqual({
      id: traceID,
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
        id: '',
        trace: null,
      })
    );
  });

  it('returns the correct props shape', () => {
    const props = mapStateToProps(state, ownProps);
    expect(props).toEqual({
      id: traceID,
      uiFind: undefined,
      trace: { data: {}, state: fetchedState.DONE },
    });
  });
});
