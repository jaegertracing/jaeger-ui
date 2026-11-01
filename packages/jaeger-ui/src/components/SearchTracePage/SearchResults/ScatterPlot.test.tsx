// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

import ScatterPlot, { CustomTooltip } from './ScatterPlot';
import { ONE_MILLISECOND } from '../../../utils/date';
import { FALLBACK_TRACE_NAME } from '../../../constants';

type TScatterPlotPoint = React.ComponentProps<typeof ScatterPlot>['data'][number];

// Mock ResizeObserver which is not available in JSDOM but required by Recharts
class MockResizeObserver implements ResizeObserver {
  private readonly callback: ResizeObserverCallback;
  private readonly observables = new Set<Element>();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(element: Element) {
    this.observables.add(element);
    // Simulate an initial resize event
    const entry = { target: element, contentRect: { width: 1200, height: 800 } } as ResizeObserverEntry;
    this.callback([entry], this);
  }

  unobserve(element: Element) {
    this.observables.delete(element);
  }

  disconnect() {
    this.observables.clear();
  }
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  // JSDOM does not implement SVG text measurement, which Recharts uses to lay out axis labels
  Object.assign(SVGElement.prototype, {
    getComputedTextLength: vi.fn().mockReturnValue(50),
    getBBox: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 50 }),
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const generateTimestamp = (hours: number, minutes: number, seconds: number) => {
  const UTCMilliseconds = new Date(2018, 10, 13, hours, minutes, seconds).getTime();

  return UTCMilliseconds * ONE_MILLISECOND;
};

const sampleData: TScatterPlotPoint[] = [
  {
    x: generateTimestamp(22, 10, 17),
    y: 1,
    traceID: '576b0c2330db100b',
    spanCount: 1,
    serviceCount: 1,
  },
  {
    x: generateTimestamp(22, 10, 22),
    y: 2,
    traceID: '6fb42ddd88f4b4f2',
    spanCount: 1,
    serviceCount: 1,
  },
  {
    x: generateTimestamp(22, 10, 46),
    y: 77707,
    traceID: '1f7185d56ef5dc07',
    spanCount: 3,
    serviceCount: 2,
  },
  {
    x: generateTimestamp(22, 11, 6),
    y: 80509,
    traceID: '21ba1f993ceddd8f',
    spanCount: 3,
    serviceCount: 2,
  },
];

const renderScatterPlot = (props: Partial<React.ComponentProps<typeof ScatterPlot>> = {}) => {
  let result!: ReturnType<typeof render>;
  act(() => {
    result = render(
      <ScatterPlot data={sampleData} onValueClick={vi.fn()} calculateContainerWidth={() => 1200} {...props} />
    );
  });
  return result;
};

describe('ScatterPlot', () => {
  const mockOnValueClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render base case correctly', () => {
    const data: TScatterPlotPoint[] = [
      { x: generateTimestamp(22, 10, 1), y: 1, traceID: '1', spanCount: 1, serviceCount: 1 },
      { x: generateTimestamp(22, 10, 2), y: 2, traceID: '2', spanCount: 2, serviceCount: 1 },
      { x: generateTimestamp(22, 10, 3), y: 2, traceID: '3', spanCount: 2, serviceCount: 2 },
      { x: generateTimestamp(22, 10, 4), y: 3, traceID: '4', spanCount: 3, serviceCount: 2 },
    ];
    const { container } = renderScatterPlot({ data, onValueClick: mockOnValueClick });

    expect(container.querySelector('.TraceResultsScatterPlot')).toBeTruthy();
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  it('should render X axis correctly', async () => {
    const { container } = renderScatterPlot({ onValueClick: mockOnValueClick });

    await waitFor(() => {
      expect(container.querySelector('.recharts-xAxis')).toBeTruthy();
    });

    const xAxis = container.querySelector('.recharts-xAxis');
    expect(xAxis?.querySelector('.recharts-cartesian-axis-ticks')).toBeTruthy();
  });

  it('should render Y axis correctly', async () => {
    const { container } = renderScatterPlot({ onValueClick: mockOnValueClick });

    await waitFor(() => {
      expect(container.querySelector('.recharts-yAxis')).toBeTruthy();
    });

    const yAxis = container.querySelector('.recharts-yAxis');
    expect(yAxis?.querySelector('.recharts-cartesian-axis-ticks')).toBeTruthy();
  });

  it('should set fixed container width on initial render', () => {
    const { container } = renderScatterPlot({ onValueClick: mockOnValueClick });

    const responsiveContainer = container.querySelector<HTMLElement>('.recharts-responsive-container');
    expect(responsiveContainer).toBeTruthy();
    expect(responsiveContainer?.style.width).toBe('100%');
  });

  it('should update container width on window resize', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const calculateContainerWidth = vi
      .fn<(container: HTMLElement) => number>()
      .mockReturnValueOnce(1200)
      .mockReturnValueOnce(700);

    const { unmount } = renderScatterPlot({ onValueClick: mockOnValueClick, calculateContainerWidth });

    const resizeCall = addEventListenerSpy.mock.calls.find(([type]) => String(type) === 'resize');
    expect(resizeCall).toBeDefined();
    const resizeHandler = resizeCall?.[1];

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(calculateContainerWidth).toHaveBeenCalledTimes(2);

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', resizeHandler);
  });

  it('should render Hint correctly', () => {
    const { container } = renderScatterPlot({ onValueClick: mockOnValueClick });

    const scatterPoints = container.querySelectorAll('.recharts-scatter-symbol');
    expect(scatterPoints.length).toBeGreaterThan(0);

    // Simulate hover over a point
    fireEvent.mouseOver(scatterPoints[0]);
    expect(container.querySelector('.scatter-plot-hint')).toBeTruthy();

    // Simulate mouse out
    fireEvent.mouseOut(scatterPoints[0]);
    expect(container.querySelector('.scatter-plot-hint')).toBeFalsy();
  });

  it('should pass the clicked point to onValueClick', () => {
    const { container } = renderScatterPlot({ onValueClick: mockOnValueClick });

    const scatterPoints = container.querySelectorAll('.recharts-scatter-symbol');
    fireEvent.click(scatterPoints[0]);

    expect(mockOnValueClick).toHaveBeenCalledTimes(1);
    expect(mockOnValueClick.mock.calls[0][0]).toEqual(
      expect.objectContaining({ traceID: sampleData[0].traceID })
    );
  });

  it('should handle zero width container', () => {
    const { container } = renderScatterPlot({
      onValueClick: mockOnValueClick,
      calculateContainerWidth: () => 0,
    });

    expect(container.querySelector('.TraceResultsScatterPlot')).toBeTruthy();
    expect(container.querySelector('.recharts-responsive-container')).toBeFalsy();
  });

  it('uses default calculateContainerWidth when prop is not provided', () => {
    render(<ScatterPlot data={sampleData} onValueClick={vi.fn()} />);
    expect(document.querySelector('.TraceResultsScatterPlot')).toBeInTheDocument();
  });
});

