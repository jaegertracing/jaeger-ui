// Copyright (c) 2021 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Legend, Tooltip } from 'recharts';
import ServiceGraph, {
  ServiceGraphImpl,
  tickFormat,
  Placeholder,
  formatYAxisTick,
  getData,
  getMetricsData,
  calculateYDomain,
  calculateYAxisTicks,
  calculateNumericTicks,
  renderLines,
  COLORS,
} from './serviceGraph';
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

    testCases.forEach(({ value, expected }) => {
      expect(formatYAxisTick(value, 'Test Graph')).toBe(expected);
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

    const rendered = ServiceGraphImpl({
      ...defaultProps,
      loading: false,
      metricsData: serviceMetrics.service_call_rate,
      showLegend: false,
    });

    // Test tooltip formatter without legend
    const tooltipProps = rendered.props.children.props.children.props.children.find(
      child => child.type === Tooltip
    ).props;

    expect(tooltipProps.formatter(5.123, '0.95')).toEqual([formatYAxisTick(5.123, 'Hello Graph')]);

    // Test tooltip formatter with legend
    const renderedWithLegend = ServiceGraphImpl({
      ...defaultProps,
      loading: false,
      metricsData: serviceMetrics.service_call_rate,
      showLegend: true,
    });
    const tooltipPropsWithLegend = renderedWithLegend.props.children.props.children.props.children.find(
      child => child.type === Tooltip
    ).props;

    expect(tooltipPropsWithLegend.formatter(5.123, '0.95')).toEqual([
      formatYAxisTick(5.123, 'Hello Graph'),
      'P95',
    ]);

    // Test tooltip label formatter
    const timestamp = 1631271783806;
    const formattedDate = new Date(timestamp).toLocaleString();
    expect(tooltipProps.labelFormatter(timestamp)).toBe(formattedDate);
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

    const rendered = ServiceGraphImpl({
      ...defaultProps,
      loading: false,
      metricsData: serviceMetrics.service_call_rate,
      showLegend: true,
    });

    const legendProps = rendered.props.children.props.children.props.children.find(
      child => child.type === Legend
    ).props;

    // Test legend formatter with valid quantile
    const legendElement = legendProps.formatter('0.95');
    const [value, suffix] = legendElement.props.children;
    expect(value).toBe(95);
    expect(suffix).toBe('th');

    // Test legend formatter with invalid quantile
    const invalidLegendElement = legendProps.formatter('invalid');
    expect(invalidLegendElement.props.children).toBe('N/A');

    // Test legend formatter with null quantile
    const nullLegendElement = legendProps.formatter('null');
    expect(nullLegendElement.props.children).toBe('N/A');
  });

  describe('tooltip and legend formatting', () => {
    it('formats tooltip values correctly', () => {
      const testProps = {
        width: 100,
        name: 'Test Graph',
        metricsData: mockMetricsData,
        loading: false,
        error: null,
        xDomain: [0, 100],
        showLegend: true,
      };

      // Test with showLegend=true
      const rendered = ServiceGraphImpl(testProps);
      const tooltipProps = rendered.props.children.props.children.props.children.find(
        child => child.type === Tooltip
      ).props;

      const [value, label] = tooltipProps.formatter(1000, '0.95');
      expect(value).toBe(formatYAxisTick(1000, 'Test Graph'));
      expect(label).toBe('P95');

      // Test with showLegend=false
      const renderedNoLegend = ServiceGraphImpl({ ...testProps, showLegend: false });
      const tooltipPropsNoLegend = renderedNoLegend.props.children.props.children.props.children.find(
        child => child.type === Tooltip
      ).props;

      const [valueOnly] = tooltipPropsNoLegend.formatter(1000, '0.95');
      expect(valueOnly).toBe(formatYAxisTick(1000, 'Test Graph'));

      // Test label formatter
      const timestamp = 1631271783806;
      const formattedDate = new Date(timestamp).toLocaleString();
      expect(tooltipProps.labelFormatter(timestamp)).toBe(formattedDate);
    });

    it('formats legend values correctly', () => {
      const rendered = ServiceGraphImpl({
        width: 100,
        name: 'Test Graph',
        metricsData: mockMetricsData,
        loading: false,
        error: null,
        xDomain: [0, 100],
        showLegend: true,
      });

      const legendProps = rendered.props.children.props.children.props.children.find(
        child => child.type === Legend
      ).props;

      // Test valid quantile
      const validResult = legendProps.formatter('0.95');
      const [value, suffix] = validResult.props.children;
      expect(value).toBe(95);
      expect(suffix).toBe('th');

      // Test invalid quantile
      const invalidResult = legendProps.formatter('invalid');
      expect(invalidResult.props.children).toBe('N/A');

      // Test null quantile
      const nullResult = legendProps.formatter('null');
      expect(nullResult.props.children).toBe('N/A');
    });

    it('generates placeholder correctly', () => {
      // The Placeholder component is used by the functional component
      // Test it via direct render instead
      const { container } = render(
        <Placeholder name="Test Graph" width={100} height={242}>
          <div>Test</div>
        </Placeholder>
      );
      const placeholderDiv = container.querySelector('.center-placeholder');
      expect(placeholderDiv).toHaveTextContent('Test');
      // Check that the height calculation is correct (242)
      expect(placeholderDiv.style.height).toBe('242px');
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

describe('ServiceGraphImpl helper functions', () => {
  describe('getData', () => {
    it('handles null metrics data', () => {
      expect(getData(null)).toEqual([]);
    });

    it('handles array metrics data', () => {
      const metricsArray = [
        { ...serviceMetrics.service_call_rate, quantile: 0.5 },
        { ...serviceMetrics.service_call_rate, quantile: 0.95 },
      ];
      const result = getData(metricsArray);
      expect(result).toHaveLength(2);
      expect(result[0].quantile).toBe(0.95);
      expect(result[1].quantile).toBe(0.5);
    });
  });

  describe('getMetricsData', () => {
    it('handles empty metrics data', () => {
      expect(getMetricsData([])).toEqual([]);
    });

    it('handles metrics data without metricPoints', () => {
      expect(getMetricsData({ ...serviceMetrics.service_call_rate, metricPoints: undefined })).toEqual([]);
    });

    it('processes metrics data correctly', () => {
      const result = getMetricsData(serviceMetrics.service_call_rate);
      expect(result).toHaveLength(serviceMetrics.service_call_rate.metricPoints.length);
      expect(result[0]).toHaveProperty('x');
      expect(result[0]['0.95']).toBeDefined();
    });
  });

  describe('calculateYDomain', () => {
    it('handles empty data', () => {
      expect(calculateYDomain([])).toEqual([0, 1]);
    });

    it('handles data with only null values', () => {
      expect(calculateYDomain([{ x: 1, y: null }])).toEqual([0, 1]);
    });

    it('calculates domain with padding', () => {
      const data = [
        { x: 1, y: 10 },
        { x: 2, y: 20 },
      ];
      const [min, max] = calculateYDomain(data);
      expect(min).toBeLessThan(10);
      expect(max).toBeGreaterThan(20);
    });
  });

  describe('calculateYAxisTicks', () => {
    it('generates correct number of ticks', () => {
      const ticks = calculateYAxisTicks([0, 100]);
      expect(ticks).toHaveLength(5);
    });

    it('generates evenly spaced ticks', () => {
      const ticks = calculateYAxisTicks([0, 100]);
      const step = ticks[1] - ticks[0];
      for (let i = 1; i < ticks.length; i++) {
        expect(ticks[i] - ticks[i - 1]).toBeCloseTo(step);
      }
    });
  });

  describe('formatYAxisTick', () => {
    it('handles error rate values', () => {
      expect(formatYAxisTick(1.23, 'Error rate')).toBe('1');
    });

    it('handles custom formatter', () => {
      expect(formatYAxisTick(0.123, 'Test', v => Math.round(v * 100))).toBe('12');
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
        expect(formatYAxisTick(value, 'Test')).toBe(expected);
      });
    });
  });

  describe('calculateNumericTicks', () => {
    it('generates correct number of ticks', () => {
      const ticks = calculateNumericTicks([0, 100]);
      expect(ticks).toHaveLength(7);
    });

    it('generates evenly spaced ticks', () => {
      const ticks = calculateNumericTicks([0, 100]);
      const step = ticks[1] - ticks[0];
      for (let i = 1; i < ticks.length; i++) {
        expect(ticks[i] - ticks[i - 1]).toBeCloseTo(step);
      }
    });
  });

  describe('renderLines', () => {
    it('returns empty array for null metrics data', () => {
      expect(renderLines(null)).toHaveLength(0);
    });

    it('renders lines with custom color', () => {
      const lines = renderLines(serviceMetrics.service_call_rate, '#FF0000');
      expect(lines[0].props.stroke).toBe('#FF0000');
    });

    it('renders lines with default colors for multiple metrics', () => {
      const metricsArray = [
        { ...serviceMetrics.service_call_rate, quantile: 0.5 },
        { ...serviceMetrics.service_call_rate, quantile: 0.95 },
      ];
      const lines = renderLines(metricsArray);
      expect(lines).toHaveLength(2);
      expect(lines[0].props.stroke).toBe(COLORS[0]);
      expect(lines[1].props.stroke).toBe(COLORS[1]);
    });
  });
});
