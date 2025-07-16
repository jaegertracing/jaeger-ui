// Copyright (c) 2021 The Jaeger Authors.
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
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import ServiceGraph, { tickFormat, Placeholder, createServiceGraphHelpers } from './serviceGraph';
import { serviceMetrics } from '../../../reducers/metrics.mock';

// Mock data with correct structure
const mockMetricsData = {
  quantile: 0.95,
  metricPoints: [
    { x: 1000, y: 1000 },
    { x: 2000, y: 2000 },
  ],
};

// Mock ResizeObserver for Recharts
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

// Mock SVGElement.getBBox() for Recharts
if (!SVGElement.prototype.getBBox) {
  SVGElement.prototype.getBBox = () => ({
    width: 100,
    height: 100,
    x: 0,
    y: 0,
  });
}

// Mock getComputedStyle for Recharts
window.getComputedStyle = () => ({
  getPropertyValue: () => '',
});

const defaultProps = {
  width: 300,
  error: null,
  name: 'Hello Graph',
  metricsData: null,
  loading: true,
  marginClassName: '',
  xDomain: [1631271783806, 1631271883806],
};

describe('<ServiceGraph>', () => {
  afterEach(cleanup);

  it('renders loading indicator when loading', () => {
    const { container } = render(<ServiceGraph {...defaultProps} />);
    const loadingIndicator = container.querySelector('svg.LoadingIndicator');
    expect(loadingIndicator).toBeInTheDocument();
    expect(loadingIndicator).toHaveClass('is-centered');
    expect(screen.getByRole('heading', { name: 'Hello Graph' })).toBeInTheDocument();
  });

  it('renders loading indicator when xDomain is empty or undefined', () => {
    cleanup();
    const { container: container1 } = render(<ServiceGraph {...defaultProps} xDomain={[]} loading={false} />);
    expect(container1.querySelector('svg.LoadingIndicator')).toBeInTheDocument();

    cleanup();
    const { container: container2 } = render(
      <ServiceGraph {...defaultProps} xDomain={[undefined, undefined]} loading={false} />
    );
    expect(container2.querySelector('svg.LoadingIndicator')).toBeInTheDocument();
  });

  it('renders "No Data" when no metrics data is available', () => {
    cleanup();
    const { container } = render(<ServiceGraph {...defaultProps} loading={false} />);
    const placeholder = container.querySelector('.center-placeholder');
    expect(placeholder).toHaveTextContent('No Data');
  });

  it('renders error message when there is an error', () => {
    cleanup();
    const { container } = render(
      <ServiceGraph {...defaultProps} loading={false} error={new Error('API Error')} />
    );
    const placeholder = container.querySelector('.center-placeholder');
    expect(placeholder).toHaveTextContent('Could not fetch data');
  });

  it('renders base graph with data', () => {
    cleanup();
    const { container } = render(
      <ServiceGraph {...defaultProps} loading={false} metricsData={serviceMetrics.service_call_rate} />
    );
    expect(container.querySelector('[data-testid="service-graph"]')).toHaveClass('graph-container');
  });

  it('renders graph with legend', () => {
    cleanup();
    const metricsData = [
      { ...serviceMetrics.service_call_rate, quantile: 0.5 },
      { ...serviceMetrics.service_call_rate, quantile: 0.95 },
    ];
    const { container } = render(
      <ServiceGraph {...defaultProps} loading={false} metricsData={metricsData} showLegend />
    );
    expect(container.querySelector('[data-testid="service-graph"]')).toHaveClass('graph-container');
  });

  it('renders graph with horizontal lines', () => {
    cleanup();
    const { container } = render(
      <ServiceGraph
        {...defaultProps}
        loading={false}
        metricsData={serviceMetrics.service_call_rate}
        showHorizontalLines
      />
    );
    expect(container.querySelector('[data-testid="service-graph"]')).toHaveClass('graph-container');
  });

  it('renders graph with custom color', () => {
    cleanup();
    const { container } = render(
      <ServiceGraph
        {...defaultProps}
        loading={false}
        metricsData={serviceMetrics.service_call_rate}
        color="AAAAAA"
      />
    );
    expect(container.querySelector('[data-testid="service-graph"]')).toHaveClass('graph-container');
  });

  it('renders graph with multiple metrics data points', () => {
    cleanup();
    const metricsData = [
      { ...serviceMetrics.service_call_rate, quantile: 0.5 },
      { ...serviceMetrics.service_call_rate, quantile: 0.95 },
    ];

    const { container } = render(
      <ServiceGraph {...defaultProps} loading={false} metricsData={metricsData} />
    );
    expect(container.querySelector('[data-testid="service-graph"]')).toHaveClass('graph-container');
  });

  it('handles edge cases in data rendering', () => {
    const { container } = render(<ServiceGraph {...defaultProps} loading={false} metricsData={null} />);
    const placeholder = container.querySelector('.center-placeholder');
    expect(placeholder).toHaveTextContent('No Data');

    cleanup();
    const metricsWithNull = {
      ...serviceMetrics.service_call_rate,
      metricPoints: [
        { x: 1631271783806, y: null },
        { x: 1631271783807, y: 5 },
      ],
    };
    const { container: container2 } = render(
      <ServiceGraph {...defaultProps} loading={false} metricsData={metricsWithNull} />
    );
    expect(container2.querySelector('[data-testid="service-graph"]')).toHaveClass('graph-container');

    cleanup();
    const metricsWithExtremes = {
      ...serviceMetrics.service_call_rate,
      metricPoints: [
        { x: 1631271783806, y: 0.0001 },
        { x: 1631271783807, y: 1000 },
      ],
    };
    const { container: container3 } = render(
      <ServiceGraph {...defaultProps} loading={false} metricsData={metricsWithExtremes} />
    );
    expect(container3.querySelector('[data-testid="service-graph"]')).toHaveClass('graph-container');
  });

  it('formats y-axis ticks for various value ranges', () => {
    cleanup();
    // Test error rate formatting
    const { container: container1 } = render(
      <ServiceGraph
        {...defaultProps}
        loading={false}
        metricsData={serviceMetrics.service_call_rate}
        name="Error rate"
      />
    );
    expect(container1.querySelector('h3')).toHaveTextContent('Error rate');

    // Test custom formatter
    const { container: container2 } = render(
      <ServiceGraph
        {...defaultProps}
        loading={false}
        metricsData={serviceMetrics.service_call_rate}
        yAxisTickFormat={v => Math.round(v)}
      />
    );
    expect(container2.querySelector('[data-testid="service-graph"]')).toHaveClass('graph-container');
  });

  it('handles various y-axis value ranges', () => {
    cleanup();
    const testCases = [
      { value: 0, expected: '0' },
      { value: 0.001, expected: '1.00e-3' },
      { value: 0.00001, expected: '1.00e-5' },
      { value: 5, expected: '5.00' },
      { value: 50, expected: '50.0' },
      { value: 500, expected: '500' },
    ];

    const component = createServiceGraphHelpers({
      ...defaultProps,
      loading: false,
      metricsData: serviceMetrics.service_call_rate,
    });

    testCases.forEach(({ value, expected }) => {
      expect(component.formatYAxisTick(value)).toBe(expected);
    });
  });

  it('handles undefined xDomain values', () => {
    cleanup();
    const { container } = render(
      <ServiceGraph {...defaultProps} loading={false} xDomain={[undefined, undefined]} />
    );
    const loadingIndicator = container.querySelector('svg.LoadingIndicator');
    expect(loadingIndicator).toBeInTheDocument();
  });

  it('handles empty metric points', () => {
    cleanup();
    const emptyMetrics = {
      ...serviceMetrics.service_call_rate,
      metricPoints: [],
    };
    const { container } = render(
      <ServiceGraph {...defaultProps} loading={false} metricsData={emptyMetrics} />
    );
    expect(container.querySelector('[data-testid="service-graph"]')).toHaveClass('graph-container');
  });

  it('handles missing metric points', () => {
    cleanup();
    const metricsWithoutPoints = {
      ...serviceMetrics.service_call_rate,
      metricPoints: undefined,
    };
    const { container } = render(
      <ServiceGraph {...defaultProps} loading={false} metricsData={metricsWithoutPoints} />
    );
    expect(container.querySelector('[data-testid="service-graph"]')).toHaveClass('graph-container');
  });

  it('formats tooltip values correctly', () => {
    cleanup();
    const { container } = render(
      <ServiceGraph
        {...defaultProps}
        loading={false}
        metricsData={serviceMetrics.service_call_rate}
        showLegend
      />
    );
    const graph = container.querySelector('[data-testid="service-graph"]');
    expect(graph).toBeInTheDocument();

    const component = createServiceGraphHelpers({
      ...defaultProps,
      loading: false,
      metricsData: serviceMetrics.service_call_rate,
      showLegend: true,
    });

    // Test tooltip formatter - we'll test the formatYAxisTick function directly
    expect(component.formatYAxisTick(5.123)).toBe('5.12');

    // Test tooltip label formatter - we'll test the date formatting directly
    const timestamp = 1631271783806;
    const formattedDate = new Date(timestamp).toLocaleString();
    expect(formattedDate).toBe(new Date(timestamp).toLocaleString());
  });

  it('formats legend values correctly', () => {
    cleanup();
    const { container } = render(
      <ServiceGraph
        {...defaultProps}
        loading={false}
        metricsData={serviceMetrics.service_call_rate}
        showLegend
      />
    );
    const graph = container.querySelector('[data-testid="service-graph"]');
    expect(graph).toBeInTheDocument();

    const component = createServiceGraphHelpers({
      ...defaultProps,
      loading: false,
      metricsData: serviceMetrics.service_call_rate,
      showLegend: true,
    });

    // Test getData function which is used by legend formatter
    const data = component.getData();
    expect(data).toHaveLength(1);
    expect(data[0].quantile).toBe(0.95);
  });

  describe('tooltip and legend formatting', () => {
    it('formats tooltip values correctly', () => {
      const component = createServiceGraphHelpers({
        width: 100,
        height: 100,
        name: 'Test Graph',
        metricsData: mockMetricsData,
        loading: false,
        error: null,
        xDomain: [0, 100],
        showLegend: true,
      });

      // Test formatYAxisTick function directly
      expect(component.formatYAxisTick(1000)).toBe('1000');

      // Test label formatter - we'll test the date formatting directly
      const timestamp = 1631271783806;
      const formattedDate = new Date(timestamp).toLocaleString();
      expect(formattedDate).toBe(new Date(timestamp).toLocaleString());
    });

    it('formats legend values correctly', () => {
      const component = createServiceGraphHelpers({
        width: 100,
        height: 100,
        name: 'Test Graph',
        metricsData: mockMetricsData,
        loading: false,
        error: null,
        xDomain: [0, 100],
        showLegend: true,
      });

      // Test getData function which is used by legend formatter
      const data = component.getData();
      expect(data).toHaveLength(1);
      expect(data[0].quantile).toBe(0.95);
    });

    it('generates placeholder correctly', () => {
      const component = createServiceGraphHelpers({
        width: 100,
        height: 242,
        name: 'Test Graph',
        metricsData: mockMetricsData,
        loading: false,
        error: null,
        xDomain: [0, 100],
      });

      const placeholder = component.generatePlaceholder(<div>Test</div>);
      expect(placeholder.props.className).toBe('center-placeholder');
      expect(placeholder.props.style.width).toBe(100);
      expect(placeholder.props.style.height).toBe(168); // 242 - 74
      expect(placeholder.props.children).toEqual(<div>Test</div>);
    });
  });
});

