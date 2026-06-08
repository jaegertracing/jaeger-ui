// Copyright (c) 2021 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { MonitorATMServicesViewImpl as MonitorATMServicesView } from '.';
import { getLoopbackInterval, timeFrameOptions, yAxisTickFormat } from './timeFrameUtils';
import { useServices } from '../../../hooks/useTraceDiscovery';
import { useServiceMetricsQuery, useOperationMetricsQuery } from '../../../hooks/useMetricsQuery';
import { ONE_HOUR_MS, TIME_RANGE_OPTIONS } from '../../../utils/time-range-options';
import {
  serviceMetrics,
  serviceOpsMetrics,
  serviceMetricsWithOneServiceLatency,
  originInitialState,
} from '../../../reducers/metrics.mock';
import * as track from './index.track';

global.ResizeObserver = jest.fn().mockImplementation(function () {
  return { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() };
});

vi.mock('../../../utils/config/get-config', async () => ({
  default: jest.fn(() => ({
    monitor: {
      docsLink: 'https://www.jaegertracing.io/docs/latest/spm/',
    },
    qualityMetrics: {
      apiEndpoint: '/api/quality-metrics',
    },
  })),
}));

vi.mock('../../../utils/storage', async () => ({
  default: {
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBool: jest.fn(),
    getJSON: jest.fn(),
    set: jest.fn(),
  },
}));

vi.mock('../../../hooks/useTraceDiscovery', async () => ({
  useServices: jest.fn(() => ({ data: ['service1', 'service2'], isLoading: false })),
}));

vi.mock('../../../hooks/useMetricsQuery', async () => ({
  useServiceMetricsQuery: jest.fn(() => ({
    data: { serviceMetrics, serviceError: originInitialState.serviceError },
    isFetching: false,
  })),
  useOperationMetricsQuery: jest.fn(() => ({
    data: { serviceOpsMetrics, opsError: originInitialState.opsError },
    isFetching: false,
  })),
}));

// Store the default mock implementation for reset in afterEach
const defaultUseServicesImpl = () => ({ data: ['service1', 'service2'], isLoading: false });
const defaultServiceMetricsImpl = () => ({
  data: { serviceMetrics, serviceError: originInitialState.serviceError },
  isFetching: false,
});
const defaultOperationMetricsImpl = () => ({
  data: { serviceOpsMetrics, opsError: originInitialState.opsError },
  isFetching: false,
});

vi.mock('lodash/debounce', async () => mockDefault(fn => fn));

vi.mock('../../common/LoadingIndicator', async () => {
  return mockDefault(function LoadingIndicator() {
    return <div data-testid="loading-indicator">Loading...</div>;
  });
});

vi.mock('../EmptyState', async () => {
  return mockDefault(function MonitorATMEmptyState() {
    return <div data-testid="empty-state">ATM not configured</div>;
  });
});

vi.mock('./serviceGraph', async () => {
  return mockDefault(function ServiceGraph({ yAxisTickFormat, name, error, width }) {
    const testValue = yAxisTickFormat ? yAxisTickFormat(1000) : null;
    return (
      <div data-testid={`service-graph-${name?.toLowerCase().replace(/[^a-z0-9]/g, '-')}`} data-width={width}>
        Service Graph: {name}
        {testValue && <span data-testid="tick-format-result">{testValue}</span>}
        {error && <span data-testid="graph-error">Error occurred</span>}
      </div>
    );
  });
});

vi.mock('./operationDetailsTable', async () => {
  return mockDefault(function OperationTableDetails({ loading, error, data }) {
    return (
      <div data-testid="operation-table">
        {loading && <span data-testid="table-loading">Loading operations...</span>}
        {error && <span data-testid="table-error">Error loading operations</span>}
        {data && <span data-testid="table-data">Operations data loaded</span>}
      </div>
    );
  });
});

vi.mock('../../common/SearchableSelect', async () => {
  return mockDefault(function SearchableSelect({
    children,
    value,
    onChange,
    placeholder,
    disabled,
    className,
  }) {
    return (
      <select
        data-testid={className}
        value={value}
        onChange={e => {
          if (onChange) {
            const newValue =
              className === 'select-a-timeframe-input' ? parseInt(e.target.value, 10) : e.target.value;
            onChange(newValue);
          }
        }}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
    );
  });
});

vi.mock('antd', async () => {
  const actualAntd = await vi.importActual('antd');
  return {
    ...actualAntd,
    Input: {
      ...actualAntd.Input,
      Search: function SearchComponent({ placeholder, className, value, onChange }) {
        return <input data-testid={className} placeholder={placeholder} value={value} onChange={onChange} />;
      },
    },
    Select: {
      Option: function Option({ children, value }) {
        return <option value={value}>{children}</option>;
      },
    },
  };
});

