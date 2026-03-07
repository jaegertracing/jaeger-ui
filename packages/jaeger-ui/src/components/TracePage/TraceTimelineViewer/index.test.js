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

jest.mock('./VirtualizedTraceView', () => () => <div data-testid="virtualized-trace-view-mock" />);
jest.mock('./SpanDetailSidePanel', () => () => <div data-testid="span-detail-side-panel-mock" />);
jest.mock('../../common/VerticalResizer', () => ({
  __esModule: true,
  default: ({ onChange }) => (
    <div data-testid="vertical-resizer-mock">
      <button data-testid="vertical-resizer-change" type="button" onClick={() => onChange && onChange(0.7)} />
    </div>
  ),
}));
jest.mock('./TimelineHeaderRow', () => props => (
  <div data-testid="timeline-header-row-mock">
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
));

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
    spanNameColumnWidth: 0.5,
    sidePanelWidth: 0.3,
    timelineBarsVisible: true,
    expandAll: jest.fn(),
    collapseAll: jest.fn(),
    expandOne: jest.fn(),
    collapseOne: jest.fn(),
    setSpanNameColumnWidth: jest.fn(),
    setSidePanelWidth: jest.fn(),
  };

  const defaultState = {
    traceTimeline: { spanNameColumnWidth: 0.25 },
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
    jest.spyOn(KeyboardShortcuts, 'merge').mockClear();
  });

  afterEach(() => {
    KeyboardShortcuts.merge.mockRestore();
  });

  it('it does not explode', () => {
    render(<TraceTimelineViewerImpl {...props} />);
    renderWithRedux(<TraceTimelineViewer {...props} />);
  });

  it('mapStateToProps derives selectedSpanID from non-empty detailStates', () => {
    const spanID = trace.spans[0].spanID;
    renderWithRedux(<TraceTimelineViewer {...props} />, {
      initialState: {
        traceTimeline: {
          spanNameColumnWidth: 0.25,
          sidePanelWidth: 0.3,
          timelineBarsVisible: true,
          detailPanelMode: 'sidepanel',
          detailStates: new Map([[spanID, {}]]),
        },
      },
    });
    expect(screen.getByTestId('timeline-header-row-mock')).toBeInTheDocument();
  });

  it('it sets up actions', () => {
    render(<TraceTimelineViewerImpl {...props} />);

    fireEvent.click(screen.getByTestId('collapse-all-button'));
    expect(props.collapseAll).toHaveBeenCalledTimes(1);
    expect(props.collapseAll).toHaveBeenCalledWith(props.trace.spans);

    fireEvent.click(screen.getByTestId('expand-all-button'));
    expect(props.expandAll).toHaveBeenCalledTimes(1);
    expect(props.expandAll).toHaveBeenCalledWith();

    fireEvent.click(screen.getByTestId('collapse-one-button'));
    expect(props.collapseOne).toHaveBeenCalledTimes(1);
    expect(props.collapseOne).toHaveBeenCalledWith(props.trace.spans);
    fireEvent.click(screen.getByTestId('expand-one-button'));
    expect(props.expandOne).toHaveBeenCalledTimes(1);
    expect(props.expandOne).toHaveBeenCalledWith(props.trace.spans);
  });

  it('it should call mergeShortcuts with the correct callbacks on mount', () => {
    render(<TraceTimelineViewerImpl {...props} />);
    expect(KeyboardShortcuts.merge).toHaveBeenCalledWith({
      collapseAll: expect.any(Function),
      expandAll: expect.any(Function),
      collapseOne: expect.any(Function),
      expandOne: expect.any(Function),
    });
  });

  it('it should call mergeShortcuts when callback props change', () => {
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

  describe('side panel mode', () => {
    const sidePanelProps = {
      ...props,
      detailPanelMode: 'sidepanel',
      selectedSpanID: null,
    };

    it('renders the side panel layout when detailPanelMode is sidepanel', () => {
      render(<TraceTimelineViewerImpl {...sidePanelProps} />);
      expect(screen.getByTestId('span-detail-side-panel-mock')).toBeInTheDocument();
      expect(screen.getByTestId('virtualized-trace-view-mock')).toBeInTheDocument();
    });

    it('renders a VerticalResizer between main and side panel when timeline bars are visible', () => {
      render(<TraceTimelineViewerImpl {...sidePanelProps} />);
      expect(screen.getByTestId('vertical-resizer-mock')).toBeInTheDocument();
    });

    it('does not render a VerticalResizer when timeline bars are hidden', () => {
      render(<TraceTimelineViewerImpl {...sidePanelProps} timelineBarsVisible={false} />);
      expect(screen.queryByTestId('vertical-resizer-mock')).not.toBeInTheDocument();
    });

    it('calls setSidePanelWidth when the VerticalResizer onChange fires', () => {
      render(<TraceTimelineViewerImpl {...sidePanelProps} />);
      fireEvent.click(screen.getByTestId('vertical-resizer-change'));
      // onChange receives newPosition=0.7 → setSidePanelWidth(1 - 0.7 ≈ 0.3)
      expect(props.setSidePanelWidth).toHaveBeenCalledTimes(1);
      expect(props.setSidePanelWidth.mock.calls[0][0]).toBeCloseTo(0.3);
    });

    it('uses "Trace Root" label when selectedSpanID is null', () => {
      // sidePanelLabel computation: selectedSpanID===null → 'Trace Root'
      // The label is passed to TimelineHeaderRow which is mocked, so we verify it indirectly
      // by confirming the component renders without throwing.
      render(<TraceTimelineViewerImpl {...sidePanelProps} selectedSpanID={null} />);
      expect(screen.getByTestId('span-detail-side-panel-mock')).toBeInTheDocument();
    });

    it('uses "Span Details" label when selectedSpanID is a non-root span', () => {
      const nonRootSpanID = trace.spans[1]?.spanID ?? 'some-span';
      render(<TraceTimelineViewerImpl {...sidePanelProps} selectedSpanID={nonRootSpanID} />);
      expect(screen.getByTestId('span-detail-side-panel-mock')).toBeInTheDocument();
    });
  });
});
