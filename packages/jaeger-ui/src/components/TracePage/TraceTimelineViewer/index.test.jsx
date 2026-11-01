// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { legacy_createStore as createStore } from 'redux';
import { Provider } from 'react-redux';

import TraceTimelineViewer, { TraceTimelineViewerImpl } from './index';
import * as track from './store.track';
import * as KeyboardShortcuts from '../keyboard-shortcuts';
import traceGenerator from '../../../demo/trace-generators';
import transformTraceData from '../../../model/transform-trace-data';

const { mockLayoutPrefsStore, mockTraceTimelineStore, mockUseTraceTimelineStore } = vi.hoisted(() => {
  const mockTraceTimelineStore = {
    detailStates: new Map(),
    prunedServices: new Set(),
    setPrunedServices: vi.fn(),
    focusedSubtreeSpanID: null,
    collapseAll: vi.fn(),
    collapseOne: vi.fn(),
    expandAll: vi.fn(),
    expandOne: vi.fn(),
  };
  const mockUseTraceTimelineStore = Object.assign(
    vi.fn(selector => selector(mockTraceTimelineStore)),
    {
      getState: () => mockTraceTimelineStore,
      setState: vi.fn(partial => Object.assign(mockTraceTimelineStore, partial)),
    }
  );
  return {
    mockLayoutPrefsStore: {
      spanNameColumnWidth: 0.25,
      sidePanelWidth: 0.375,
      detailPanelMode: 'inline',
      timelineBarsVisible: true,
      setSpanNameColumnWidth: vi.fn(),
      setSidePanelWidth: vi.fn(),
      setTimelineBarsVisible: vi.fn(),
    },
    mockTraceTimelineStore,
    mockUseTraceTimelineStore,
  };
});

vi.mock('./store.track');

vi.mock('./store', () => ({
  useLayoutPrefsStore: vi.fn(selector => selector(mockLayoutPrefsStore)),
  useTraceTimelineStore: mockUseTraceTimelineStore,
  getSelectedSpanID: detailStatesArg =>
    detailStatesArg.size > 0 ? detailStatesArg.keys().next().value : null,
  SPAN_NAME_COLUMN_WIDTH_MIN: 0.15,
  SPAN_NAME_COLUMN_WIDTH_MAX: 0.85,
  SIDE_PANEL_WIDTH_MIN: 0.2,
  SIDE_PANEL_WIDTH_MAX: 0.7,
  MIN_TIMELINE_COLUMN_WIDTH: 0.05,
}));

const mockUseServiceFilter = vi.hoisted(() => ({
  prunedServices: new Set(),
  serviceFilterNode: null,
}));
vi.mock('./useServiceFilter', () => ({
  useServiceFilter: vi.fn(() => mockUseServiceFilter),
}));
const mockUseSpanPillsEnabled = vi.hoisted(() => vi.fn(() => true));
vi.mock('./spanPills', () => ({
  useSpanPillsEnabled: mockUseSpanPillsEnabled,
}));
vi.mock('./VirtualizedTraceView', () => mockDefault(() => <div data-testid="virtualized-trace-view-mock" />));
vi.mock('./SpanDetailSidePanel', () => mockDefault(() => <div data-testid="span-detail-side-panel-mock" />));
vi.mock('./TimelineHeaderRow', () =>
  mockDefault(props => (
    <div data-testid="timeline-header-row-mock" data-side-panel-label={props.sidePanelLabel}>
      {props.serviceFilterNode}
      <button
        data-testid="header-side-panel-change"
        type="button"
        onClick={() => props.onSidePanelWidthChange(0.3)}
      />
      <button data-testid="collapse-all-button" type="button" onClick={props.onCollapseAll}>
        Collapse All
      </button>
      <button data-testid="expand-all-button" type="button" onClick={props.onExpandAll}>
        Expand All
      </button>
      <button data-testid="collapse-one-button" type="button" onClick={props.onCollapseOne}>
        Collapse One
      </button>
      <button data-testid="expand-one-button" type="button" onClick={props.onExpandOne}>
        Expand One
      </button>
    </div>
  ))
);