Date.now = jest.fn(() => 1487076708000); // Tue, 14 Feb 2017 12:51:48 GMT'

const renderWithRouter = component => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe('<MonitorATMServicesView>', () => {
  let wrapper;

  beforeAll(() => {
    Date.now = jest.fn(() => 1466424490000);
  });

  beforeEach(() => {
    cleanup();
    wrapper = renderWithRouter(<MonitorATMServicesView />);
  });

  afterEach(() => {
    wrapper = null;
    jest.clearAllMocks();
    useServices.mockReset();
    useServices.mockImplementation(defaultUseServicesImpl);
    useServiceMetricsQuery.mockReset();
    useServiceMetricsQuery.mockImplementation(defaultServiceMetricsImpl);
    useOperationMetricsQuery.mockReset();
    useOperationMetricsQuery.mockImplementation(defaultOperationMetricsImpl);
    cleanup();
  });

  it('does not explode', () => {
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('Span Kind')).toBeInTheDocument();
    expect(screen.getByTestId('select-a-service-input')).toBeInTheDocument();
  });

  it('shows a loading indicator when loading services list', () => {
    cleanup();
    useServices.mockReturnValue({ data: [], isLoading: true });
    renderWithRouter(<MonitorATMServicesView />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('do not show a loading indicator once data loaded', () => {
    cleanup();
    useServices.mockReturnValue({ data: ['apple'], isLoading: false });
    renderWithRouter(<MonitorATMServicesView />);
    expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
  });

  it('recalculates graph width when services finish loading (#3539)', async () => {
    cleanup();
    const offsetWidthSpy = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);

    try {
      useServices.mockReturnValue({ data: [], isLoading: true });
      const { rerender } = renderWithRouter(<MonitorATMServicesView />);
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

      useServices.mockReturnValue({ data: ['apple'], isLoading: false });
      rerender(
        <MemoryRouter>
          <MonitorATMServicesView />
        </MemoryRouter>
      );

      await waitFor(() => {
        const graphs = screen.getAllByTestId(/^service-graph-/);
        expect(graphs.length).toBeGreaterThan(0);
        expect(Number(graphs[0].getAttribute('data-width'))).toBeGreaterThan(300);
      });
    } finally {
      offsetWidthSpy.mockRestore();
    }
  });

  it('renders with one service latency', () => {
    cleanup();
    useServices.mockReturnValue({ data: ['apple'], isLoading: false });
    useServiceMetricsQuery.mockReturnValue({
      data: {
        serviceMetrics: serviceMetricsWithOneServiceLatency,
        serviceError: originInitialState.serviceError,
      },
      isFetching: false,
    });
    renderWithRouter(<MonitorATMServicesView />);
    expect(screen.getByTestId('service-graph-latency--ms-')).toBeInTheDocument();
    expect(screen.getByText(/Operations metrics under/)).toBeInTheDocument();
  });

  it('does not query metrics when no services are available', () => {
    cleanup();
    useServices.mockReturnValue({ data: [], isLoading: false });
    useServiceMetricsQuery.mockReturnValue({ data: undefined, isFetching: false });
    useOperationMetricsQuery.mockReturnValue({ data: undefined, isFetching: false });
    renderWithRouter(<MonitorATMServicesView />);
    expect(useServiceMetricsQuery).toHaveBeenCalledWith(undefined, undefined);
    expect(useOperationMetricsQuery).toHaveBeenCalledWith(undefined, undefined);
  });

  it('ATM snapshot test (DOM)', () => {
    cleanup();
    useServices.mockReturnValue({ data: ['apple', 'orange'], isLoading: false });
    renderWithRouter(<MonitorATMServicesView />);
    expect(screen.getAllByText('Service')[0]).toBeInTheDocument();
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('orange')).toBeInTheDocument();
  });

  it('ATM snapshot test with no metrics (DOM)', () => {
    cleanup();
    useServiceMetricsQuery.mockReturnValue({
      data: {
        serviceMetrics: { service_latencies: null, service_call_rate: null, service_error_rate: null },
        serviceError: originInitialState.serviceError,
      },
      isFetching: false,
    });
    renderWithRouter(<MonitorATMServicesView />);
    expect(screen.getAllByText(/No data yet!/)[0]).toBeInTheDocument();
    expect(screen.getByText(/instructions/)).toBeInTheDocument();
  });

  it('handles null error rate values in metrics', () => {
    cleanup();
    useServices.mockReturnValue({ data: ['apple'], isLoading: false });
    useServiceMetricsQuery.mockReturnValue({
      data: {
        serviceMetrics: {
          service_latencies: serviceMetrics.service_latencies,
          service_error_rate: {
            metricPoints: [
              { x: 1, y: null },
              { x: 2, y: 0.25 },
            ],
            quantile: 0.5,
            serviceName: 'cartservice',
          },
          service_call_rate: serviceMetrics.service_call_rate,
        },
        serviceError: originInitialState.serviceError,
      },
      isFetching: false,
    });
    renderWithRouter(<MonitorATMServicesView />);
    expect(screen.getByTestId('service-graph-error-rate----')).toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
  });

  it('render one service latency', () => {
    cleanup();
    useServiceMetricsQuery.mockReturnValue({
      data: {
        serviceMetrics: serviceMetricsWithOneServiceLatency,
        serviceError: originInitialState.serviceError,
      },
      isFetching: false,
    });
    renderWithRouter(<MonitorATMServicesView />);
    expect(screen.getByTestId('service-graph-latency--ms-')).toBeInTheDocument();
    expect(screen.getByText('Span Kind')).toBeInTheDocument();
  });

  it('ComponentWillUnmount remove listener', () => {
    const remover = jest.spyOn(global, 'removeEventListener').mockImplementation(() => {});
    const { unmount } = renderWithRouter(<MonitorATMServicesView />);
    unmount();
    expect(remover).toHaveBeenCalled();
  });

  it('resize window test', () => {
    renderWithRouter(<MonitorATMServicesView />);

    global.dispatchEvent(new Event('resize'));
    const spanKindSelectors = screen.getAllByTestId('span-kind-selector');
    expect(spanKindSelectors.length).toBeGreaterThan(0);
    expect(spanKindSelectors[0]).toBeInTheDocument();
  });

  describe('User interactions and tracking', () => {
    let trackSelectServiceSpy;
    let trackSelectSpanKindSpy;
    let trackSelectTimeframeSpy;
    let trackSearchOperationSpy;
    let trackViewAllTracesSpy;

    beforeEach(() => {
      trackSelectServiceSpy = jest.spyOn(track, 'trackSelectService').mockImplementation(() => {});
      trackSelectSpanKindSpy = jest.spyOn(track, 'trackSelectSpanKind').mockImplementation(() => {});
      trackSelectTimeframeSpy = jest.spyOn(track, 'trackSelectTimeframe').mockImplementation(() => {});
      trackSearchOperationSpy = jest.spyOn(track, 'trackSearchOperation').mockImplementation(() => {});
      trackViewAllTracesSpy = jest.spyOn(track, 'trackViewAllTraces').mockImplementation(() => {});
    });

    afterEach(() => {
      trackSelectServiceSpy.mockRestore();
      trackSelectSpanKindSpy.mockRestore();
      trackSelectTimeframeSpy.mockRestore();
      trackSearchOperationSpy.mockRestore();
      trackViewAllTracesSpy.mockRestore();
    });

    it('should handle service change and call tracking', async () => {
      cleanup();
      const user = userEvent.setup();
      useServices.mockReturnValue({ data: ['apple', 'orange'], isLoading: false });

      renderWithRouter(<MonitorATMServicesView />);

      const serviceSelect = screen.getByTestId('select-a-service-input');
      await user.selectOptions(serviceSelect, 'orange');

      await waitFor(() => {
        expect(trackSelectServiceSpy).toHaveBeenCalledWith('orange');
      });
    });

    it('should handle span kind change and call tracking', async () => {
      cleanup();
      const user = userEvent.setup();
      useServices.mockReturnValue({ data: ['apple'], isLoading: false });

      renderWithRouter(<MonitorATMServicesView />);

      const spanKindSelect = screen.getByTestId('span-kind-selector');
      await user.selectOptions(spanKindSelect, 'client');

      await waitFor(() => {
        expect(trackSelectSpanKindSpy).toHaveBeenCalledWith('Client');
      });
    });

    it('should handle timeframe change and call tracking', async () => {
      cleanup();
      const user = userEvent.setup();
      useServices.mockReturnValue({ data: ['apple'], isLoading: false });

      renderWithRouter(<MonitorATMServicesView />);

      const timeframeSelect = screen.getByTestId('select-a-timeframe-input');
      await user.selectOptions(timeframeSelect, String(2 * 3600000));

      await waitFor(() => {
        expect(trackSelectTimeframeSpy).toHaveBeenCalledWith('2 hours');
      });
    });

    it('should test yAxisTickFormat function through ServiceGraph', () => {
      cleanup();
      useServices.mockReturnValue({ data: ['apple'], isLoading: false });

      renderWithRouter(<MonitorATMServicesView />);

      const tickFormatResult = screen.getAllByTestId('tick-format-result')[0];
      expect(tickFormatResult).toBeInTheDocument();
      expect(tickFormatResult).toHaveTextContent('1');
    });

    it('search test', async () => {
      cleanup();
      const user = userEvent.setup();
      useServices.mockReturnValue({ data: ['apple'], isLoading: false });

      renderWithRouter(<MonitorATMServicesView />);

      const searchInput = screen.getByTestId('select-operation-input');

      await user.type(searchInput, 'place');
      expect(searchInput.value).toBe('place');
      expect(trackSearchOperationSpy).toHaveBeenCalledWith('place');

      await user.clear(searchInput);
      await user.type(searchInput, 'qqq');
      expect(searchInput.value).toBe('qqq');
      expect(trackSearchOperationSpy).toHaveBeenCalledWith('qqq');

      await user.clear(searchInput);
      expect(searchInput.value).toBe('');
    });

    it('Error in serviceLatencies', () => {
      cleanup();
      const someError = new Error('some API error');
      useServices.mockReturnValue({ data: ['apple', 'orange'], isLoading: false });

      useServiceMetricsQuery.mockReturnValue({
        data: {
          serviceMetrics,
          serviceError: {
            ...originInitialState.serviceError,
            service_latencies_50: someError,
          },
        },
        isFetching: false,
      });
      renderWithRouter(<MonitorATMServicesView />);
      expect(screen.getByText('Service')).toBeInTheDocument();

      cleanup();
      useServiceMetricsQuery.mockReturnValue({
        data: {
          serviceMetrics,
          serviceError: {
            service_latencies_50: someError,
            service_latencies_75: someError,
            service_latencies_95: someError,
            service_call_rate: null,
            service_error_rate: null,
          },
        },
        isFetching: false,
      });
      renderWithRouter(<MonitorATMServicesView />);
      expect(screen.getByTestId('graph-error')).toBeInTheDocument();
    });

    it('Should track view all traces', async () => {
      cleanup();
      const user = userEvent.setup();
      useServices.mockReturnValue({ data: ['apple', 'orange'], isLoading: false });

      renderWithRouter(<MonitorATMServicesView />);

      const viewAllTracesLink = screen.getByText('View all traces');
      await user.click(viewAllTracesLink);
      expect(trackViewAllTracesSpy).toHaveBeenCalled();
    });
  });
});

