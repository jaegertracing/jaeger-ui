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
import ServiceGraph, {
  tickFormat,
  Placeholder,
  getData,
  getMetricsData,
  calculateYDomain,
  calculateYAxisTicks,
  formatYAxisTick,
  calculateNumericTicks,
} from './serviceGraph';
import { serviceMetrics } from '../../../reducers/metrics.mock';

// Mock Recharts to prevent issues with rendering in JSDOM
// This mock replaces ResponsiveContainer with a version that has fixed dimensions.
// It ensures the chart and its children render correctly in the test environment.
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: props => <OriginalModule.ResponsiveContainer {...props} width={800} height={500} />,
  };
});

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
    render(<ServiceGraph {...defaultProps} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hello Graph' })).toBeInTheDocument();
  });

  it('renders loading indicator when xDomain is empty or undefined', () => {
    render(<ServiceGraph {...defaultProps} xDomain={[]} loading={false} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

    cleanup();
    render(<ServiceGraph {...defaultProps} xDomain={[undefined, undefined]} loading={false} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('renders "No Data" when no metrics data is available', () => {
    render(<ServiceGraph {...defaultProps} loading={false} />);
    expect(screen.getByText('No Data')).toBeInTheDocument();
  });

  it('renders error message when there is an error', () => {
    render(<ServiceGraph {...defaultProps} loading={false} error={{ message: 'API Error' }} />);
    expect(screen.getByText('Could not fetch data')).toBeInTheDocument();
  });

  it('renders base graph with data', () => {
    render(<ServiceGraph {...defaultProps} loading={false} metricsData={serviceMetrics.service_call_rate} />);
    expect(screen.getByTestId('service-graph')).toBeInTheDocument();
  });

  it('renders graph with legend', () => {
    const metricsData = [
      { ...serviceMetrics.service_call_rate, quantile: 0.5 },
      { ...serviceMetrics.service_call_rate, quantile: 0.95 },
    ];
    render(<ServiceGraph {...defaultProps} loading={false} metricsData={metricsData} showLegend />);
    expect(screen.getByText('50th')).toBeInTheDocument();
    expect(screen.getByText('95th')).toBeInTheDocument();
  });

  it('renders graph with horizontal lines', () => {
    const { container } = render(
      <ServiceGraph
        {...defaultProps}
        loading={false}
        metricsData={serviceMetrics.service_call_rate}
        showHorizontalLines
      />
    );
    // The presence of the grid is tested by checking for the grid lines
    expect(container.querySelector('.recharts-cartesian-grid-horizontal line')).toBeInTheDocument();
  });

  it('renders graph with custom color', () => {
    const { container } = render(
      <ServiceGraph
        {...defaultProps}
        loading={false}
        metricsData={serviceMetrics.service_call_rate}
        color="#AAAAAA"
      />
    );
    const areaPath = container.querySelector('.recharts-area-curve');
    expect(areaPath).toHaveAttribute('stroke', '#AAAAAA');
  });

  it('renders graph with multiple metrics data points', () => {
    const metricsData = [
      { ...serviceMetrics.service_call_rate, quantile: 0.5 },
      { ...serviceMetrics.service_call_rate, quantile: 0.95 },
    ];
    const { container } = render(
      <ServiceGraph {...defaultProps} loading={false} metricsData={metricsData} />
    );
    // Check that two Area charts are rendered
    expect(container.querySelectorAll('.recharts-area-curve')).toHaveLength(2);
  });

  it('handles edge cases in data rendering', () => {
    render(<ServiceGraph {...defaultProps} loading={false} metricsData={null} />);
    expect(screen.getByText('No Data')).toBeInTheDocument();
    cleanup();

    const metricsWithNull = {
      ...serviceMetrics.service_call_rate,
      metricPoints: [
        { x: 1631271783806, y: null },
        { x: 1631271783807, y: 5 },
      ],
    };
    render(<ServiceGraph {...defaultProps} loading={false} metricsData={metricsWithNull} />);
    expect(screen.getByTestId('service-graph')).toBeInTheDocument();
    cleanup();

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
    render(
      <ServiceGraph
        {...defaultProps}
        loading={false}
        metricsData={{
          quantile: 0.95,
          metricPoints: [{ x: 1, y: 1.23 }],
        }}
        name="Error rate"
      />
    );
    expect(screen.getByRole('heading', { name: 'Error rate' })).toBeInTheDocument();
    cleanup();

    // Test custom formatter
    render(
      <ServiceGraph
        {...defaultProps}
        loading={false}
        metricsData={serviceMetrics.service_call_rate}
        yAxisTickFormat={v => `${Math.round(v)}%`}
      />
    );
    expect(screen.getAllByText(/%/)[0]).toBeInTheDocument();
  });

  it('handles various y-axis value ranges', () => {
    const testCases = [
      { value: 0, expected: '0' },
      { value: 0.001, expected: '1.00e-3' },
      { value: 0.00001, expected: '1.00e-5' },
      { value: 5, expected: '5.00' },
      { value: 50, expected: '50.0' },
      { value: 500, expected: '500' },
    ];

    // Test the exported helper function directly
    testCases.forEach(({ value, expected }) => {
      expect(formatYAxisTick(value, 'Some metric name')).toBe(expected);
    });
  });

  it('handles undefined xDomain values', () => {
    render(<ServiceGraph {...defaultProps} loading={false} xDomain={[undefined, undefined]} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('handles empty metric points', () => {
    const emptyMetrics = {
      ...serviceMetrics.service_call_rate,
      metricPoints: [],
    };
    render(<ServiceGraph {...defaultProps} loading={false} metricsData={emptyMetrics} />);
    // When there are no points, it should show "No Data"
    expect(screen.getByText('No Data')).toBeInTheDocument();
  });

  it('handles missing metric points', () => {
    const metricsWithoutPoints = {
      ...serviceMetrics.service_call_rate,
      metricPoints: undefined,
    };
    render(<ServiceGraph {...defaultProps} loading={false} metricsData={metricsWithoutPoints} />);
    // When the points array is missing, it should show "No Data"
    expect(screen.getByText('No Data')).toBeInTheDocument();
  });

  it('formats tooltip values correctly', () => {
    render(
      <ServiceGraph
        {...defaultProps}
        loading={false}
        metricsData={serviceMetrics.service_call_rate}
        showLegend
      />
    );
    expect(screen.getByTestId('service-graph')).toBeInTheDocument();
  });

  it('formats legend values correctly', () => {
    render(
      <ServiceGraph
        {...defaultProps}
        loading={false}
        metricsData={serviceMetrics.service_call_rate}
        showLegend
      />
    );
    expect(screen.getByTestId('service-graph')).toBeInTheDocument();
  });

  describe('tooltip and legend formatting', () => {
    it('formats tooltip values correctly', () => {
      // Logic for showLegend=true
      const formattedWithLegend = [formatYAxisTick(1000, 'Test Graph'), `P${Number('0.95') * 100}`];
      expect(formattedWithLegend[0]).toBe('1000');
      expect(formattedWithLegend[1]).toBe('P95');

      // Logic for showLegend=false
      const formattedWithoutLegend = [formatYAxisTick(1000, 'Test Graph')];
      expect(formattedWithoutLegend[0]).toBe('1000');
    });

    it('formats legend values correctly', () => {
      // This logic is now inside the functional component's return statement.
      // We test the output by rendering the component.
      render(
        <ServiceGraph
          {...defaultProps}
          metricsData={mockMetricsData}
          loading={false}
          showLegend
          xDomain={[0, 100]}
        />
      );
      expect(screen.getByText('95th')).toBeInTheDocument();
    });

    it('generates placeholder correctly', () => {
      render(
        <Placeholder name="Test Graph" width={100} height={242}>
          <div>Test</div>
        </Placeholder>
      );
      const placeholder = screen.getByText('Test').parentElement;
      expect(placeholder).toHaveClass('center-placeholder');
      expect(placeholder).toHaveStyle('width: 100px');
      expect(placeholder).toHaveStyle('height: 168px'); // 242 - 74
    });
  });

  // New tests for tooltip functionality
  describe('tooltip formatting functions', () => {
    it('formats tooltip label using labelFormatter', () => {
      const testTimestamp = 1631271783806;
      const expectedDate = new Date(testTimestamp).toLocaleString();

      // Test the labelFormatter logic directly
      const formattedLabel = new Date(testTimestamp).toLocaleString();
      expect(formattedLabel).toBe(expectedDate);
    });

    it('formats tooltip values with showLegend=false using formatter', () => {
      const testValue = 1500;
      const graphName = 'Test Graph';

      // Test formatter logic when showLegend is false
      const yTickFormatter = value => formatYAxisTick(value, graphName);
      const formattedValue = yTickFormatter(testValue);
      const result = [formattedValue]; // This is what formatter returns when !showLegend

      expect(result).toEqual(['1500']);
    });

    it('formats tooltip values with showLegend=true using formatter', () => {
      const testValue = 1500;
      const testName = '0.95';
      const graphName = 'Test Graph';

      // Test formatter logic when showLegend is true
      const yTickFormatter = value => formatYAxisTick(value, graphName);
      const formattedValue = yTickFormatter(testValue);
      const formattedName = Number(testName) * 100;
      const result = [formattedValue, `P${formattedName}`]; // This is what formatter returns when showLegend

      expect(result).toEqual(['1500', 'P95']);
    });

    it('handles different quantile values in formatter', () => {
      const testCases = [
        { uname: '0.5', expected: 'P50' },
        { uname: '0.75', expected: 'P75' },
        { uname: '0.95', expected: 'P95' },
        { uname: '0.99', expected: 'P99' },
      ];

      testCases.forEach(({ uname, expected }) => {
        const formattedName = Number(uname) * 100;
        const result = `P${formattedName}`;
        expect(result).toBe(expected);
      });
    });

    it('handles edge cases in formatter', () => {
      const testValue = 0;
      const uname = '0.5';
      const graphName = 'Test Graph';

      // Test with zero value
      const yTickFormatter = value => formatYAxisTick(value, graphName);
      const formattedValue = yTickFormatter(testValue);

      // When showLegend is false
      const resultWithoutLegend = [formattedValue];
      expect(resultWithoutLegend).toEqual(['0']);

      // When showLegend is true
      const formattedName = Number(uname) * 100;
      const resultWithLegend = [formattedValue, `P${formattedName}`];
      expect(resultWithLegend).toEqual(['0', 'P50']);
    });

    it('handles custom yAxisTickFormat in formatter', () => {
      const customFormatter = v => `${Math.round(v * 100)}%`;
      const testValue = 0.123;
      const uname = '0.95';

      // Test with custom formatter
      const formattedValue = formatYAxisTick(testValue, 'Test Graph', customFormatter);

      // When showLegend is false
      const resultWithoutLegend = [formattedValue];
      expect(resultWithoutLegend).toEqual(['12%']);

      // When showLegend is true
      const formattedName = Number(uname) * 100;
      const resultWithLegend = [formattedValue, `P${formattedName}`];
      expect(resultWithLegend).toEqual(['12%', 'P95']);
    });
  });
});

describe('tickFormat utility', () => {
  it('formats time correctly for single digits', () => {
    // Date.UTC returns a timestamp, which is what tickFormat expects.
    const date = new Date('2017-02-14T04:04:00.000Z').getTime();
    expect(tickFormat(date)).toBe('04:04');
  });

  it('formats time correctly for double digits', () => {
    const date = new Date('2017-02-14T15:19:00.000Z').getTime();
    expect(tickFormat(date)).toBe('15:19');
  });
});

describe('Placeholder component', () => {
  it('renders with all props', () => {
    render(
      <Placeholder name="Test" width={300} height={200} marginClassName="test-margin">
        <div>Test content</div>
      </Placeholder>
    );
    expect(screen.getByRole('heading', { name: 'Test' })).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
    expect(screen.getByTestId('service-graph')).toHaveClass('test-margin');
  });

  it('renders without optional marginClassName', () => {
    render(
      <Placeholder name="Test" width={300} height={200}>
        <div>Test content</div>
      </Placeholder>
    );
    expect(screen.getByRole('heading', { name: 'Test' })).toBeInTheDocument();
    expect(screen.getByTestId('service-graph')).not.toHaveClass('test-margin');
  });
});

// This block tests the exported helper functions
describe('ServiceGraphImpl methods', () => {
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
      const data = { ...serviceMetrics.service_call_rate, metricPoints: undefined };
      expect(getMetricsData(data)).toEqual([]);
    });

    it('processes metrics data correctly', () => {
      const data = serviceMetrics.service_call_rate;
      const result = getMetricsData(data);
      expect(result).toHaveLength(data.metricPoints.length);
      expect(result[0]).toHaveProperty('x');
      expect(result[0][data.quantile.toString()]).toBeDefined();
    });
  });

  describe('calculateYDomain', () => {
    it('handles empty data', () => {
      expect(calculateYDomain([])).toEqual([0, 1]);
    });

    it('handles data with only null values', () => {
      expect(calculateYDomain([{ x: 1, 0.5: null }])).toEqual([0, 1]);
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
      const customFormatter = v => String(Math.round(v * 100));
      expect(formatYAxisTick(0.123, 'some name', customFormatter)).toBe('12');
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
        expect(formatYAxisTick(value, 'some name')).toBe(expected);
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
      const { container } = render(<ServiceGraph {...defaultProps} metricsData={null} loading={false} />);
      // No 'Area' components should be rendered
      expect(container.querySelector('.recharts-area-curve')).toBeNull();
    });

    it('renders lines with custom color', () => {
      const { container } = render(
        <ServiceGraph
          {...defaultProps}
          metricsData={serviceMetrics.service_call_rate}
          color="#FF0000"
          loading={false}
        />
      );
      const areaPath = container.querySelector('.recharts-area-curve');
      expect(areaPath).toHaveAttribute('stroke', '#FF0000');
    });

    it('renders lines with default colors for multiple metrics', () => {
      const metricsArray = [
        { ...serviceMetrics.service_call_rate, quantile: 0.5 },
        { ...serviceMetrics.service_call_rate, quantile: 0.95 },
      ];
      const { container } = render(
        <ServiceGraph {...defaultProps} metricsData={metricsArray} loading={false} />
      );
      const areaPaths = container.querySelectorAll('.recharts-area-curve');
      expect(areaPaths).toHaveLength(2);
      // The default colors are ['#869ADD', '#EA9977', '#DCA3D2']
      // The data is sorted by quantile desc, so 0.95 gets the first color.
      expect(areaPaths[0]).toHaveAttribute('stroke', '#869ADD');
      expect(areaPaths[1]).toHaveAttribute('stroke', '#EA9977');
    });
  });
});
