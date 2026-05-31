// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { legacy_createStore as createStore } from 'redux';
import { Provider } from 'react-redux';

import TraceTimelineViewer, { TraceTimelineViewerImpl } from './index';
import * as KeyboardShortcuts from '../keyboard-shortcuts';
import traceGenerator from '../../../demo/trace-generators';
import transformTraceData from '../../../model/transform-trace-data';

const { layoutConstants, mockLayoutPrefsStore, mockTraceTimelineStore, mockUseTraceTimelineStore } =
  vi.hoisted(() => {
    const layoutConstants = {
      SPAN_NAME_COLUMN_WIDTH_MIN: 0.15,
      SPAN_NAME_COLUMN_WIDTH_MAX: 0.85,
      SIDE_PANEL_WIDTH_MIN: 0.2,
      SIDE_PANEL_WIDTH_MAX: 0.7,
      MIN_TIMELINE_COLUMN_WIDTH: 0.05,
    };
    const mockTraceTimelineStore = {
      detailStates: new Map(),
      prunedServices: new Set(),
      setPrunedServices: vi.fn(),
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
      layoutConstants,
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

vi.mock('./store', () => ({
  useLayoutPrefsStore: vi.fn(selector => selector(mockLayoutPrefsStore)),
  useTraceTimelineStore: mockUseTraceTimelineStore,
  getSelectedSpanID: detailStatesArg =>
    detailStatesArg.size > 0 ? detailStatesArg.keys().next().value : null,
  ...layoutConstants,
}));
vi.mock('./duck', () => ({
  actions: {
    setSpanNameColumnWidth: width => ({ type: 'setSpanNameColumnWidth', width }),
    setSidePanelWidth: width => ({ type: 'setSidePanelWidth', width }),
    expandAll: () => ({ type: 'expandAll' }),
    expandOne: spans => ({ type: 'expandOne', spans }),
    collapseAll: spans => ({ type: 'collapseAll', spans }),
    collapseOne: spans => ({ type: 'collapseOne', spans }),
  },
}));

const mockUseServiceFilter = vi.hoisted(() => ({
  prunedServices: new Set(),
  serviceFilterNode: null,
}));
vi.mock('./useServiceFilter', () => ({
  useServiceFilter: vi.fn(() => mockUseServiceFilter),
}));
vi.mock('./VirtualizedTraceView', () => mockDefault(() => <div data-testid="virtualized-trace-view-mock" />));
vi.mock('./SpanDetailSidePanel', () => mockDefault(() => <div data-testid="span-detail-side-panel-mock" />));
vi.mock('../../common/VerticalResizer', () => ({
  default: ({ onChange }) => (
    <div data-testid="vertical-resizer-mock">
      <button data-testid="vertical-resizer-change" type="button" onClick={() => onChange && onChange(0.7)} />
    </div>
  ),
}));
vi.mock('./TimelineHeaderRow', () =>
  mockDefault(props => (
    <div
      data-testid="timeline-header-row-mock"
      data-side-panel-label={props.sidePanelLabel}
      data-side-panel-resizer-min={props.sidePanelResizerMin}
      data-side-panel-resizer-max={props.sidePanelResizerMax}
    >
      {props.serviceFilterNode}
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
      <button
        data-testid="side-panel-resizer-change"
        type="button"
        onClick={() => props.onSidePanelWidthChange && props.onSidePanelWidthChange(0.3)}
      />
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
    expandAll: jest.fn(),
    collapseAll: jest.fn(),
    expandOne: jest.fn(),
    collapseOne: jest.fn(),
    setSpanNameColumnWidth: jest.fn(),
    setSidePanelWidth: jest.fn(),
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

  function withLayoutPrefs(updates, callback) {
    const previous = Object.fromEntries(Object.keys(updates).map(key => [key, mockLayoutPrefsStore[key]]));
    Object.assign(mockLayoutPrefsStore, updates);
    try {
      return callback();
    } finally {
      Object.assign(mockLayoutPrefsStore, previous);
    }
  }

  beforeEach(() => {
    props.expandAll.mockClear();
    props.collapseAll.mockClear();
    props.expandOne.mockClear();
    props.collapseOne.mockClear();
    props.setSpanNameColumnWidth.mockClear();
    props.setSidePanelWidth.mockClear();
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
    mockUseTraceTimelineStore.setState.mockClear();
    mockUseServiceFilter.prunedServices = new Set();
    mockUseServiceFilter.serviceFilterNode = null;
    jest.spyOn(KeyboardShortcuts, 'merge').mockClear();
  });

  afterEach(() => {
    KeyboardShortcuts.merge.mockRestore();
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

  it('sets up actions', () => {
    render(<TraceTimelineViewerImpl {...props} />);

    fireEvent.click(screen.getByTestId('collapse-all-button'));
    expect(props.collapseAll).toHaveBeenCalledWith(props.trace.spans);
    expect(mockTraceTimelineStore.collapseAll).toHaveBeenCalledWith(props.trace.spans);

    fireEvent.click(screen.getByTestId('expand-all-button'));
    expect(props.expandAll).toHaveBeenCalledTimes(1);
    expect(mockTraceTimelineStore.expandAll).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('collapse-one-button'));
    expect(props.collapseOne).toHaveBeenCalledWith(props.trace.spans);
    expect(mockTraceTimelineStore.collapseOne).toHaveBeenCalledWith(props.trace.spans);

    fireEvent.click(screen.getByTestId('expand-one-button'));
    expect(props.expandOne).toHaveBeenCalledWith(props.trace.spans);
    expect(mockTraceTimelineStore.expandOne).toHaveBeenCalledWith(props.trace.spans);
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

  it('should call mergeShortcuts when callback props change', () => {
    const { rerender } = render(<TraceTimelineViewerImpl {...props} />);
    KeyboardShortcuts.merge.mockClear();

    const newCollapseAll = jest.fn();
    rerender(<TraceTimelineViewerImpl {...props} collapseAll={newCollapseAll} />);

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

        expect(screen.queryByTestId('vertical-resizer-mock')).not.toBeInTheDocument();

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

    it('does not render a body VerticalResizer between main and side panel when timeline bars are visible', () => {
      render(<TraceTimelineViewerImpl {...props} />);
      expect(screen.queryByTestId('vertical-resizer-mock')).not.toBeInTheDocument();
    });

    it('passes side panel resizer bounds to the header row', () => {
      render(<TraceTimelineViewerImpl {...props} />);
      const header = screen.getByTestId('timeline-header-row-mock');
      const resizerMin = Number(header.dataset.sidePanelResizerMin);
      const resizerMax = Number(header.dataset.sidePanelResizerMax);
      const expectedMax = 1 - layoutConstants.SIDE_PANEL_WIDTH_MIN;
      const expectedMin = Math.min(
        1 -
          Math.min(
            layoutConstants.SIDE_PANEL_WIDTH_MAX,
            1 - mockLayoutPrefsStore.spanNameColumnWidth - layoutConstants.MIN_TIMELINE_COLUMN_WIDTH
          ),
        expectedMax
      );

      expect(resizerMin).toBeCloseTo(expectedMin);
      expect(resizerMax).toBeCloseTo(expectedMax);
      expect(resizerMin).toBeLessThanOrEqual(resizerMax);
    });

    it('computes side panel resizer bounds from the effective header name width', () => {
      withLayoutPrefs({ spanNameColumnWidth: 0.7, sidePanelWidth: 0.4 }, () => {
        render(<TraceTimelineViewerImpl {...props} />);
        const header = screen.getByTestId('timeline-header-row-mock');
        const mainFraction = 1 - mockLayoutPrefsStore.sidePanelWidth;
        const effectiveHeaderNameWidth =
          Math.min(mockLayoutPrefsStore.spanNameColumnWidth / mainFraction, 1) * mainFraction;
        const expectedMin = Math.min(
          1 -
            Math.min(
              layoutConstants.SIDE_PANEL_WIDTH_MAX,
              1 - effectiveHeaderNameWidth - layoutConstants.MIN_TIMELINE_COLUMN_WIDTH
            ),
          1 - layoutConstants.SIDE_PANEL_WIDTH_MIN
        );

        expect(Number(header.dataset.sidePanelResizerMin)).toBeCloseTo(expectedMin);
      });
    });

    it('does not render a VerticalResizer when timeline bars are hidden', () => {
      mockLayoutPrefsStore.timelineBarsVisible = false;
      render(<TraceTimelineViewerImpl {...props} />);
      expect(screen.queryByTestId('vertical-resizer-mock')).not.toBeInTheDocument();
    });

    it('calls setSidePanelWidth (Zustand + Redux) when the header side panel resizer onChange fires', () => {
      render(<TraceTimelineViewerImpl {...props} />);
      fireEvent.click(screen.getByTestId('side-panel-resizer-change'));
      // TimelineHeaderRow converts the resizer position to a side-panel width before calling back.
      expect(mockLayoutPrefsStore.setSidePanelWidth).toHaveBeenCalledTimes(1);
      expect(mockLayoutPrefsStore.setSidePanelWidth.mock.calls[0][0]).toBeCloseTo(0.3);
      expect(props.setSidePanelWidth).toHaveBeenCalledTimes(1);
      expect(props.setSidePanelWidth.mock.calls[0][0]).toBeCloseTo(0.3);
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
