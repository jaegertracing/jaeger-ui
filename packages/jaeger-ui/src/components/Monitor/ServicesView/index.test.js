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
import { useServices } from '../../../hooks/useTraceDiscovery';
import {
  originInitialState,
  serviceMetrics,
  serviceOpsMetrics,
  serviceMetricsWithOneServiceLatency,
} from '../../../reducers/metrics.mock';
import * as track from './index.track';

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

jest.mock('../../../utils/config/get-config', () => ({
  getConfigValue: jest.fn(() => 'https://www.jaegertracing.io/docs/latest/spm/'),
  __esModule: true,
  default: jest.fn(() => ({
    qualityMetrics: {
      apiEndpoint: '/api/quality-metrics',
    },
  })),
}));

jest.mock('store', () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

jest.mock('../../../hooks/useTraceDiscovery', () => ({
  useServices: jest.fn(() => ({ data: ['service1', 'service2'], isLoading: false })),
}));

// Store the default mock implementation for reset in afterEach
const defaultUseServicesImpl = () => ({ data: ['service1', 'service2'], isLoading: false });

jest.mock('lodash/debounce', () => fn => fn);

jest.mock('../../common/LoadingIndicator', () => {
  return function LoadingIndicator() {
    return <div data-testid="loading-indicator">Loading...</div>;
  };
});

jest.mock('../EmptyState', () => {
  return function MonitorATMEmptyState() {
    return <div data-testid="empty-state">ATM not configured</div>;
  };
});

jest.mock('./serviceGraph', () => {
  return function ServiceGraph({ yAxisTickFormat, name, error }) {
    const testValue = yAxisTickFormat ? yAxisTickFormat(1000) : null;
    return (
      <div data-testid={`service-graph-${name?.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
        Service Graph: {name}
        {testValue && <span data-testid="tick-format-result">{testValue}</span>}
        {error && <span data-testid="graph-error">Error occurred</span>}
      </div>
    );
  };
});

jest.mock('./operationDetailsTable', () => {
  return function OperationTableDetails({ loading, error, data }) {
    return (
      <div data-testid="operation-table">
        {loading && <span data-testid="table-loading">Loading operations...</span>}
        {error && <span data-testid="table-error">Error loading operations</span>}
        {data && <span data-testid="table-data">Operations data loaded</span>}
      </div>
    );
  };
});

jest.mock('../../common/SearchableSelect', () => {
  return function SearchableSelect({ children, value, onChange, placeholder, disabled, className }) {
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
  };
});

jest.mock('antd', () => {
  const actualAntd = jest.requireActual('antd');
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
  metrics: { ...originInitialState, isATMActivated: true },
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
        isATMActivated: true,
      },
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
    };
    useServices.mockReturnValue({ data: ['apple'], isLoading: false });
    renderWithRouter(<MonitorATMServicesView {...loadedProps} />);
    expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
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
        isATMActivated: true,
      },
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
    };
    useServices.mockReturnValue({ data: ['apple'], isLoading: false });
    renderWithRouter(<MonitorATMServicesView {...singleLatencyProps} />);
    expect(screen.getByTestId('service-graph-latency--ms-')).toBeInTheDocument();
    expect(screen.getByText(/Operations metrics under/)).toBeInTheDocument();
  });

  it('Render ATM not configured page', () => {
    cleanup();
    const emptyProps = {
      ...props,
      metrics: {
        ...originInitialState,
        serviceMetrics,
        serviceOpsMetrics,
        loading: false,
        isATMActivated: false,
      },
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
    };
    useServices.mockReturnValue({ data: [], isLoading: false });
    renderWithRouter(<MonitorATMServicesView {...emptyProps} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
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
        isATMActivated: true,
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
        isATMActivated: true,
      },
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
    };
    useServices.mockReturnValue({ data: ['apple'], isLoading: false });
    renderWithRouter(<MonitorATMServicesView {...propsWithServices} />);
    expect(mockFetchAllServiceMetrics).toHaveBeenCalled();
    expect(mockFetchAggregatedServiceMetrics).toHaveBeenCalled();
  });

  it('fetches metrics when isATMActivated is null (initial state)', () => {
    cleanup();
    mockFetchAllServiceMetrics.mockClear();
    mockFetchAggregatedServiceMetrics.mockClear();

    const propsWithNullATM = {
      ...props,
      metrics: {
        ...originInitialState,
        serviceMetrics: null,
        serviceOpsMetrics: undefined,
        loading: false,
        isATMActivated: null, // Initial state before any metrics fetch
      },
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
    };
    useServices.mockReturnValue({ data: ['apple'], isLoading: false });
    renderWithRouter(<MonitorATMServicesView {...propsWithNullATM} />);
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
        isATMActivated: true,
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
        isATMActivated: true,
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
      isATMActivated: true,
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
        isATMActivated: true,
      },
      fetchServices: mockFetchServices,
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
    };
    renderWithRouter(<MonitorATMServicesView {...oneLatencyProps} />);
    expect(screen.getByTestId('service-graph-latency--ms-')).toBeInTheDocument();
    expect(screen.getByText('Span Kind')).toBeInTheDocument();
  });

  it('renders correctly without resize listener', () => {
    const testProps = {
      ...props,
      fetchServices: mockFetchServices,
      fetchAllServiceMetrics: mockFetchAllServiceMetrics,
      fetchAggregatedServiceMetrics: mockFetchAggregatedServiceMetrics,
    };
    renderWithRouter(<MonitorATMServicesView {...testProps} />);

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
          isATMActivated: true,
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
          isATMActivated: true,
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
          isATMActivated: true,
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
          isATMActivated: true,
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
          isATMActivated: true,
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

    it('Error in serviceLatencies ', () => {
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
          isATMActivated: true,
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
          isATMActivated: true,
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
          isATMActivated: true,
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
          isATMActivated: true,
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
        metrics: { ...originInitialState, isATMActivated: true },
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
    metrics: { ...originInitialState, isATMActivated: true },
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

describe('mapStateToProps()', () => {
  it('refines state to generate the props', () => {
    expect(mapStateToProps(state)).toEqual({
      metrics: { ...originInitialState, isATMActivated: true },
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
