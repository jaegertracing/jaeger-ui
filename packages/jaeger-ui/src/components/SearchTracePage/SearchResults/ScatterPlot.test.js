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
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import ScatterPlot from './ScatterPlot';
import { ONE_MILLISECOND } from '../../../utils/date';

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
  global.ResizeObserver = MockResizeObserver;
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

  it('renders correctly with data', () => {
    const { container } = render(
      <ScatterPlot data={sampleData} onValueClick={mockOnValueClick} calculateContainerWidth={() => 1200} />
    );

    expect(container.querySelector('.TraceResultsScatterPlot')).toBeTruthy();

    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
    expect(container.querySelector('.recharts-wrapper')).toBeTruthy();
    expect(container.querySelector('.recharts-scatter')).toBeTruthy();
    expect(container.querySelector('.recharts-xAxis')).toBeTruthy();
    expect(container.querySelector('.recharts-yAxis')).toBeTruthy();
  });

  it('uses default calculateContainerWidth when not provided', () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 500,
    });

    const { container } = render(<ScatterPlot data={sampleData} onValueClick={mockOnValueClick} />);

    expect(container.querySelector('.TraceResultsScatterPlot')).toBeTruthy();
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();

    // Restore original clientWidth
    delete HTMLElement.prototype.clientWidth;
  });

  it('does not render chart when container width is 0', () => {
    const { container } = render(
      <ScatterPlot data={sampleData} onValueClick={mockOnValueClick} calculateContainerWidth={() => 0} />
    );

    expect(container.querySelector('.TraceResultsScatterPlot')).toBeTruthy();
    expect(container.querySelector('.recharts-responsive-container')).toBeFalsy();
  });

  it('formats X axis ticks correctly', () => {
    const { container } = render(
      <ScatterPlot data={sampleData} onValueClick={mockOnValueClick} calculateContainerWidth={() => 1200} />
    );

    const xAxisTicks = container.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick-value');

    expect(xAxisTicks.length).toBeGreaterThan(0);

    xAxisTicks.forEach(tick => {
      expect(tick.textContent).toBeTruthy();
    });
  });

  it('formats Y axis ticks correctly', () => {
    const { container } = render(
      <ScatterPlot data={sampleData} onValueClick={mockOnValueClick} calculateContainerWidth={() => 1200} />
    );

    const yAxisTicks = container.querySelectorAll('.recharts-yAxis .recharts-cartesian-axis-tick-value');
    expect(yAxisTicks.length).toBeGreaterThan(0);

    yAxisTicks.forEach(tick => {
      expect(tick.textContent).toBeTruthy();
    });
  });

  it('handles window resize events', () => {
    const calculateContainerWidth = jest.fn().mockReturnValueOnce(1200).mockReturnValueOnce(800);

    render(
      <ScatterPlot
        data={sampleData}
        onValueClick={mockOnValueClick}
        calculateContainerWidth={calculateContainerWidth}
      />
    );

    expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));

    const resizeHandler = window.addEventListener.mock.calls.find(call => call[0] === 'resize')[1];
    resizeHandler();

    expect(calculateContainerWidth).toHaveBeenCalledTimes(2);

    const { unmount } = render(
      <ScatterPlot data={sampleData} onValueClick={mockOnValueClick} calculateContainerWidth={() => 1200} />
    );

    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('calls onValueClick when a scatter point is clicked', () => {
    const { container } = render(
      <ScatterPlot data={sampleData} onValueClick={mockOnValueClick} calculateContainerWidth={() => 1200} />
    );

    const scatterPoints = container.querySelectorAll('.recharts-scatter-symbol');

    expect(scatterPoints.length).toBeGreaterThan(0);

    fireEvent.click(scatterPoints[0]);

    expect(mockOnValueClick).toHaveBeenCalled();
  });

  it('generates unique ticks for the x-axis', () => {
    const { container } = render(
      <ScatterPlot data={sampleData} onValueClick={mockOnValueClick} calculateContainerWidth={() => 1200} />
    );

    const xTicks = container.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick-value');
    expect(xTicks.length).toBeGreaterThan(0);

    const tickLabels = Array.from(xTicks).map(tick => tick.textContent);
    const uniqueLabels = [...new Set(tickLabels)];
    expect(uniqueLabels.length).toBe(tickLabels.length);
  });

  it('renders with different dot sizes', () => {
    const { container } = render(
      <ScatterPlot
        data={[
          {
            ...sampleData[0],
            size: 100,
          },
          {
            ...sampleData[0],
            size: 1000,
            traceID: 'lot-of-spans',
          },
        ]}
        onValueClick={mockOnValueClick}
        calculateContainerWidth={() => 1200}
      />
    );

    const scatterSymbols = container.querySelectorAll('.recharts-scatter-symbol');
    expect(scatterSymbols.length).toBe(2);

    const firstSymbol = scatterSymbols[0];
    const secondSymbol = scatterSymbols[1];

    expect(firstSymbol).toBeTruthy();
    expect(secondSymbol).toBeTruthy();
  });
});
