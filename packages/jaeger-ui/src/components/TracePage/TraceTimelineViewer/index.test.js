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
  const trace = transformTraceData(traceGenerator.trace({ numberOfSpans: 5 }));
  const props = {
    trace,
    textFilter: null,
    viewRange: {
      time: {
        current: [0, 1],
      },
    },
    spanNameColumnWidth: 0.5,
    expandAll: jest.fn(),
    collapseAll: jest.fn(),
    expandOne: jest.fn(),
    collapseOne: jest.fn(),
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
});
