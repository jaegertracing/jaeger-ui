// Copyright (c) 2019 Uber Technologies, Inc.
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

import * as React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import AltViewOptions from './AltViewOptions';
import * as track from './TracePageHeader.track';
import { ETraceViewType } from '../types';

jest.mock('antd', () => {
  const originalModule = jest.requireActual('antd');
  return {
    ...originalModule,
    Dropdown: ({ children, menu }) => (
      <div data-testid="dropdown">
        {children}
        <div data-testid="dropdown-menu">
          {menu.items.map((item) => (
            <div key={item.key} data-testid={`menu-item-${item.key}`} onClick={() => {
              // Simulate clicking the link/button inside
              if (item.label?.props?.onClick) {
                item.label.props.onClick();
              }
            }}>
              {item.label}
            </div>
          ))}
        </div>
      </div>
    ),
    Button: ({ children, className }) => (
      <button className={className} data-testid="dropdown-button">
        {children}
      </button>
    ),
  };
});

describe('AltViewOptions', () => {
  let trackGanttView;
  let trackGraphView;
  let trackStatisticsView;
  let trackTraceSpansView;

  const props = {
    viewType: ETraceViewType.TraceTimelineViewer,
    traceID: 'test trace ID',
    onTraceViewChange: jest.fn(),
    disableJsonView: false,
  };

  beforeAll(() => {
    trackGanttView = jest.spyOn(track, 'trackGanttView');
    trackGraphView = jest.spyOn(track, 'trackGraphView');
    trackJsonView = jest.spyOn(track, 'trackJsonView');
    trackRawJsonView = jest.spyOn(track, 'trackRawJsonView');
    trackStatisticsView = jest.spyOn(track, 'trackStatisticsView');
    trackTraceSpansView = jest.spyOn(track, 'trackTraceSpansView');
  });

  afterEach(() => {
    jest.clearAllMocks();
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

  it('renders dropdown button displaying the current view type', () => {
    renderComponent();
    const button = screen.getByTestId('dropdown-button');
    expect(button).toHaveTextContent('Trace Timeline');
  });

  it('shows "Alternate Views" when viewType is not in MENU_ITEMS', () => {
    renderComponent({ viewType: 'UnknownViewType' });
    const button = screen.getByTestId('dropdown-button');
    expect(button).toHaveTextContent('Alternate Views');
  });

  it('shows all alternate view options except current view', () => {
    renderComponent();
    
    expect(screen.queryByTestId('menu-item-TraceTimelineViewer')).not.toBeInTheDocument();
    
    expect(screen.getByTestId('menu-item-TraceGraph')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-TraceStatistics')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-TraceSpansView')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-TraceFlamegraph')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-trace-json')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-trace-json-unadjusted')).toBeInTheDocument();
  });

  it('hides json links when disableJsonView is true', () => {
    renderComponent({ disableJsonView: true });
    
    expect(screen.queryByTestId('menu-item-trace-json')).not.toBeInTheDocument();
    expect(screen.queryByTestId('menu-item-trace-json-unadjusted')).not.toBeInTheDocument();
    
    expect(screen.getByTestId('menu-item-TraceGraph')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-TraceStatistics')).toBeInTheDocument();
  });

  it('tracks and changes view for Trace Graph', () => {
    renderComponent({ viewType: ETraceViewType.TraceTimelineViewer });
    const menuItem = screen.getByTestId('menu-item-TraceGraph');
    
    fireEvent.click(menuItem);
    
    expect(props.onTraceViewChange).toHaveBeenCalledWith(ETraceViewType.TraceGraph);
    expect(trackGraphView).toHaveBeenCalledTimes(1);
  });

  it('tracks and changes view for Trace Statistics', () => {
    renderComponent({ viewType: ETraceViewType.TraceGraph });
    const menuItem = screen.getByTestId('menu-item-TraceStatistics');
    
    fireEvent.click(menuItem);
    
    expect(props.onTraceViewChange).toHaveBeenCalledWith(ETraceViewType.TraceStatistics);
    expect(trackStatisticsView).toHaveBeenCalledTimes(1);
  });

  it('tracks and changes view for Trace Timeline', () => {
    renderComponent({ viewType: ETraceViewType.TraceStatistics });
    const menuItem = screen.getByTestId('menu-item-TraceTimelineViewer');
    
    fireEvent.click(menuItem);
    
    expect(props.onTraceViewChange).toHaveBeenCalledWith(ETraceViewType.TraceTimelineViewer);
    expect(trackGanttView).toHaveBeenCalledTimes(1);
  });

  it('tracks and changes view for Trace Spans Table', () => {
    renderComponent({ viewType: ETraceViewType.TraceTimelineViewer });
    const menuItem = screen.getByTestId('menu-item-TraceSpansView');
    
    fireEvent.click(menuItem);
    
    expect(props.onTraceViewChange).toHaveBeenCalledWith(ETraceViewType.TraceSpansView);
    expect(trackTraceSpansView).toHaveBeenCalledTimes(1);
  });

  it('does not track or change view for Trace Flamegraph', () => {
    renderComponent({ viewType: ETraceViewType.TraceTimelineViewer });
    const menuItem = screen.getByTestId('menu-item-TraceFlamegraph');
    
    fireEvent.click(menuItem);
    
    expect(props.onTraceViewChange).toHaveBeenCalledWith(ETraceViewType.TraceFlamegraph);

    expect(trackGanttView).not.toHaveBeenCalled();
    expect(trackGraphView).not.toHaveBeenCalled();
    expect(trackStatisticsView).not.toHaveBeenCalled();
    expect(trackTraceSpansView).not.toHaveBeenCalled();
  });

  it('renders JSON links with correct URLs', () => {
    renderComponent();
    
    const jsonMenuItem = screen.getByTestId('menu-item-trace-json');
    const jsonLink = jsonMenuItem.querySelector('a');
    expect(jsonLink).toHaveAttribute('href', '/api/traces/test trace ID?prettyPrint=true');
    
    const rawJsonMenuItem = screen.getByTestId('menu-item-trace-json-unadjusted');
    const rawJsonLink = rawJsonMenuItem.querySelector('a');
    expect(rawJsonLink).toHaveAttribute('href', '/api/traces/test trace ID?raw=true&prettyPrint=true');
  });

  it('updates dropdown text when view type changes', () => {
    const { rerender } = renderComponent({ viewType: ETraceViewType.TraceTimelineViewer });
    expect(screen.getByTestId('dropdown-button')).toHaveTextContent('Trace Timeline');

    const rerenderWithViewType = (viewType, expectedText) => {
      rerender(
        <BrowserRouter>
          <AltViewOptions {...props} viewType={viewType} />
        </BrowserRouter>
      );
      expect(screen.getByTestId('dropdown-button')).toHaveTextContent(expectedText);
    };

    rerenderWithViewType(ETraceViewType.TraceGraph, 'Trace Graph');
    rerenderWithViewType(ETraceViewType.TraceStatistics, 'Trace Statistics');
    rerenderWithViewType(ETraceViewType.TraceSpansView, 'Trace Spans Table');
    rerenderWithViewType(ETraceViewType.TraceFlamegraph, 'Trace Flamegraph');
  });

  it('excludes current view from dropdown options for all view types', () => {
    const viewTypes = [
      { type: ETraceViewType.TraceTimelineViewer, testId: 'menu-item-TraceTimelineViewer' },
      { type: ETraceViewType.TraceGraph, testId: 'menu-item-TraceGraph' },
      { type: ETraceViewType.TraceStatistics, testId: 'menu-item-TraceStatistics' },
      { type: ETraceViewType.TraceSpansView, testId: 'menu-item-TraceSpansView' },
      { type: ETraceViewType.TraceFlamegraph, testId: 'menu-item-TraceFlamegraph' },
    ];

    viewTypes.forEach(({ type, testId }) => {
      cleanup();
      renderComponent({ viewType: type });
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
    });
  });
});