describe('<MonitorATMServicesView> on page load', () => {
  beforeEach(() => {
    cleanup();
    useServices.mockReturnValue({ data: ['apple'], isLoading: false });
    useServiceMetricsQuery.mockImplementation(defaultServiceMetricsImpl);
    useOperationMetricsQuery.mockImplementation(defaultOperationMetricsImpl);
    renderWithRouter(<MonitorATMServicesView />);
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('calls metric hooks with the active service on mount', () => {
    expect(useServiceMetricsQuery).toHaveBeenCalledWith('apple', expect.objectContaining({ quantile: 0.95 }));
    expect(useOperationMetricsQuery).toHaveBeenCalledWith(
      'apple',
      expect.objectContaining({ quantile: 0.95 })
    );
  });
});

describe('getLoopbackInterval()', () => {
  it('undefined value', () => {
    expect(getLoopbackInterval()).toBe('');
  });

  it('timeframe NOT exists', () => {
    expect(getLoopbackInterval(111)).toBe('');
  });

  it('timeframe exists', () => {
    expect(getLoopbackInterval(48 * 3600000)).toBe('2 days');
  });
});

describe('timeFrameOptions', () => {
  it('includes shared search time ranges through 2 days', () => {
    const maxMonitorTimeframe = 48 * ONE_HOUR_MS;
    const expectedValues = TIME_RANGE_OPTIONS.filter(({ valueMs }) => valueMs <= maxMonitorTimeframe).map(
      ({ valueMs }) => valueMs
    );

    expect(timeFrameOptions.map(({ value }) => value)).toEqual(expectedValues);
  });
});

describe('yAxisTickFormat', () => {
  it('value is 2 second', () => {
    const timeInMs = 1000;
    const displayTimeUnit = 'seconds';
    expect(yAxisTickFormat(timeInMs, displayTimeUnit)).toBe(1);
  });
});
