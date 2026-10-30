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
    Dropdown: ({ children, menu, onOpenChange }) => (
      <div
        data-testid="dropdown"
        onClick={() => {
          if (onOpenChange) onOpenChange(true);
        }}
      >
        {children}
        <div data-testid="dropdown-menu">
          {menu.items.map(item => (
            <div
              key={item.key}
              data-testid={`menu-item-${item.key}`}
              onClick={() => {
                // Simulate clicking the link/button inside
                if (item.label?.props?.onClick) {
                  item.label.props.onClick();
                }
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>
    ),
    Button: ({ children, className }) => (
      <button type="button" className={className} data-testid="dropdown-button">
        {children}
      </button>
    ),
  };
});

describe('AltViewOptions', () => {
  let trackViewChange;

  const props = {
    viewType: ETraceViewType.TraceTimelineViewer,
    traceID: 'test trace ID',
    onTraceViewChange: jest.fn(),
    disableJsonView: false,
  };

  beforeAll(() => {
    trackViewChange = jest.spyOn(track, 'trackViewChange');
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
    rerenderWithViewType(ETraceViewType.TraceLogs, 'Trace Logs');
  });

  it('excludes current view from dropdown options for all view types', () => {
    const viewTypes = [
      { type: ETraceViewType.TraceTimelineViewer, testId: 'menu-item-TraceTimelineViewer' },
      { type: ETraceViewType.TraceGraph, testId: 'menu-item-TraceGraph' },
      { type: ETraceViewType.TraceStatistics, testId: 'menu-item-TraceStatistics' },
      { type: ETraceViewType.TraceSpansView, testId: 'menu-item-TraceSpansView' },
      { type: ETraceViewType.TraceFlamegraph, testId: 'menu-item-TraceFlamegraph' },
      { type: ETraceViewType.TraceLogs, testId: 'menu-item-TraceLogs' },
      { type: ETraceViewType.GenAITimelineViewer, testId: 'menu-item-GenAITimelineViewer' },
    ];

    viewTypes.forEach(({ type, testId }) => {
      cleanup();
      renderComponent({ viewType: type });
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
    });
  });

  it('focuses the first menu item when dropdown is opened', () => {
    const requestAnimationFrameSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(cb => cb());
    const mockMenuItem = { focus: jest.fn() };
    const querySelectorSpy = jest.spyOn(document, 'querySelector').mockReturnValue(mockMenuItem);

    renderComponent();

    const dropdown = screen.getByTestId('dropdown');
    fireEvent.click(dropdown);

    expect(requestAnimationFrameSpy).toHaveBeenCalled();
    expect(querySelectorSpy).toHaveBeenCalledWith(
      '.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item'
    );
    expect(mockMenuItem.focus).toHaveBeenCalled();

    requestAnimationFrameSpy.mockRestore();
    querySelectorSpy.mockRestore();
  });
});
