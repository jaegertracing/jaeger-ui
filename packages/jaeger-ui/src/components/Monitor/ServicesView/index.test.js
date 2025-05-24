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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MonitorATMServicesViewImpl as MonitorATMServicesView,
  mapStateToProps,
  mapDispatchToProps,
  getLoopbackInterval,
  yAxisTickFormat,
  timeFrameOptions,
  spanKindOptions,
} from '.';
import LoadingIndicator from '../../common/LoadingIndicator';
import MonitorATMEmptyState from '../EmptyState';
import ServiceGraph from './serviceGraph';
import {
  originInitialState,
  serviceMetrics,
  serviceOpsMetrics,
  serviceMetricsWithOneServiceLatency,
} from '../../../reducers/metrics.mock';
import * as track from './index.track';

const state = {
  services: {},
  metrics: originInitialState,
  selectedService: undefined,
};

const props = mapStateToProps(state);

Date.now = jest.fn(() => 1487076708000); // Tue, 14 Feb 2017 12:51:48 GMT'
jest.mock('lodash/debounce', () => fn => fn);

describe('<MonitorATMServicesView>', () => {
  let rendered;
  beforeEach(() => {
    rendered = render(
      <MonitorATMServicesView
        {...props}
        fetchServices={mockFetchServices}
        fetchAllServiceMetrics={mockFetchAllServiceMetrics}
        fetchAggregatedServiceMetrics={mockFetchAggregatedServiceMetrics}
      / data-testid="monitoratmservicesview">
    ));
  });

  afterEach(() => {
    wrapper = null;

    jest.clearAllMocks();
  });

  it('does not explode', () => {
    expect(wrapper.length).toBe(1);
  });

  it('shows a loading indicator when loading services list', () => {
    rendered = render({ servicesLoading: true });
    expect(screen.getAllByTestId(LoadingIndicator)).toHaveLength(1);
  });

  it('do not show a loading indicator once data loaded', () => {
    wrapper.setProps({
      services: ['s1'],
      selectedService: undefined,
      metrics: {
        ...originInitialState,
        serviceMetrics,
        serviceOpsMetrics,
        loading: false,
        isATMActivated: true,
      },
    });
    expect(screen.getAllByTestId(LoadingIndicator)).toHaveLength(0);
  });

  it('render one service latency', () => {
    wrapper.setProps({
      services: ['s1'],
      selectedService: undefined,
      metrics: {
        ...originInitialState,
        serviceMetricsWithOneServiceLatency,
        serviceOpsMetrics,
        loading: false,
        isATMActivated: true,
      },
    });
    expect(wrapper.length).toBe(1);
  });

  it('Render ATM not configured page', () => {
    wrapper.setProps({
      services: [],
      selectedService: undefined,
      metrics: {
        ...originInitialState,
        serviceMetrics,
        serviceOpsMetrics,
        loading: false,
        isATMActivated: false,
      },
    });
    expect(screen.getAllByTestId(MonitorATMEmptyState)).toHaveLength(1);
  });

  it('function invocation check on page load', () => {
    expect(mockFetchServices).toHaveBeenCalled();
    expect(mockFetchAllServiceMetrics).not.toHaveBeenCalled();
    expect(mockFetchAggregatedServiceMetrics).not.toHaveBeenCalled();
    wrapper.setProps({
      services: ['s1'],
      metrics: {
        ...originInitialState,
        serviceMetrics,
        serviceOpsMetrics,
        loading: false,
        isATMActivated: true,
      },
    });
    expect(mockFetchAllServiceMetrics).toHaveBeenCalled();
    expect(mockFetchAggregatedServiceMetrics).toHaveBeenCalled();
  });

  it('ATM snapshot test', () => {
    mockFetchServices.mockResolvedValue(['s1', 's2']);
    wrapper.setProps({
      services: ['s1', 's2'],
      metrics: {
        ...originInitialState,
        serviceMetrics,
        serviceOpsMetrics,
        loading: false,
        isATMActivated: true,
      },
    });
    expect(container).toMatchSnapshot();
  });

  it('ATM snapshot test with no metrics', () => {
    mockFetchServices.mockResolvedValue([]);
    wrapper.setProps({
      metrics: {
        ...originInitialState,
        serviceMetrics: {
          service_latencies: null,
        },
        serviceOpsMetrics,
        loading: false,
        isATMActivated: true,
      },
    });
    expect(container).toMatchSnapshot();
  });

  it('render one service latency', () => {
    wrapper.setProps({
      metrics: {
        ...originInitialState,
        serviceMetricsWithOneServiceLatency,
        serviceOpsMetrics,
        loading: false,
        isATMActivated: true,
      },
    });
    expect(container).toMatchSnapshot();
  });

  it('ComponentWillUnmount remove listener', () => {
    const remover = jest.spyOn(global, 'removeEventListener').mockImplementation(() => {});
    wrapper.unmount();
    expect(remover).toHaveBeenCalled();
  });

  it('resize window test', () => {
    const selectedInput = 'graphDivWrapper';
    // RTL doesn't access component instances - use assertions on rendered output instead[selectedInput] = {
      current: {
        offsetWidth: 100,
      },
    };
    global.dispatchEvent(new Event('resize'));
    expect(// RTL doesn't access component state directly - use assertions on rendered output instead.graphWidth).toBe(76);
  });

  it('should update state after choosing a new timeframe', () => {
    const firstGraphXDomain = // RTL doesn't access component state directly - use assertions on rendered output instead.graphXDomain;
    // RTL doesn't access component instances - use assertions on rendered output instead.handleTimeFrameChange(3600000 * 2);

    expect(// RTL doesn't access component state directly - use assertions on rendered output instead.graphXDomain).not.toBe(firstGraphXDomain);
  });

  it('search test', () => {
    mockFetchServices.mockResolvedValue(['cartservice']);
    wrapper.setProps({
      services: ['s1', 's2'],
      metrics: {
        ...originInitialState,
        serviceMetrics,
        serviceOpsMetrics,
        loading: false,
        isATMActivated: true,
      },
    });

    userEvent.change(screen.getByTestId('Search'), { target: { value: 'place' } });
    expect(// RTL doesn't access component state directly - use assertions on rendered output instead.serviceOpsMetrics.length).toBe(1);
    userEvent.change(screen.getByTestId('Search'), { target: { value: 'qqq' } });
    expect(// RTL doesn't access component state directly - use assertions on rendered output instead.serviceOpsMetrics.length).toBe(0);
    userEvent.change(screen.getByTestId('Search'), { target: { value: '' } });
    expect(// RTL doesn't access component state directly - use assertions on rendered output instead.serviceOpsMetrics.length).toBe(1);
  });

  it('Error in serviceLatencies ', () => {
    wrapper.setProps({
      services: ['s1', 's2'],
      selectedService: 's1',
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
    });
    expect(wrapper.find(ServiceGraph).first().prop('error')).toBeNull();

    wrapper.setProps({
      services: ['s1', 's2'],
      selectedService: 's1',
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
    });
    expect(wrapper.find(ServiceGraph).first().prop('error')).toBeNull();

    wrapper.setProps({
      services: ['s1', 's2'],
      selectedService: 's1',
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
    });
    expect(wrapper.find(ServiceGraph).first().prop('error')).not.toBeNull();
  });

  it('Should track all events', () => {
    const trackSelectServiceSpy = jest.spyOn(track, 'trackSelectService');
    const trackViewAllTracesSpy = jest.spyOn(track, 'trackViewAllTraces');
    const trackSelectSpanKindSpy = jest.spyOn(track, 'trackSelectSpanKind');
    const trackSelectTimeframeSpy = jest.spyOn(track, 'trackSelectTimeframe');
    const trackSearchOperationSpy = jest.spyOn(track, 'trackSearchOperation');

    const newValue = 'newValue';
    const [spanKindOption] = spanKindOptions;
    const [timeFrameOption] = timeFrameOptions;

    wrapper.setProps({
      metrics: { ...originInitialState, serviceOpsMetrics },
    });

    userEvent.change(screen.getByTestId('Search'), { target: { value: newValue } });
    expect(trackSearchOperationSpy).toHaveBeenCalledWith(newValue);

    wrapper.find('SearchableSelect').first().prop('onChange')(newValue);
    expect(trackSelectServiceSpy).toHaveBeenCalledWith(newValue);

    wrapper.find('.span-kind-selector').prop('onChange')(spanKindOption.value);
    expect(trackSelectSpanKindSpy).toHaveBeenCalledWith(spanKindOption.label);

    wrapper.find('SearchableSelect').last().prop('onChange')(timeFrameOption.value);
    expect(trackSelectTimeframeSpy).toHaveBeenCalledWith(timeFrameOption.label);

    userEvent.click(screen.getByTestId({ children: 'View all traces' }));
    expect(trackViewAllTracesSpy).toHaveBeenCalled();

    trackSelectServiceSpy.mockReset();
    trackViewAllTracesSpy.mockReset();
    trackSelectSpanKindSpy.mockReset();
    trackSelectTimeframeSpy.mockReset();
    trackSearchOperationSpy.mockReset();
  });
});

describe('<MonitorATMServicesView> on page switch', () => {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  let rendered;
  beforeEach(() => {
    rendered = render(
      <MonitorATMServicesView
        {...propsOnPageSwitch}
        fetchServices={mockFetchServices}
        fetchAllServiceMetrics={mockFetchAllServiceMetrics}
        fetchAggregatedServiceMetrics={mockFetchAggregatedServiceMetrics}
      / data-testid="monitoratmservicesview">
    ));
  });

  it('function invocation check on page load', () => {
    expect(mockFetchServices).toHaveBeenCalled();
    expect(mockFetchAllServiceMetrics).toHaveBeenCalled();
    expect(mockFetchAggregatedServiceMetrics).toHaveBeenCalled();
  });
});

describe('mapStateToProps()', () => {
  it('refines state to generate the props', () => {
    expect(mapStateToProps(state)).toEqual({
      metrics: originInitialState,
      services: [],
    });
  });
});

describe('mapDispatchToProps()', () => {
  it('providers the `fetchServices` , `fetchAllServiceMetrics` and `fetchAggregatedServiceMetrics` prop', () => {
    expect(mapDispatchToProps({})).toEqual({
      fetchServices: expect.any(Function),
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
