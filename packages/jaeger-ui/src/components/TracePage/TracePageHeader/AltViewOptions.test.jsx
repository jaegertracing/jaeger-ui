// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import AltViewOptions from './AltViewOptions';
import * as track from './TracePageHeader.track';
import { ETraceViewType } from '../types';

vi.mock('antd', async () => {
  const originalModule = await vi.importActual('antd');
  return {
    ...originalModule,
    Select: ({ value, onChange, options, 'data-testid': dataTestId }) => (
      <div data-testid={dataTestId || 'select'}>
        <div data-testid="select-value">{value}</div>
        <div data-testid="select-options">
          {options.map(item => (
            <div
              key={item.value}
              data-testid={`menu-item-${item.value}`}
              onClick={() => {
                if (onChange) {
                  onChange(item.value);
                }
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>
    ),
  };
});

describe('AltViewOptions', () => {
  let trackViewChange;
  let trackJsonView;
  let trackRawJsonView;
  let windowOpenSpy;

  let props;

  beforeEach(() => {
    props = {
      viewType: ETraceViewType.TraceTimelineViewer,
      traceID: 'test trace ID',
      onTraceViewChange: vi.fn(),
      disableJsonView: false,
    };
    trackViewChange = vi.spyOn(track, 'trackViewChange');
    trackJsonView = vi.spyOn(track, 'trackJsonView');
    trackRawJsonView = vi.spyOn(track, 'trackRawJsonView');
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  const renderComponent = (customProps = {}) => {
    const mergedProps = { ...props, ...customProps };
    return render(
      <BrowserRouter>
        <AltViewOptions {...mergedProps} />
      </BrowserRouter>
    );
  };

  it('renders select with the current view type', () => {
    renderComponent();
    const selectValue = screen.getByTestId('select-value');
    expect(selectValue).toHaveTextContent(ETraceViewType.TraceTimelineViewer);
  });

  it('shows all alternate view options', () => {
    renderComponent();

    // Since Select receives all options, they are all in the DOM.
    expect(screen.getByTestId('menu-item-TraceTimelineViewer')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-TraceGraph')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-TraceStatistics')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-TraceSpansView')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-TraceFlamegraph')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-TraceLogs')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-GenAITimelineViewer')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-trace-json')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-trace-json-unadjusted')).toBeInTheDocument();
  });

  it('always shows GenAI View regardless of trace type', () => {
    renderComponent();
    expect(screen.getByTestId('menu-item-GenAITimelineViewer')).toBeInTheDocument();
  });

  it('hides json links when disableJsonView is true', () => {
    renderComponent({ disableJsonView: true });

    expect(screen.queryByTestId('menu-item-trace-json')).not.toBeInTheDocument();
    expect(screen.queryByTestId('menu-item-trace-json-unadjusted')).not.toBeInTheDocument();

    expect(screen.getByTestId('menu-item-TraceGraph')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-TraceStatistics')).toBeInTheDocument();
  });

  it.each([
    [ETraceViewType.TraceGraph, 'menu-item-TraceGraph'],
    [ETraceViewType.TraceStatistics, 'menu-item-TraceStatistics'],
    [ETraceViewType.TraceSpansView, 'menu-item-TraceSpansView'],
    [ETraceViewType.TraceFlamegraph, 'menu-item-TraceFlamegraph'],
    [ETraceViewType.TraceLogs, 'menu-item-TraceLogs'],
    [ETraceViewType.GenAITimelineViewer, 'menu-item-GenAITimelineViewer'],
  ])('tracks and changes view for %s', (viewType, testId) => {
    renderComponent({ viewType: ETraceViewType.TraceTimelineViewer });
    fireEvent.click(screen.getByTestId(testId));
    expect(props.onTraceViewChange).toHaveBeenCalledWith(viewType);
    expect(trackViewChange).toHaveBeenCalledWith(viewType);
  });

  it('handles JSON view correctly', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('menu-item-trace-json'));

    expect(trackJsonView).toHaveBeenCalled();
    expect(windowOpenSpy).toHaveBeenCalledWith(
      '/api/traces/test trace ID?prettyPrint=true',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('handles unadjusted JSON view correctly', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('menu-item-trace-json-unadjusted'));

    expect(trackRawJsonView).toHaveBeenCalled();
    expect(windowOpenSpy).toHaveBeenCalledWith(
      '/api/traces/test trace ID?raw=true&prettyPrint=true',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('updates select value when view type changes', () => {
    const { rerender } = renderComponent({ viewType: ETraceViewType.TraceTimelineViewer });
    expect(screen.getByTestId('select-value')).toHaveTextContent(ETraceViewType.TraceTimelineViewer);

    const rerenderWithViewType = viewType => {
      rerender(
        <BrowserRouter>
          <AltViewOptions {...props} viewType={viewType} />
        </BrowserRouter>
      );
      expect(screen.getByTestId('select-value')).toHaveTextContent(viewType);
    };

    rerenderWithViewType(ETraceViewType.TraceGraph);
    rerenderWithViewType(ETraceViewType.TraceStatistics);
    rerenderWithViewType(ETraceViewType.TraceSpansView);
    rerenderWithViewType(ETraceViewType.TraceFlamegraph);
    rerenderWithViewType(ETraceViewType.TraceLogs);
  });
});
