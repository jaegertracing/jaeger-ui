// Copyright (c) 2017 Uber Technologies, Inc.
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

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import ScatterPlot, { CustomTooltip } from './ScatterPlot';
import { ONE_MILLISECOND } from '../../../utils/date';
import { FALLBACK_TRACE_NAME } from '../../../constants';

// Mock ResizeObserver which is not available in JSDOM but required by Recharts
class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
    this.observables = new Set();
  }

  observe(element) {
    this.observables.add(element);
    // Simulate an initial resize event
    this.callback([{ target: element, contentRect: { width: 1200, height: 800 } }]);
  }

  unobserve(element) {
    this.observables.delete(element);
  }

  disconnect() {
    this.observables.clear();
  }
}

beforeAll(() => {
  window.ResizeObserver = MockResizeObserver;
  SVGElement.prototype.getComputedTextLength = jest.fn().mockReturnValue(50);
  SVGElement.prototype.getBBox = jest.fn().mockReturnValue({
    x: 0,
    y: 0,
    width: 100,
    height: 50,
  });
});

// Mock window resize event
const mockResizeEvent = () => {
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;

  beforeEach(() => {
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  afterEach(() => {
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });
};

mockResizeEvent();

const generateTimestamp = (hours, minutes, seconds) => {
  const UTCMilliseconds = new Date(2018, 10, 13, hours, minutes, seconds).getTime();

  return UTCMilliseconds * ONE_MILLISECOND;
};

const sampleData = [
  {
    x: generateTimestamp(22, 10, 17),
    y: 1,
    traceID: '576b0c2330db100b',
    size: 1,
  },
  {
    x: generateTimestamp(22, 10, 22),
    y: 2,
    traceID: '6fb42ddd88f4b4f2',
    size: 1,
  },
  {
    x: generateTimestamp(22, 10, 46),
    y: 77707,
    traceID: '1f7185d56ef5dc07',
    size: 3,
  },
  {
    x: generateTimestamp(22, 11, 6),
    y: 80509,
    traceID: '21ba1f993ceddd8f',
    size: 3,
  },
];

describe('ScatterPlot', () => {
  const mockOnValueClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render base case correctly', () => {
    const data = [
      { x: Date.now() - 3000, y: 1, traceID: '1' },
      { x: Date.now() - 2000, y: 2, traceID: '2' },
      { x: Date.now() - 1000, y: 2, traceID: '2' },
      { x: Date.now(), y: 3, traceID: '3' },
    ];
    let container;
    act(() => {
      const result = render(
        <ScatterPlot data={data} onValueClick={mockOnValueClick} calculateContainerWidth={() => 1200} />
      );
      container = result.container;
    });
    expect(container.querySelector('.TraceResultsScatterPlot')).toBeTruthy();
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  it('should render X axis correctly', () => {
    let container;
    act(() => {
      const result = render(
        <ScatterPlot data={sampleData} onValueClick={mockOnValueClick} calculateContainerWidth={() => 1200} />
      );
      container = result.container;
    });

    const xAxisTicks = container.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick-value');
    const tickTexts = Array.from(xAxisTicks).map(tick => tick.textContent);

    expect(tickTexts.some(text => text.includes('10:10'))).toBeTruthy();
    expect(tickTexts.some(text => text.includes('10:11'))).toBeTruthy();
  });

  it('should render Y axis correctly', () => {
    let container;
    act(() => {
      const result = render(
        <ScatterPlot data={sampleData} onValueClick={mockOnValueClick} calculateContainerWidth={() => 1200} />
      );
      container = result.container;
    });

    const yAxisTicks = container.querySelectorAll('.recharts-yAxis .recharts-cartesian-axis-tick-value');
    const tickTexts = Array.from(yAxisTicks).map(tick => tick.textContent);

    expect(tickTexts.some(text => text.includes('ms'))).toBeTruthy();
  });

  it('should set fixed container width on initial render', () => {
    let container;
    act(() => {
      const result = render(
        <ScatterPlot data={sampleData} onValueClick={mockOnValueClick} calculateContainerWidth={() => 1200} />
      );
      container = result.container;
    });

    const responsiveContainer = container.querySelector('.recharts-responsive-container');
    expect(responsiveContainer).toBeTruthy();
    expect(responsiveContainer.style.width).toBe('100%');
  });

  it('should update container width on window resize', () => {
    const calculateContainerWidth = jest.fn().mockReturnValueOnce(1200).mockReturnValueOnce(700);

    let unmount;
    act(() => {
      const result = render(
        <ScatterPlot
          data={sampleData}
          onValueClick={mockOnValueClick}
          calculateContainerWidth={calculateContainerWidth}
        />
      );
      unmount = result.unmount;
    });

    expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));

    act(() => {
      const resizeHandler = window.addEventListener.mock.calls.find(call => call[0] === 'resize')[1];
      resizeHandler();
    });

    expect(calculateContainerWidth).toHaveBeenCalledTimes(2);

    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('should render Hint correctly', () => {
    let container;
    act(() => {
      const result = render(
        <ScatterPlot data={sampleData} onValueClick={mockOnValueClick} calculateContainerWidth={() => 1200} />
      );
      container = result.container;
    });

    const scatterPoints = container.querySelectorAll('.recharts-scatter-symbol');
    expect(scatterPoints.length).toBeGreaterThan(0);

    // Simulate hover over a point
    fireEvent.mouseOver(scatterPoints[0]);
    expect(container.querySelector('.scatter-plot-hint')).toBeTruthy();

    // Simulate mouse out
    fireEvent.mouseOut(scatterPoints[0]);
    expect(container.querySelector('.scatter-plot-hint')).toBeFalsy();
  });

  it('should handle click events', () => {
    let container;
    act(() => {
      const result = render(
        <ScatterPlot data={sampleData} onValueClick={mockOnValueClick} calculateContainerWidth={() => 1200} />
      );
      container = result.container;
    });

    const scatterPoints = container.querySelectorAll('.recharts-scatter-symbol');
    fireEvent.click(scatterPoints[0]);
    expect(mockOnValueClick).toHaveBeenCalled();
  });

  it('should handle zero width container', () => {
    let container;
    act(() => {
      const result = render(
        <ScatterPlot data={sampleData} onValueClick={mockOnValueClick} calculateContainerWidth={() => 0} />
      );
      container = result.container;
    });

    expect(container.querySelector('.TraceResultsScatterPlot')).toBeTruthy();
    expect(container.querySelector('.recharts-responsive-container')).toBeFalsy();
  });
});

describe('CustomTooltip', () => {
  it('renders with trace name when active and payload is provided', () => {
    const traceName = 'Test Trace Name';
    const { container } = render(<CustomTooltip active payload={[{ payload: { name: traceName } }]} />);

    const tooltipElement = container.querySelector('.scatter-plot-hint');
    expect(tooltipElement).toBeTruthy();
    expect(tooltipElement.querySelector('h4').textContent).toBe(traceName);
  });

  it('renders with fallback name when trace has no name', () => {
    const { container } = render(<CustomTooltip active payload={[{ payload: {} }]} />);

    const tooltipElement = container.querySelector('.scatter-plot-hint');
    expect(tooltipElement).toBeTruthy();
    expect(tooltipElement.querySelector('h4').textContent).toBe(FALLBACK_TRACE_NAME);
  });

  it('returns null when not active', () => {
    const { container } = render(<CustomTooltip payload={[{ payload: { name: 'Test' } }]} />);
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