describe('<TraceTimelineViewer>', () => {
  const legacyTrace = transformTraceData(traceGenerator.trace({ numberOfSpans: 5 }));
  const trace = legacyTrace.asOtelTrace();
  const props = {
    trace,
    textFilter: null,
    viewRange: {
      time: {
        current: [0, 1],
      },
    },
  };

  const defaultState = {
    traceTimeline: { detailStates: new Map() },
  };

  function renderWithRedux(ui, { initialState = defaultState } = {}) {
    const store = createStore((state = initialState) => state);

    return {
      ...render(<Provider store={store}>{ui}</Provider>),
      store,
    };
  }

  beforeEach(() => {
    vi.mocked(track.trackCollapseAll).mockClear();
    vi.mocked(track.trackCollapseOne).mockClear();
    vi.mocked(track.trackExpandAll).mockClear();
    vi.mocked(track.trackExpandOne).mockClear();
    vi.mocked(track.trackColumnWidth).mockClear();
    mockLayoutPrefsStore.setSpanNameColumnWidth.mockClear();
    mockLayoutPrefsStore.setSidePanelWidth.mockClear();
    mockTraceTimelineStore.collapseAll.mockClear();
    mockTraceTimelineStore.collapseOne.mockClear();
    mockTraceTimelineStore.expandAll.mockClear();
    mockTraceTimelineStore.expandOne.mockClear();
    mockLayoutPrefsStore.spanNameColumnWidth = 0.25;
    mockLayoutPrefsStore.sidePanelWidth = 0.375;
    mockLayoutPrefsStore.detailPanelMode = 'inline';
    mockLayoutPrefsStore.timelineBarsVisible = true;
    mockTraceTimelineStore.detailStates = new Map();
    mockTraceTimelineStore.focusedSubtreeSpanID = null;
    mockUseTraceTimelineStore.setState.mockClear();
    mockUseServiceFilter.prunedServices = new Set();
    mockUseServiceFilter.serviceFilterNode = null;
    mockUseSpanPillsEnabled.mockClear();
    jest.spyOn(KeyboardShortcuts, 'merge').mockClear();
  });

  afterEach(() => {
    KeyboardShortcuts.merge.mockRestore();
    mockTraceTimelineStore.focusedSubtreeSpanID = null;
  });

  it('does not explode', () => {
    render(<TraceTimelineViewerImpl {...props} />);
    expect(screen.getByTestId('virtualized-trace-view-mock')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-header-row-mock')).toBeInTheDocument();
    const initialCount = screen.getAllByTestId('virtualized-trace-view-mock').length;
    renderWithRedux(<TraceTimelineViewer {...props} />);
    expect(screen.getAllByTestId('virtualized-trace-view-mock')).toHaveLength(initialCount + 1);
  });

  it('derives selectedSpanID from Zustand detailStates', () => {
    // The root span is selected → selectedSpanID === rootSpanID → label should be 'Trace Root'.
    const spanID = trace.rootSpans[0].spanID;
    mockLayoutPrefsStore.detailPanelMode = 'sidepanel';
    mockLayoutPrefsStore.sidePanelWidth = 0.3;
    mockTraceTimelineStore.detailStates = new Map([[spanID, {}]]);
    render(<TraceTimelineViewerImpl {...props} />);
    // Side panel renders because detailPanelMode is 'sidepanel'.
    expect(screen.getByTestId('span-detail-side-panel-mock')).toBeInTheDocument();
    // selectedSpanID === rootSpanID → sidePanelLabel === 'Trace Root'.
    expect(screen.getByTestId('timeline-header-row-mock').dataset.sidePanelLabel).toBe('Trace Root');
  });

  it('realigns the side panel when the page header changes height', () => {
    mockLayoutPrefsStore.detailPanelMode = 'sidepanel';

    // Stands in for the padding TracePage puts above this view: the layout container sits at the
    // page header's height, which grows by the minimap when the timeline becomes the active view.
    let layoutTop = 80;
    const rectSpy = jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(() => ({ top: layoutTop, bottom: 0, left: 0, right: 0, height: 0, width: 0 }));

    try {
      const { container, rerender } = render(<TraceTimelineViewerImpl {...props} pageHeaderHeight={80} />);
      const panel = container.querySelector('.TraceTimelineViewer--sidePanel');
      // The header row height comes from the CSS variable, so the panel offsets the measured
      // container top by it rather than by a number known to JS.
      expect(panel.style.top).toBe('calc(80px + var(--timeline-header-row-height))');
      expect(panel.style.height).toBe('calc(100vh - 80px - var(--timeline-header-row-height))');

      layoutTop = 165;
      rerender(<TraceTimelineViewerImpl {...props} pageHeaderHeight={165} />);

      expect(panel.style.top).toBe('calc(165px + var(--timeline-header-row-height))');
      expect(panel.style.height).toBe('calc(100vh - 165px - var(--timeline-header-row-height))');
    } finally {
      rectSpy.mockRestore();
    }
  });

  it('sets up actions', () => {
    render(<TraceTimelineViewerImpl {...props} />);

    fireEvent.click(screen.getByTestId('collapse-all-button'));
    expect(track.trackCollapseAll).toHaveBeenCalledTimes(1);
    expect(mockTraceTimelineStore.collapseAll).toHaveBeenCalledWith(props.trace.spans);

    fireEvent.click(screen.getByTestId('expand-all-button'));
    expect(track.trackExpandAll).toHaveBeenCalledTimes(1);
    expect(mockTraceTimelineStore.expandAll).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('collapse-one-button'));
    expect(track.trackCollapseOne).toHaveBeenCalledTimes(1);
    expect(mockTraceTimelineStore.collapseOne).toHaveBeenCalledWith(props.trace.spans);

    fireEvent.click(screen.getByTestId('expand-one-button'));
    expect(track.trackExpandOne).toHaveBeenCalledTimes(1);
    expect(mockTraceTimelineStore.expandOne).toHaveBeenCalledWith(props.trace.spans);
  });

  it('scopes collapse and expand actions to focused subtree when focusedSubtreeSpanID is set', () => {
    // Select a non-root span to focus
    const focusedSpan = props.trace.spans[1];
    mockTraceTimelineStore.focusedSubtreeSpanID = focusedSpan.spanID;

    render(<TraceTimelineViewerImpl {...props} />);

    fireEvent.click(screen.getByTestId('collapse-all-button'));
    expect(mockTraceTimelineStore.collapseAll).toHaveBeenCalledWith(expect.arrayContaining([focusedSpan]));
    expect(mockTraceTimelineStore.collapseAll.mock.calls[0][0]).not.toEqual(props.trace.spans);

    fireEvent.click(screen.getByTestId('collapse-one-button'));
    expect(mockTraceTimelineStore.collapseOne).toHaveBeenCalledWith(expect.arrayContaining([focusedSpan]));
    expect(mockTraceTimelineStore.collapseOne.mock.calls[0][0]).not.toEqual(props.trace.spans);

    fireEvent.click(screen.getByTestId('expand-one-button'));
    expect(mockTraceTimelineStore.expandOne).toHaveBeenCalledWith(expect.arrayContaining([focusedSpan]));
    expect(mockTraceTimelineStore.expandOne.mock.calls[0][0]).not.toEqual(props.trace.spans);

    mockTraceTimelineStore.focusedSubtreeSpanID = null;
  });

  it('tracks each header action before updating the store', () => {
    render(<TraceTimelineViewerImpl {...props} />);
    const cases = [
      ['collapse-all-button', track.trackCollapseAll, mockTraceTimelineStore.collapseAll],
      ['expand-all-button', track.trackExpandAll, mockTraceTimelineStore.expandAll],
      ['collapse-one-button', track.trackCollapseOne, mockTraceTimelineStore.collapseOne],
      ['expand-one-button', track.trackExpandOne, mockTraceTimelineStore.expandOne],
    ];
    cases.forEach(([testId, tracker, storeAction]) => {
      fireEvent.click(screen.getByTestId(testId));
      expect(tracker.mock.invocationCallOrder[0]).toBeLessThan(storeAction.mock.invocationCallOrder[0]);
    });
  });

  it('should call mergeShortcuts with the correct callbacks on mount', () => {
    render(<TraceTimelineViewerImpl {...props} />);
    expect(KeyboardShortcuts.merge).toHaveBeenCalledWith({
      collapseAll: expect.any(Function),
      expandAll: expect.any(Function),
      collapseOne: expect.any(Function),
      expandOne: expect.any(Function),
    });
  });

  it('should call mergeShortcuts when the trace spans change', () => {
    const { rerender } = render(<TraceTimelineViewerImpl {...props} />);
    KeyboardShortcuts.merge.mockClear();

    const newTrace = transformTraceData(traceGenerator.trace({ numberOfSpans: 5 })).asOtelTrace();
    rerender(<TraceTimelineViewerImpl {...props} trace={newTrace} />);

    expect(KeyboardShortcuts.merge).toHaveBeenCalledWith({
      collapseAll: expect.any(Function),
      expandAll: expect.any(Function),
      collapseOne: expect.any(Function),
      expandOne: expect.any(Function),
    });
  });

  describe('layout combinations', () => {
    const combinations = [
      { detailPanelMode: 'inline', timelineBarsVisible: true },
      { detailPanelMode: 'inline', timelineBarsVisible: false },
      { detailPanelMode: 'sidepanel', timelineBarsVisible: true },
      { detailPanelMode: 'sidepanel', timelineBarsVisible: false },
    ];

    combinations.forEach(({ detailPanelMode, timelineBarsVisible }) => {
      it(`detailPanelMode=${detailPanelMode}, timelineBarsVisible=${timelineBarsVisible}`, () => {
        mockLayoutPrefsStore.detailPanelMode = detailPanelMode;
        mockLayoutPrefsStore.timelineBarsVisible = timelineBarsVisible;
        render(<TraceTimelineViewerImpl {...props} />);

        const sidePanelActive = detailPanelMode === 'sidepanel';

        if (sidePanelActive) {
          expect(screen.getByTestId('span-detail-side-panel-mock')).toBeInTheDocument();
        } else {
          expect(screen.queryByTestId('span-detail-side-panel-mock')).not.toBeInTheDocument();
        }

        // VirtualizedTraceView is always rendered.
        expect(screen.getByTestId('virtualized-trace-view-mock')).toBeInTheDocument();
      });
    });
  });

  describe('side panel mode', () => {
    beforeEach(() => {
      mockLayoutPrefsStore.detailPanelMode = 'sidepanel';
      mockLayoutPrefsStore.timelineBarsVisible = true;
    });

    it('renders the side panel layout when detailPanelMode is sidepanel', () => {
      render(<TraceTimelineViewerImpl {...props} />);
      expect(screen.getByTestId('span-detail-side-panel-mock')).toBeInTheDocument();
      expect(screen.getByTestId('virtualized-trace-view-mock')).toBeInTheDocument();
    });

    it('calls setSidePanelWidth (Zustand + tracking) when the header width changes', () => {
      render(<TraceTimelineViewerImpl {...props} />);
      fireEvent.click(screen.getByTestId('header-side-panel-change'));
      expect(mockLayoutPrefsStore.setSidePanelWidth).toHaveBeenCalledTimes(1);
      expect(mockLayoutPrefsStore.setSidePanelWidth.mock.calls[0][0]).toBeCloseTo(0.3);
      expect(track.trackColumnWidth).toHaveBeenCalledTimes(1);
      expect(vi.mocked(track.trackColumnWidth).mock.calls[0][0]).toBeCloseTo(0.3);
    });

    it('uses "Trace Root" label when no span is selected (empty detailStates)', () => {
      render(<TraceTimelineViewerImpl {...props} />);
      expect(screen.getByTestId('timeline-header-row-mock').dataset.sidePanelLabel).toBe('Trace Root');
    });

    it('uses "Span Details" label when a non-root span is selected', () => {
      const nonRootSpanID = trace.spans[1]?.spanID ?? 'some-span';
      mockTraceTimelineStore.detailStates = new Map([[nonRootSpanID, {}]]);
      render(<TraceTimelineViewerImpl {...props} />);
      expect(screen.getByTestId('timeline-header-row-mock').dataset.sidePanelLabel).toBe('Span Details');
    });

    // Side panel cleanup when a selected span's service is pruned is tested
    // in useServiceFilter.test.ts (the hook owns that logic now).
  });
});
