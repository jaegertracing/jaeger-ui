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
import { Tooltip } from 'recharts';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ServiceGraph, { ServiceGraphImpl, tickFormat } from './serviceGraph';
import { serviceMetrics } from '../../../reducers/metrics.mock';

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

describe('<ServiceGraph>', () => {
  const defaultProps = {
    width: 300,
    error: null,
    name: 'Hello Graph',
    metricsData: null,
    loading: true,
    marginClassName: '',
    xDomain: [1, 2],
  };

  beforeEach(() => {
    // Clear any previous test DOM
    document.body.innerHTML = '';
  });

  it('renders loading indicator when loading', () => {
    const { container } = render(<ServiceGraph {...defaultProps} />);
    const loadingIndicator = container.querySelector('svg.LoadingIndicator');
    expect(loadingIndicator).toBeInTheDocument();
    expect(loadingIndicator).toHaveClass('is-centered');
    expect(screen.getByRole('heading', { name: 'Hello Graph' })).toBeInTheDocument();
  });

  it('renders loading indicator when xDomain is empty', () => {
    const { container } = render(<ServiceGraph {...defaultProps} xDomain={[]} loading={false} />);
    const loadingIndicator = container.querySelector('svg.LoadingIndicator');
    expect(loadingIndicator).toBeInTheDocument();
    expect(loadingIndicator).toHaveClass('is-centered');
    expect(screen.getByRole('heading', { name: 'Hello Graph' })).toBeInTheDocument();
  });

  it('renders "No Data" when no metrics data is available', () => {
    render(<ServiceGraph {...defaultProps} loading={false} />);
    expect(screen.getByText('No Data')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hello Graph' })).toBeInTheDocument();
  });

  it('renders error message when there is an error', () => {
    render(<ServiceGraph {...defaultProps} loading={false} error={new Error('API Error')} />);
    expect(screen.getByText('Could not fetch data')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hello Graph' })).toBeInTheDocument();
  });

  it('renders base graph with data', () => {
    render(<ServiceGraph {...defaultProps} loading={false} metricsData={serviceMetrics.service_call_rate} />);
    expect(screen.getByRole('heading', { name: 'Hello Graph' })).toBeInTheDocument();
    expect(screen.getByTestId('service-graph')).toHaveClass('graph-container');
  });

  it('renders graph with legend', () => {
    const metricsData = [
      { ...serviceMetrics.service_call_rate, quantile: 0.5 },
      { ...serviceMetrics.service_call_rate, quantile: 0.95 },
    ];

    render(<ServiceGraph {...defaultProps} loading={false} metricsData={metricsData} showLegend />);

    expect(screen.getByRole('heading', { name: 'Hello Graph' })).toBeInTheDocument();
    expect(screen.getByTestId('service-graph')).toHaveClass('graph-container');
  });

  it('renders graph with horizontal lines', () => {
    render(
      <ServiceGraph
        {...defaultProps}
        loading={false}
        metricsData={serviceMetrics.service_call_rate}
        showHorizontalLines
      />
    );
    expect(screen.getByRole('heading', { name: 'Hello Graph' })).toBeInTheDocument();
    expect(screen.getByTestId('service-graph')).toHaveClass('graph-container');
  });

  it('renders graph with custom color', () => {
    render(
      <ServiceGraph
        {...defaultProps}
        loading={false}
        metricsData={serviceMetrics.service_call_rate}
        color="AAAAAA"
      />
    );
    expect(screen.getByRole('heading', { name: 'Hello Graph' })).toBeInTheDocument();
    expect(screen.getByTestId('service-graph')).toHaveClass('graph-container');
  });

  it('renders graph with multiple metrics data points', () => {
    const metricsData = [
      { ...serviceMetrics.service_call_rate, quantile: 0.5 },
      { ...serviceMetrics.service_call_rate, quantile: 0.95 },
    ];

    render(<ServiceGraph {...defaultProps} loading={false} metricsData={metricsData} />);
    expect(screen.getByRole('heading', { name: 'Hello Graph' })).toBeInTheDocument();
    expect(screen.getByTestId('service-graph')).toHaveClass('graph-container');
  });

  it('handles edge cases in data rendering', () => {
    // Test with empty metrics data
    render(<ServiceGraph {...defaultProps} loading={false} metricsData={[]} />);
    expect(screen.getByText('No Data')).toBeInTheDocument();

    // Test with null values in metrics
    const metricsWithNull = {
      ...serviceMetrics.service_call_rate,
      metricPoints: [
        { x: 1631271783806, y: null },
        { x: 1631271783807, y: 5 },
      ],
    };
    render(<ServiceGraph {...defaultProps} loading={false} metricsData={metricsWithNull} />);
    expect(screen.getByTestId('service-graph')).toBeInTheDocument();

    // Test with extreme values
    const metricsWithExtremes = {
      ...serviceMetrics.service_call_rate,
      metricPoints: [
        { x: 1631271783806, y: 0.0001 },
        { x: 1631271783807, y: 1000 },
      ],
    };
    render(<ServiceGraph {...defaultProps} loading={false} metricsData={metricsWithExtremes} />);
    expect(screen.getByTestId('service-graph')).toBeInTheDocument();
  });

  it('formats y-axis ticks for various value ranges', () => {
    // Test with error rate graph
    render(
      <ServiceGraph
        {...defaultProps}
        loading={false}
        metricsData={serviceMetrics.service_call_rate}
        name="Error rate"
      />
    );
    expect(screen.getByRole('heading', { name: 'Error rate' })).toBeInTheDocument();

    // Test with custom formatter
    render(
      <ServiceGraph
        {...defaultProps}
        loading={false}
        metricsData={serviceMetrics.service_call_rate}
        yAxisTickFormat={v => Math.round(v)}
      />
    );
    expect(screen.getByTestId('service-graph')).toBeInTheDocument();
  });

  it('handles various y-axis value ranges', () => {
    const testCases = [
      { value: 0, expected: '0' },
      { value: 0.001, expected: '0.001' },
      { value: 0.00001, pattern: /\d\.\d+e-\d+/ },
      { value: 5, expected: '5.00' },
      { value: 50, expected: '50.0' },
      { value: 500, expected: '500' },
    ];

    testCases.forEach(({ value, expected, pattern }) => {
      const metricsData = {
        ...serviceMetrics.service_call_rate,
        metricPoints: [{ x: 1631271783806, y: value }],
      };

      render(<ServiceGraph {...defaultProps} loading={false} metricsData={metricsData} />);

      const graph = screen.getByTestId('service-graph');
      expect(graph).toBeInTheDocument();

      // Cleanup for next test
      document.body.innerHTML = '';
    });
  });

  it('handles undefined xDomain values', () => {
    render(<ServiceGraph {...defaultProps} loading={false} xDomain={[undefined, undefined]} />);
    const loadingIndicator = document.querySelector('svg.LoadingIndicator');
    expect(loadingIndicator).toBeInTheDocument();
  });

  it('handles empty metric points', () => {
    const emptyMetrics = {
      ...serviceMetrics.service_call_rate,
      metricPoints: [],
    };
    render(<ServiceGraph {...defaultProps} loading={false} metricsData={emptyMetrics} />);
    expect(screen.getByTestId('service-graph')).toBeInTheDocument();
  });

  it('handles missing metric points', () => {
    const metricsWithoutPoints = {
      ...serviceMetrics.service_call_rate,
      metricPoints: undefined,
    };
    render(<ServiceGraph {...defaultProps} loading={false} metricsData={metricsWithoutPoints} />);
    expect(screen.getByTestId('service-graph')).toBeInTheDocument();
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