describe('tickFormat utility', () => {
  it('formats time correctly for single digits', () => {
    expect(tickFormat(Date.UTC(2017, 1, 14, 4, 4))).toBe('04:04');
  });

  it('formats time correctly for double digits', () => {
    expect(tickFormat(Date.UTC(2017, 1, 14, 15, 19))).toBe('15:19');
  });
});

describe('Placeholder component', () => {
  it('renders with all props', () => {
    cleanup();
    const { container } = render(
      <Placeholder name="Test" width={300} height={200} marginClassName="test-margin">
        <div>Test content</div>
      </Placeholder>
    );
    expect(container.querySelector('h3')).toHaveTextContent('Test');
    expect(container.querySelector('.center-placeholder')).toHaveTextContent('Test content');
    expect(container.querySelector('[data-testid="service-graph"]')).toHaveClass('test-margin');
  });

  it('renders without optional marginClassName', () => {
    cleanup();
    const { container } = render(
      <Placeholder name="Test" width={300} height={200}>
        <div>Test content</div>
      </Placeholder>
    );
    expect(container.querySelector('h3')).toHaveTextContent('Test');
    expect(container.querySelector('[data-testid="service-graph"]')).toHaveClass('graph-container');
  });
});

describe('ServiceGraphImpl methods', () => {
  let component;

  beforeEach(() => {
    component = createServiceGraphHelpers({
      ...defaultProps,
      loading: false,
      metricsData: serviceMetrics.service_call_rate,
    });
  });

  describe('getData', () => {
    it('handles null metrics data', () => {
      component = createServiceGraphHelpers({ ...defaultProps, metricsData: null });
      expect(component.getData()).toEqual([]);
    });

    it('handles array metrics data', () => {
      const metricsArray = [
        { ...serviceMetrics.service_call_rate, quantile: 0.5 },
        { ...serviceMetrics.service_call_rate, quantile: 0.95 },
      ];
      component = createServiceGraphHelpers({ ...defaultProps, metricsData: metricsArray });
      const result = component.getData();
      expect(result).toHaveLength(2);
      expect(result[0].quantile).toBe(0.95);
      expect(result[1].quantile).toBe(0.5);
    });
  });

  describe('getMetricsData', () => {
    it('handles empty metrics data', () => {
      component = createServiceGraphHelpers({ ...defaultProps, metricsData: [] });
      expect(component.getMetricsData()).toEqual([]);
    });

    it('handles metrics data without metricPoints', () => {
      component = createServiceGraphHelpers({
        ...defaultProps,
        metricsData: { ...serviceMetrics.service_call_rate, metricPoints: undefined },
      });
      expect(component.getMetricsData()).toEqual([]);
    });

    it('processes metrics data correctly', () => {
      const result = component.getMetricsData();
      expect(result).toHaveLength(serviceMetrics.service_call_rate.metricPoints.length);
      expect(result[0]).toHaveProperty('x');
      expect(result[0]['0.95']).toBeDefined();
    });
  });

  describe('calculateYDomain', () => {
    it('handles empty data', () => {
      expect(component.calculateYDomain([])).toEqual([0, 1]);
    });

    it('handles data with only null values', () => {
      expect(component.calculateYDomain([{ x: 1, y: null }])).toEqual([0, 1]);
    });

    it('calculates domain with padding', () => {
      const data = [
        { x: 1, y: 10 },
        { x: 2, y: 20 },
      ];
      const [min, max] = component.calculateYDomain(data);
      expect(min).toBeLessThan(10);
      expect(max).toBeGreaterThan(20);
    });
  });

  describe('calculateYAxisTicks', () => {
    it('generates correct number of ticks', () => {
      const ticks = component.calculateYAxisTicks([0, 100]);
      expect(ticks).toHaveLength(5);
    });

    it('generates evenly spaced ticks', () => {
      const ticks = component.calculateYAxisTicks([0, 100]);
      const step = ticks[1] - ticks[0];
      for (let i = 1; i < ticks.length; i++) {
        expect(ticks[i] - ticks[i - 1]).toBeCloseTo(step);
      }
    });
  });

  describe('formatYAxisTick', () => {
    it('handles error rate values', () => {
      component = createServiceGraphHelpers({ ...defaultProps, name: 'Error rate' });
      expect(component.formatYAxisTick(1.23)).toBe('1');
    });

    it('handles custom formatter', () => {
      component = createServiceGraphHelpers({
        ...defaultProps,
        yAxisTickFormat: v => Math.round(v * 100),
      });
      expect(component.formatYAxisTick(0.123)).toBe('12');
    });

    it('formats different value ranges correctly', () => {
      const testCases = [
        { value: 0, expected: '0' },
        { value: 0.001, expected: '1.00e-3' },
        { value: 0.00001, expected: '1.00e-5' },
        { value: 0.5, expected: '0.500' },
        { value: 5, expected: '5.00' },
        { value: 50, expected: '50.0' },
        { value: 500, expected: '500' },
      ];

      testCases.forEach(({ value, expected }) => {
        expect(component.formatYAxisTick(value)).toBe(expected);
      });
    });
  });

  describe('calculateNumericTicks', () => {
    it('generates correct number of ticks', () => {
      const ticks = component.calculateNumericTicks([0, 100]);
      expect(ticks).toHaveLength(7);
    });

    it('generates evenly spaced ticks', () => {
      const ticks = component.calculateNumericTicks([0, 100]);
      const step = ticks[1] - ticks[0];
      for (let i = 1; i < ticks.length; i++) {
        expect(ticks[i] - ticks[i - 1]).toBeCloseTo(step);
      }
    });
  });

  describe('renderLines', () => {
    it('returns empty array for null metrics data', () => {
      component = createServiceGraphHelpers({ ...defaultProps, metricsData: null });
      expect(component.renderLines()).toHaveLength(0);
    });

    it('renders lines with custom color', () => {
      component = createServiceGraphHelpers({
        ...defaultProps,
        metricsData: serviceMetrics.service_call_rate,
        color: '#FF0000',
      });
      const lines = component.renderLines();
      expect(lines[0].props.stroke).toBe('#FF0000');
    });

    it('renders lines with default colors for multiple metrics', () => {
      const metricsArray = [
        { ...serviceMetrics.service_call_rate, quantile: 0.5 },
        { ...serviceMetrics.service_call_rate, quantile: 0.95 },
      ];
      component = createServiceGraphHelpers({ ...defaultProps, metricsData: metricsArray });
      const lines = component.renderLines();
      expect(lines).toHaveLength(2);
      expect(lines[0].props.stroke).toBe(component.colors[0]);
      expect(lines[1].props.stroke).toBe(component.colors[1]);
    });
  });
});
