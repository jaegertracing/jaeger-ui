// Copyright (c) 2021 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import {
  MonitorATMServicesViewImpl as MonitorATMServicesView,
  mapStateToProps,
  mapDispatchToProps,
  getLoopbackInterval,
  yAxisTickFormat,
} from '.';
import JaegerAPI from '../../../api/jaeger';
import store from '../../../utils/storage';
import { useServices } from '../../../hooks/useTraceDiscovery';
import {
  originInitialState,
  serviceMetrics,
  serviceOpsMetrics,
  serviceMetricsWithOneServiceLatency,
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

// Store the default mock implementation for reset in afterEach
const defaultUseServicesImpl = () => ({ data: ['service1', 'service2'], isLoading: false });

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

vi.mock('../../../api/jaeger', async () => ({
  default: {
    fetchMetricDimensions: jest.fn(() => Promise.resolve([])),
  },
}));

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

const state = {
  services: {},
  metrics: { ...originInitialState },
  selectedService: undefined,
};

const props = mapStateToProps(state);

Date.now = jest.fn(() => 1487076708000); // Tue, 14 Feb 2017 12:51:48 GMT'

const renderWithRouter = component => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe('<MonitorATMServicesView>', () => {
  let wrapper;
  const mockFetchServices = jest.fn();
  const mockFetchAllServiceMetrics = jest.fn();
  const mockFetchAggregatedServiceMetrics = jest.fn();

  beforeAll(() => {
    Date.now = jest.fn(() => 1466424490000);
  });

  beforeEach(() => {
    cleanup();
    const defaultProps = {
      ...props,
      fetchServices: mockFetchServices,
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
    };
    wrapper = renderWithRouter(<MonitorATMServicesView {...defaultProps} />);
  });

  afterEach(() => {
    wrapper = null;
    jest.clearAllMocks();
    // Reset useServices mock to default implementation to avoid test order-dependence
    useServices.mockReset();
    useServices.mockImplementation(defaultUseServicesImpl);
    cleanup();
  });

  it('does not explode', () => {
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('Span Kind')).toBeInTheDocument();
    expect(screen.getByTestId('select-a-service-input')).toBeInTheDocument();
  });

  it('shows a loading indicator when loading services list', () => {
    cleanup();
    const loadingProps = {
      ...props,
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
    };
    useServices.mockReturnValue({ data: [], isLoading: true });
    renderWithRouter(<MonitorATMServicesView {...loadingProps} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('do not show a loading indicator once data loaded', () => {
    cleanup();
    const loadedProps = {
      ...props,
      metrics: {
        ...originInitialState,
        serviceMetrics,
        serviceOpsMetrics,
        loading: false,
      },
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
    };
    useServices.mockReturnValue({ data: ['apple'], isLoading: false });
    renderWithRouter(<MonitorATMServicesView {...loadedProps} />);
    expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
  });

  it('recalculates graph width when services finish loading (#3539)', async () => {
    cleanup();
    // jsdom always reports offsetWidth as 0; spy so the stub is safely restored
    // even if the test throws, preventing order-dependent failures in later tests.
    const offsetWidthSpy = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);

    try {
      useServices.mockReturnValue({ data: [], isLoading: true });
      const loadingProps = {
        ...props,
        metrics: { ...originInitialState, serviceMetrics, serviceOpsMetrics, loading: false },
        fetchAllServiceMetrics: mockFetchAllServiceMetrics,
        fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
      };
      const { rerender } = renderWithRouter(<MonitorATMServicesView {...loadingProps} />);
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

      useServices.mockReturnValue({ data: ['apple'], isLoading: false });
      rerender(
        <MemoryRouter>
          <MonitorATMServicesView {...loadingProps} />
        </MemoryRouter>
      );

      await waitFor(() => {
        // graphWidth = offsetWidth - 24 = 800 - 24 = 776; the fallback is 300
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
    const singleLatencyProps = {
      ...props,
      metrics: {
        ...originInitialState,
        serviceMetrics: serviceMetricsWithOneServiceLatency,
        serviceOpsMetrics,
        loading: false,
      },
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
    };
    useServices.mockReturnValue({ data: ['apple'], isLoading: false });
    renderWithRouter(<MonitorATMServicesView {...singleLatencyProps} />);
    expect(screen.getByTestId('service-graph-latency--ms-')).toBeInTheDocument();
    expect(screen.getByText(/Operations metrics under/)).toBeInTheDocument();
  });

  it('fetches metrics only when services are available', () => {
    // Clear mocks from beforeEach render
    mockFetchAllServiceMetrics.mockClear();
    mockFetchAggregatedServiceMetrics.mockClear();

    // Render with no services
    const propsNoServices = {
      ...props,
      metrics: {
        ...originInitialState,
        serviceMetrics,
        serviceOpsMetrics,
        loading: false,
      },
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
    };
    useServices.mockReturnValue({ data: [], isLoading: false });
    cleanup();
    renderWithRouter(<MonitorATMServicesView {...propsNoServices} />);

    // Should not fetch when no services
    expect(mockFetchAllServiceMetrics).not.toHaveBeenCalled();
    expect(mockFetchAggregatedServiceMetrics).not.toHaveBeenCalled();

    cleanup();
    const propsWithServices = {
      ...props,
      metrics: {
        ...originInitialState,
        serviceMetrics,
        serviceOpsMetrics,
        loading: false,
      },
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
    };
    useServices.mockReturnValue({ data: ['apple'], isLoading: false });
    renderWithRouter(<MonitorATMServicesView {...propsWithServices} />);
    expect(mockFetchAllServiceMetrics).toHaveBeenCalled();
    expect(mockFetchAggregatedServiceMetrics).toHaveBeenCalled();
  });

  it('ATM snapshot test (DOM)', () => {
    cleanup();
    mockFetchServices.mockResolvedValue(['apple', 'orange']);
    const snapshotProps = {
      ...props,
      metrics: {
        ...originInitialState,
        serviceMetrics,
        serviceOpsMetrics,
        loading: false,
      },
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
    };
    useServices.mockReturnValue({ data: ['apple', 'orange'], isLoading: false });
    renderWithRouter(<MonitorATMServicesView {...snapshotProps} />);
    expect(screen.getAllByText('Service')[0]).toBeInTheDocument();
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('orange')).toBeInTheDocument();
  });

  it('ATM snapshot test with no metrics (DOM)', () => {
    cleanup();
    mockFetchServices.mockResolvedValue([]);
    const noMetricsProps = {
      ...props,
      metrics: {
        ...originInitialState,
        serviceMetrics: {
          service_latencies: null,
        },
        serviceOpsMetrics,
        loading: false,
      },
      fetchServices: mockFetchServices,
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
    };
    renderWithRouter(<MonitorATMServicesView {...noMetricsProps} />);
    expect(screen.getAllByText(/No data yet!/)[0]).toBeInTheDocument();
    expect(screen.getByText(/instructions/)).toBeInTheDocument();
  });

  it('handles null error rate values in metrics', () => {
    cleanup();
    const testMetrics = {
      ...originInitialState,
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
      serviceOpsMetrics,
      loading: false,
    };

    const errorRateProps = {
      ...props,
      metrics: testMetrics,
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
    };
    useServices.mockReturnValue({ data: ['apple'], isLoading: false });

    renderWithRouter(<MonitorATMServicesView {...errorRateProps} />);
    expect(screen.getByTestId('service-graph-error-rate----')).toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
  });

  it('render one service latency', () => {
    cleanup();
    const oneLatencyProps = {
      ...props,
      metrics: {
        ...originInitialState,
        serviceMetrics: serviceMetricsWithOneServiceLatency,
        serviceOpsMetrics,
        loading: false,
      },
      fetchServices: mockFetchServices,
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
    };
    renderWithRouter(<MonitorATMServicesView {...oneLatencyProps} />);
    expect(screen.getByTestId('service-graph-latency--ms-')).toBeInTheDocument();
    expect(screen.getByText('Span Kind')).toBeInTheDocument();
  });

  it('ComponentWillUnmount remove listener', () => {
    const remover = jest.spyOn(global, 'removeEventListener').mockImplementation(() => {});
    const { unmount } = renderWithRouter(
      <MonitorATMServicesView
        {...props}
        fetchAllServiceMetrics={mockFetchAllServiceMetrics}
        fetchAggregatedServiceMetrics={mockFetchAggregatedServiceMetrics}
      />
    );
    unmount();
    expect(remover).toHaveBeenCalled();
  });

  it('resize window test', () => {
    const testProps = {
      ...props,
      fetchServices: mockFetchServices,
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
    };
    renderWithRouter(<MonitorATMServicesView {...testProps} />);

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

      const serviceProps = {
        ...props,
        metrics: {
          ...originInitialState,
          serviceMetrics,
          serviceOpsMetrics,
          loading: false,
        },
        fetchAllServiceMetrics: mockFetchAllServiceMetrics,
        fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
      };
      useServices.mockReturnValue({ data: ['apple', 'orange'], isLoading: false });

      renderWithRouter(<MonitorATMServicesView {...serviceProps} />);

      const serviceSelect = screen.getByTestId('select-a-service-input');
      await user.selectOptions(serviceSelect, 'orange');

      await waitFor(() => {
        expect(trackSelectServiceSpy).toHaveBeenCalledWith('orange');
      });

      expect(mockFetchAllServiceMetrics).toHaveBeenCalled();
      expect(mockFetchAggregatedServiceMetrics).toHaveBeenCalled();
    });

    it('should handle span kind change and call tracking', async () => {
      cleanup();
      const user = userEvent.setup();

      const spanKindProps = {
        ...props,
        metrics: {
          ...originInitialState,
          serviceMetrics,
          serviceOpsMetrics,
          loading: false,
        },
        fetchAllServiceMetrics: mockFetchAllServiceMetrics,
        fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
      };
      useServices.mockReturnValue({ data: ['apple'], isLoading: false });

      renderWithRouter(<MonitorATMServicesView {...spanKindProps} />);

      const spanKindSelect = screen.getByTestId('span-kind-selector');
      await user.selectOptions(spanKindSelect, 'client');

      await waitFor(() => {
        expect(trackSelectSpanKindSpy).toHaveBeenCalledWith('Client');
      });

      expect(mockFetchAllServiceMetrics).toHaveBeenCalled();
      expect(mockFetchAggregatedServiceMetrics).toHaveBeenCalled();
    });

    it('should handle timeframe change and call tracking', async () => {
      cleanup();
      const user = userEvent.setup();

      const timeframeProps = {
        ...props,
        metrics: {
          ...originInitialState,
          serviceMetrics,
          serviceOpsMetrics,
          loading: false,
        },
        fetchAllServiceMetrics: mockFetchAllServiceMetrics,
        fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
      };
      useServices.mockReturnValue({ data: ['apple'], isLoading: false });

      renderWithRouter(<MonitorATMServicesView {...timeframeProps} />);

      const timeframeSelect = screen.getByTestId('select-a-timeframe-input');
      await user.selectOptions(timeframeSelect, String(2 * 3600000));

      await waitFor(() => {
        expect(trackSelectTimeframeSpy).toHaveBeenCalledWith('Last 2 hours');
      });

      expect(mockFetchAllServiceMetrics).toHaveBeenCalled();
      expect(mockFetchAggregatedServiceMetrics).toHaveBeenCalled();
    });

    it('should test yAxisTickFormat function through ServiceGraph', () => {
      cleanup();
      const formatProps = {
        ...props,
        metrics: {
          ...originInitialState,
          serviceMetrics,
          serviceOpsMetrics,
          loading: false,
        },
        fetchAllServiceMetrics: mockFetchAllServiceMetrics,
        fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
      };
      useServices.mockReturnValue({ data: ['apple'], isLoading: false });

      renderWithRouter(<MonitorATMServicesView {...formatProps} />);

      const tickFormatResult = screen.getAllByTestId('tick-format-result')[0];
      expect(tickFormatResult).toBeInTheDocument();
      expect(tickFormatResult).toHaveTextContent('1');
    });

    it('search test', async () => {
      cleanup();
      const user = userEvent.setup();

      const searchProps = {
        ...props,
        metrics: {
          ...originInitialState,
          serviceMetrics,
          serviceOpsMetrics,
          loading: false,
        },
        fetchAllServiceMetrics: mockFetchAllServiceMetrics,
        fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
      };
      useServices.mockReturnValue({ data: ['apple'], isLoading: false });

      renderWithRouter(<MonitorATMServicesView {...searchProps} />);

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
      const errorProps = {
        ...props,
        services: ['apple', 'orange'],
        selectedService: 'apple',
        metrics: {
          ...originInitialState,
          serviceMetrics,
          serviceOpsMetrics,
          loading: false,
          serviceError: {
            ...originInitialState.serviceError,
            service_latencies_50: new Error('some API error'),
          },
        },
        fetchAllServiceMetrics: mockFetchAllServiceMetrics,
        fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
      };
      useServices.mockReturnValue({ data: ['apple', 'orange'], isLoading: false });

      renderWithRouter(<MonitorATMServicesView {...errorProps} />);
      expect(screen.getByText('Service')).toBeInTheDocument();

      cleanup();
      const partialErrorProps = {
        ...props,
        services: ['apple', 'orange'],
        metrics: {
          ...originInitialState,
          serviceMetrics,
          serviceOpsMetrics,
          loading: false,
          serviceError: {
            ...originInitialState.serviceError,
            service_latencies_50: new Error('some API error'),
            service_latencies_75: new Error('some API error'),
          },
        },
        fetchAllServiceMetrics: mockFetchAllServiceMetrics,
        fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
      };
      useServices.mockReturnValue({ data: ['apple', 'orange'], isLoading: false });

      renderWithRouter(<MonitorATMServicesView {...partialErrorProps} />);
      expect(screen.getByText('Service')).toBeInTheDocument();

      cleanup();
      const fullErrorProps = {
        ...props,
        metrics: {
          ...originInitialState,
          serviceMetrics,
          serviceOpsMetrics,
          loading: false,
          serviceError: {
            service_latencies_50: new Error('some API error'),
            service_latencies_75: new Error('some API error'),
            service_latencies_95: new Error('some API error'),
          },
        },
        fetchAllServiceMetrics: mockFetchAllServiceMetrics,
        fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
      };
      useServices.mockReturnValue({ data: ['apple', 'orange'], isLoading: false });

      renderWithRouter(<MonitorATMServicesView {...fullErrorProps} />);
      expect(screen.getByTestId('graph-error')).toBeInTheDocument();
    });

    it('Should track view all traces', async () => {
      cleanup();
      const user = userEvent.setup();

      const trackingProps = {
        ...props,
        metrics: {
          ...originInitialState,
          serviceOpsMetrics,
          serviceMetrics,
          loading: false,
        },

        fetchAllServiceMetrics: mockFetchAllServiceMetrics,
        fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
      };
      useServices.mockReturnValue({ data: ['apple', 'orange'], isLoading: false });

      renderWithRouter(<MonitorATMServicesView {...trackingProps} />);

      const viewAllTracesLink = screen.getByText('View all traces');
      await user.click(viewAllTracesLink);
      expect(trackViewAllTracesSpy).toHaveBeenCalled();
    });

    it('fetches metrics when services prop changes', () => {
      const fetchAll = jest.fn();
      const fetchAgg = jest.fn();
      const baseProps = {
        ...props,
        fetchServices: jest.fn(),
        fetchAllServiceMetrics: fetchAll,
        fetchAggregatedServiceMetrics: fetchAgg,
        services: [],
        metrics: { ...originInitialState },
      };

      useServices.mockReturnValue({ data: [], isLoading: false });
      const { rerender } = renderWithRouter(<MonitorATMServicesView {...baseProps} />);
      expect(fetchAll).not.toHaveBeenCalled();

      // Mock change in services data
      useServices.mockReturnValue({ data: ['apple'], isLoading: false });

      rerender(
        <MemoryRouter>
          <MonitorATMServicesView
            {...baseProps}
            metrics={{
              ...baseProps.metrics,
              serviceMetrics,
              serviceOpsMetrics,
            }}
          />
        </MemoryRouter>
      );

      expect(fetchAll).toHaveBeenCalled();
      expect(fetchAgg).toHaveBeenCalled();
    });
  });
});

describe('<MonitorATMServicesView> on page switch', () => {
  let wrapper;
  const stateOnPageSwitch = {
    services: {
      services: [],
    },
    metrics: { ...originInitialState },
    selectedService: undefined,
  };

  const propsOnPageSwitch = mapStateToProps(stateOnPageSwitch);
  const mockFetchServices = jest.fn();
  const mockFetchAllServiceMetrics = jest.fn();
  const mockFetchAggregatedServiceMetrics = jest.fn();

  beforeEach(() => {
    cleanup();
    useServices.mockReturnValue({ data: ['apple'], isLoading: false });
    wrapper = renderWithRouter(
      <MonitorATMServicesView
        {...propsOnPageSwitch}
        fetchAllServiceMetrics={mockFetchAllServiceMetrics}
        fetchAggregatedServiceMetrics={mockFetchAggregatedServiceMetrics}
      />
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('metrics fetch invocation check on page load', () => {
    expect(mockFetchAllServiceMetrics).toHaveBeenCalled();
    expect(mockFetchAggregatedServiceMetrics).toHaveBeenCalled();
  });
});

describe('Dimension filters', () => {
  const mockFetchAllServiceMetrics = jest.fn();
  const mockFetchAggregatedServiceMetrics = jest.fn();

  const renderWithDimensions = (dimensions, extraProps = {}) => {
    JaegerAPI.fetchMetricDimensions.mockResolvedValueOnce(dimensions);
    const defaultProps = {
      ...props,
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
      ...extraProps,
    };
    return renderWithRouter(<MonitorATMServicesView {...defaultProps} />);
  };

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('renders no dropdown when the backend reports an empty dimensions list', async () => {
    renderWithDimensions([]);
    // Wait for the fetchMetricDimensions promise to resolve and React to flush.
    await waitFor(() => expect(JaegerAPI.fetchMetricDimensions).toHaveBeenCalled());
    expect(screen.queryByTestId('dimension-selector')).not.toBeInTheDocument();
  });

  it('renders a dropdown for each dimension that has a non-empty values list', async () => {
    renderWithDimensions([
      { name: 'deployment.environment', displayName: 'Environment', values: ['prod', 'staging'] },
      { name: 'k8s.cluster', values: ['us-west-1'] },
    ]);
    await waitFor(() => expect(screen.getByText('Environment')).toBeInTheDocument());
    expect(screen.getByText('Environment')).toBeInTheDocument();
    // Falls back to name when displayName is absent.
    expect(screen.getByText('k8s.cluster')).toBeInTheDocument();
  });

  it('skips free-text dimensions (empty values list) in this v1 UI', async () => {
    renderWithDimensions([
      { name: 'free.text.dim' }, // no values: hidden by the dropdown UI for now
      { name: 'deployment.environment', displayName: 'Environment', values: ['prod'] },
    ]);
    await waitFor(() => expect(screen.getByText('Environment')).toBeInTheDocument());
    expect(screen.queryByText('free.text.dim')).not.toBeInTheDocument();
  });

  it('selecting a value triggers a refetch with the filter param included', async () => {
    renderWithDimensions([
      { name: 'deployment.environment', displayName: 'Environment', values: ['prod', 'staging'] },
    ]);
    await waitFor(() => expect(screen.getByText('Environment')).toBeInTheDocument());

    mockFetchAllServiceMetrics.mockClear();
    const select = screen.getByTestId('dimension-selector');
    await userEvent.selectOptions(select, 'prod');

    await waitFor(() => {
      expect(mockFetchAllServiceMetrics).toHaveBeenCalled();
    });
    const lastCall = mockFetchAllServiceMetrics.mock.calls[mockFetchAllServiceMetrics.mock.calls.length - 1];
    const queryPayload = lastCall[1];
    expect(queryPayload.filter).toEqual(['deployment.environment:prod']);
  });

  it('selecting "All" removes the filter for that dimension', async () => {
    renderWithDimensions([
      { name: 'deployment.environment', displayName: 'Environment', values: ['prod', 'staging'] },
    ]);
    await waitFor(() => expect(screen.getByText('Environment')).toBeInTheDocument());

    const select = screen.getByTestId('dimension-selector');
    await userEvent.selectOptions(select, 'prod');
    await waitFor(() => {
      const calls = mockFetchAllServiceMetrics.mock.calls;
      expect(calls[calls.length - 1][1].filter).toEqual(['deployment.environment:prod']);
    });

    await userEvent.selectOptions(select, ''); // "All"
    await waitFor(() => {
      const calls = mockFetchAllServiceMetrics.mock.calls;
      // filter is omitted entirely when no dimensions are selected.
      expect(calls[calls.length - 1][1]).not.toHaveProperty('filter');
    });
  });

  it('persists selected filters via storage.set', async () => {
    renderWithDimensions([{ name: 'deployment.environment', values: ['prod'] }]);
    await waitFor(() => expect(screen.getByText('deployment.environment')).toBeInTheDocument());

    store.set.mockClear();
    const select = screen.getByTestId('dimension-selector');
    await userEvent.selectOptions(select, 'prod');

    await waitFor(() => {
      expect(store.set).toHaveBeenCalledWith('lastAtmSearchFilters', {
        'deployment.environment': 'prod',
      });
    });
  });

  it('restores selected filters from storage on mount and ignores keys for unadvertised dimensions', async () => {
    // localStorage carries a stale "removed.dimension" entry; the UI must drop it
    // so unfiltered requests don't accidentally inherit a stale selection.
    store.getJSON.mockReturnValueOnce({
      'deployment.environment': 'prod',
      'removed.dimension': 'old-value',
    });
    renderWithDimensions([{ name: 'deployment.environment', values: ['prod', 'staging'] }]);

    // The initial fetch fires before dimensions resolve (filter is empty
    // because `advertised` is still empty). After fetchMetricDimensions
    // resolves, fetchMetrics re-runs with the now-known dimension list.
    await waitFor(() => {
      const calls = mockFetchAllServiceMetrics.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[calls.length - 1][1].filter).toEqual(['deployment.environment:prod']);
    });
  });

  it('does not crash when fetchMetricDimensions rejects', async () => {
    JaegerAPI.fetchMetricDimensions.mockReset();
    JaegerAPI.fetchMetricDimensions.mockRejectedValueOnce(new Error('501 Not Implemented'));
    renderWithDimensions([]); // queues a second resolved value, but the rejected one fires first
    await waitFor(() => expect(JaegerAPI.fetchMetricDimensions).toHaveBeenCalled());
    expect(screen.queryByTestId('dimension-selector')).not.toBeInTheDocument();
    // Page still renders the rest of the Monitor UI.
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('Span Kind')).toBeInTheDocument();
  });
});

describe('mapStateToProps()', () => {
  it('refines state to generate the props', () => {
    expect(mapStateToProps(state)).toEqual({
      metrics: { ...originInitialState },
    });
  });
});

describe('mapDispatchToProps()', () => {
  it('providers the `fetchServices` , `fetchAllServiceMetrics` and `fetchAggregatedServiceMetrics` prop', () => {
    expect(mapDispatchToProps({})).toEqual({
      fetchAllServiceMetrics: expect.any(Function),
      fetchAggregatedServiceMetrics: expect.any(Function),
    });
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
    expect(getLoopbackInterval(48 * 3600000)).toBe('last 2 days');
  });
});

describe('yAxisTickFormat', () => {
  it('value is 2 second', () => {
    const timeInMs = 1000;
    const displayTimeUnit = 'seconds';
    expect(yAxisTickFormat(timeInMs, displayTimeUnit)).toBe(1);
  });
});