describe('CustomTooltip', () => {
  const makePayload = (point: Partial<TScatterPlotPoint>) => [{ payload: point as TScatterPlotPoint }];

  it('renders with trace name when active and payload is provided', () => {
    const traceName = 'Test Trace Name';
    const { container } = render(<CustomTooltip active payload={makePayload({ name: traceName })} />);

    const tooltipElement = container.querySelector('.scatter-plot-hint');
    expect(tooltipElement).toBeTruthy();
    expect(tooltipElement?.querySelector('h4')?.textContent).toBe(traceName);
  });

  it('renders with fallback name when trace has no name', () => {
    const { container } = render(<CustomTooltip active payload={makePayload({})} />);

    const tooltipElement = container.querySelector('.scatter-plot-hint');
    expect(tooltipElement).toBeTruthy();
    expect(tooltipElement?.querySelector('h4')?.textContent).toBe(FALLBACK_TRACE_NAME);
  });

  it('renders stats information when active and payload is provided', () => {
    const { container } = render(
      <CustomTooltip active payload={makePayload({ name: 'Test Trace', spanCount: 42, serviceCount: 2 })} />
    );

    expect(container.querySelector('.scatter-plot-hint')).toBeTruthy();

    const statsElement = container.querySelector('.scatter-plot-hint-stats');
    expect(statsElement).toBeTruthy();
    expect(statsElement?.textContent).toContain('Spans: 42');
    expect(statsElement?.textContent).toContain('Services: 2');
  });

  it('handles missing counts', () => {
    const { container } = render(<CustomTooltip active payload={makePayload({ name: 'Test Trace' })} />);

    const statsElement = container.querySelector('.scatter-plot-hint-stats');
    expect(statsElement?.textContent).toContain('Spans:');
    expect(statsElement?.textContent).toContain('Services:');
  });

  it('renders correct spanCount and serviceCount', () => {
    const { container } = render(
      <CustomTooltip active payload={makePayload({ name: 'Test Trace', spanCount: 15, serviceCount: 3 })} />
    );

    const statsElement = container.querySelector('.scatter-plot-hint-stats');
    expect(statsElement?.textContent).toContain('Spans: 15');
    expect(statsElement?.textContent).toContain('Services: 3');
  });

  it('returns null when not active', () => {
    const { container } = render(<CustomTooltip payload={makePayload({ name: 'Test' })} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when payload is empty', () => {
    const { container } = render(<CustomTooltip active payload={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when payload is not provided', () => {
    const { container } = render(<CustomTooltip active />);
    expect(container.firstChild).toBeNull();
  });
});
