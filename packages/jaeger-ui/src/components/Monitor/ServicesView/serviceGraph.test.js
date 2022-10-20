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
import { shallow } from 'enzyme';
import ServiceGraph, { tickFormat } from './serviceGraph';
import { serviceMetrics } from '../../../reducers/metrics.mock';

const props = {
  width: 300,
  error: null,
  name: 'Hello Graph',
  metricsData: null,
  loading: true,
  marginClassName: '',
  crosshairValues: [],
  xDomain: [1, 2],
};

describe('<ServiceGraph>', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<ServiceGraph {...props} />);
  });

  it('does not explode', () => {
    expect(wrapper.length).toBe(1);
  });

  it('Loading indicator is displayed', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('Loading indicator is displayed when xDomain is empty', () => {
    wrapper.setProps({ ...props, xDomain: [], loading: false });
    expect(wrapper).toMatchSnapshot();
  });

  it('"No data" displayed', () => {
    wrapper.setProps({ ...props, loading: false });
    expect(wrapper).toMatchSnapshot();
  });

  it('"Couldn’t fetch data" displayed', () => {
    wrapper.setProps({ ...props, loading: false, error: new Error('API Error') });
    expect(wrapper).toMatchSnapshot();
  });

  it('Base graph should be displayed ', () => {
    wrapper.setProps({ ...props, loading: false, metricsData: serviceMetrics.service_call_rate });
    expect(wrapper).toMatchSnapshot();
  });

  it('Base graph with legends should be displayed', () => {
    wrapper.setProps({
      ...props,
      loading: false,
      metricsData: serviceMetrics.service_call_rate,
      showLegend: true,
    });
    expect(wrapper).toMatchSnapshot();
  });

  it('Base graph with horizontal lines should be displayed', () => {
    wrapper.setProps({
      ...props,
      loading: false,
      metricsData: serviceMetrics.service_call_rate,
      showHorizontalLines: true,
    });
    expect(wrapper).toMatchSnapshot();
  });

  it('Base graph with custom color should be displayed', () => {
    wrapper.setProps({
      ...props,
      loading: false,
      metricsData: serviceMetrics.service_call_rate,
      color: 'AAAAAA',
    });
    expect(wrapper).toMatchSnapshot();
  });

  it('Crosshair map test', () => {
    wrapper.setProps({
      ...props,
      loading: false,
      metricsData: serviceMetrics.service_call_rate,
      crosshairValues: [
        {
          key: 1,
          ...serviceMetrics.service_call_rate.metricPoints[0],
        },
      ],
    });
    expect(wrapper).toMatchSnapshot();
  });

  it('Crosshair mouse hover test', () => {
    wrapper.setProps({
      ...props,
      loading: false,
      metricsData: {
        ...serviceMetrics.service_call_rate,
        metricPoints: [{ x: 1631271783806, y: null }, ...serviceMetrics.service_call_rate.metricPoints],
      },
      crosshairValues: [
        {
          key: 1,
          ...serviceMetrics.service_call_rate.metricPoints[0],
        },
      ],
    });
    expect(wrapper.find('AreaSeries').render()).toMatchSnapshot();
    expect(wrapper.find('LineSeries').render()).toMatchSnapshot();
  });

  it('AreaSeries onNearestX, XYPlot onMouseLeave', () => {
    wrapper.setProps({
      ...props,
      loading: false,
      metricsData: serviceMetrics.service_call_rate,
    });
    wrapper
      .find('AreaSeries')
      .at(0)
      .prop('onNearestX')({ x: 1, y: 2 }, { index: 7 });
    expect(wrapper.state().crosshairValues).toEqual([{ label: 0.95 }]);
    wrapper.find('XYPlot').prop('onMouseLeave')();
    expect(wrapper.state().crosshairValues).toEqual([]);
  });
});

describe('<ServiceGraph> util', () => {
  it('tickFormat singular', () => {
    expect(tickFormat(Date.UTC(2017, 1, 14, 15, 19)).valueOf()).toBe('15:19');
  });

  it('tickFormat plural', () => {
    expect(tickFormat(Date.UTC(2017, 1, 14, 4, 4)).valueOf()).toBe('04:04');
  });
});
