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

const { mockLayoutPrefsStore, mockTraceTimelineStore } = vi.hoisted(() => ({
  mockLayoutPrefsStore: {
    spanNameColumnWidth: 0.25,
    sidePanelWidth: 0.375,
    detailPanelMode: 'inline',
    timelineBarsVisible: true,
    setSpanNameColumnWidth: vi.fn(),
    setSidePanelWidth: vi.fn(),
    setTimelineBarsVisible: vi.fn(),
  },
  mockTraceTimelineStore: {
    detailStates: new Map(),
    collapseAll: vi.fn(),
    collapseOne: vi.fn(),
    expandAll: vi.fn(),
    expandOne: vi.fn(),
  },
}));

vi.mock('./store', () => ({
  useLayoutPrefsStore: vi.fn(selector => selector(mockLayoutPrefsStore)),
  useTraceTimelineStore: vi.fn(selector => selector(mockTraceTimelineStore)),
  getSelectedSpanID: detailStatesArg =>
    detailStatesArg.size > 0 ? detailStatesArg.keys().next().value : null,
  SPAN_NAME_COLUMN_WIDTH_MIN: 0.15,
  SPAN_NAME_COLUMN_WIDTH_MAX: 0.85,
  SIDE_PANEL_WIDTH_MIN: 0.2,
  SIDE_PANEL_WIDTH_MAX: 0.7,
  MIN_TIMELINE_COLUMN_WIDTH: 0.05,
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
    <div data-testid="timeline-header-row-mock" data-side-panel-label={props.sidePanelLabel}>
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
    jest.spyOn(KeyboardShortcuts, 'merge').mockClear();
  });

  afterEach(() => {
    KeyboardShortcuts.merge.mockRestore();
  });

  it('does not explode', () => {
    render(<TraceTimelineViewerImpl {...props} />);
    renderWithRedux(<TraceTimelineViewer {...props} />);
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
        const resizerExpected = sidePanelActive && timelineBarsVisible;

        if (sidePanelActive) {
          expect(screen.getByTestId('span-detail-side-panel-mock')).toBeInTheDocument();
        } else {
          expect(screen.queryByTestId('span-detail-side-panel-mock')).not.toBeInTheDocument();
        }

        if (resizerExpected) {
          expect(screen.getByTestId('vertical-resizer-mock')).toBeInTheDocument();
        } else {
          expect(screen.queryByTestId('vertical-resizer-mock')).not.toBeInTheDocument();
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

    it('renders a VerticalResizer between main and side panel when timeline bars are visible', () => {
      render(<TraceTimelineViewerImpl {...props} />);
      expect(screen.getByTestId('vertical-resizer-mock')).toBeInTheDocument();
    });

    it('does not render a VerticalResizer when timeline bars are hidden', () => {
      mockLayoutPrefsStore.timelineBarsVisible = false;
      render(<TraceTimelineViewerImpl {...props} />);
      expect(screen.queryByTestId('vertical-resizer-mock')).not.toBeInTheDocument();
    });

    it('calls setSidePanelWidth (Zustand + Redux) when the VerticalResizer onChange fires', () => {
      render(<TraceTimelineViewerImpl {...props} />);
      fireEvent.click(screen.getByTestId('vertical-resizer-change'));
      // onChange receives newPosition=0.7 → setSidePanelWidth(1 - 0.7 ≈ 0.3)
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
  });
});
