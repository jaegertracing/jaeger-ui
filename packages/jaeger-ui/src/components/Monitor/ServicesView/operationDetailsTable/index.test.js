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
import { mount, shallow } from 'enzyme';
import OperationTableDetails from '.';
import { originInitialState, serviceOpsMetrics } from '../../../../reducers/metrics.mock';

const props = {
  data: originInitialState.serviceOpsMetrics,
  error: originInitialState.opsError,
  loading: true,
  endTime: 1632133918915,
  lookback: 3600 * 1000,
  serviceName: 'serviceName',
  hoveredRowKey: [],
};

describe('<OperationTableDetails>', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<OperationTableDetails {...props} />);
  });

  it('does not explode', () => {
    expect(wrapper.length).toBe(1);
  });

  it('Loading indicator is displayed', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('"Couldn’t fetch data" displayed', () => {
    const error = {
      opsCalls: new Error('API Error'),
      opsErrors: new Error('API Error'),
      opsLatencies: new Error('API Error'),
    };
    wrapper.setProps({ ...props, loading: false, error });
    expect(wrapper).toMatchSnapshot();
  });

  it('Table rendered successfully', () => {
    wrapper.setProps({ ...props, loading: false });
    expect(wrapper).toMatchSnapshot();
  });
});

describe('<OperationTableDetails>', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(<OperationTableDetails {...props} />);
  });

  it('render No data table', () => {
    wrapper.setProps({ ...props, loading: false });
    expect(wrapper).toMatchSnapshot();
  });

  it('render some values in the table', () => {
    wrapper.setProps({ ...props, data: serviceOpsMetrics, loading: false });
    expect(wrapper).toMatchSnapshot();
  });

  it('test column render function', () => {
    wrapper.setProps({
      ...props,
      data: [
        {
          ...serviceOpsMetrics,
          dataPoints: {
            ...serviceOpsMetrics.dataPoints,
            service_operation_call_rate: [],
            service_operation_error_rate: [],
            service_operation_latencies: [],
          },
        },
      ],
      loading: false,
    });
    expect(wrapper).toMatchSnapshot();
  });

  it('highlight the row', () => {
    wrapper.setProps({ ...props, data: serviceOpsMetrics, loading: false });
    expect(wrapper.state('hoveredRowKey')).toBe(-1);

    wrapper
      .find('.table-row')
      .at(0)
      .simulate('mouseenter');
    expect(wrapper.state('hoveredRowKey')).toBe(0);

    wrapper
      .find('.table-row')
      .at(0)
      .simulate('mouseleave');
    expect(wrapper.state('hoveredRowKey')).toBe(-1);
  });

  it('highlight the row', () => {
    wrapper.setProps({ ...props, data: serviceOpsMetrics, loading: false });
    expect(wrapper.state('hoveredRowKey')).toBe(-1);

    wrapper
      .find('.table-row')
      .at(0)
      .simulate('mouseenter');
    expect(wrapper.state('hoveredRowKey')).toBe(0);

    wrapper
      .find('.table-row')
      .at(0)
      .simulate('mouseleave');
    expect(wrapper.state('hoveredRowKey')).toBe(-1);
  });

  it('sort row', () => {
    const data = serviceOpsMetrics;
    data.push({
      dataPoints: {
        avg: {
          service_operation_call_rate: 0.02,
          service_operation_error_rate: 2,
          service_operation_latencies: 800.16,
        },
        service_operation_call_rate: [
          {
            x: 1631534436235,
            y: 0.01,
          },
          {
            x: 1631534496235,
            y: 0.01,
          },
        ],
        service_operation_error_rate: [
          {
            x: 1631534436235,
            y: 1,
          },
          {
            x: 1631534496235,
            y: 1,
          },
        ],
        service_operation_latencies: [
          {
            x: 1631534436235,
            y: 737.33,
          },
          {
            x: 1631534496235,
            y: 735,
          },
        ],
      },
      errRates: 2,
      impact: 0,
      key: 1,
      latency: 800.16,
      name: '/Accounts',
      requests: 0.002,
    });

    wrapper.setProps({ ...props, data, loading: false });

    expect(
      wrapper
        .find('TableCell td')
        .first()
        .text()
    ).toBe('/PlaceOrder');
    // click on name
    wrapper
      .find('th Icon[type="caret-up"]')
      .at(0)
      .simulate('click');
    expect(
      wrapper
        .find('TableCell td')
        .first()
        .text()
    ).toBe('/Accounts');

    // click on latencies
    wrapper
      .find('th Icon[type="caret-up"]')
      .at(1)
      .simulate('click');
    expect(
      wrapper
        .find('TableCell td')
        .first()
        .text()
    ).toBe('/PlaceOrder');

    // click on request
    wrapper
      .find('th Icon[type="caret-up"]')
      .at(2)
      .simulate('click');
    expect(
      wrapper
        .find('TableCell td')
        .first()
        .text()
    ).toBe('/Accounts');

    // click on errors
    wrapper
      .find('th Icon[type="caret-up"]')
      .at(3)
      .simulate('click');
    expect(
      wrapper
        .find('TableCell td')
        .first()
        .text()
    ).toBe('/PlaceOrder');

    // click on errors
    wrapper
      .find('th Icon[type="caret-up"]')
      .at(4)
      .simulate('click');
    expect(
      wrapper
        .find('TableCell td')
        .first()
        .text()
    ).toBe('/Accounts');
  });

  it('Graph avg label test', () => {
    const data = [
      {
        dataPoints: {
          avg: {
            service_operation_call_rate: 11,
            service_operation_error_rate: 22,
            service_operation_latencies: 99,
          },
          service_operation_call_rate: [],
          service_operation_error_rate: [],
          service_operation_latencies: [],
        },
        errRates: 1,
        impact: 2,
        key: 1,
        latency: 3,
        name: '/Accounts',
        requests: 4,
      },
    ];

    wrapper.setProps({ ...props, data, loading: false });

    // Latency
    expect(
      wrapper
        .find('div.table-graph-avg')
        .at(0)
        .text()
    ).toBe('');

    // Request rate
    expect(
      wrapper
        .find('div.table-graph-avg')
        .at(1)
        .text()
    ).toBe('');

    // Error rate
    expect(
      wrapper
        .find('div.table-graph-avg')
        .at(2)
        .text()
    ).toBe('');
  });
});
