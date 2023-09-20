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

  it('displays loading indicator when loading', () => {
    expect(wrapper.find('LoadingIndicator').exists()).toBe(true);
  });

  it('displays loading indicator when xDomain is empty', () => {
    wrapper.setProps({ ...props, xDomain: [], loading: false });
    expect(wrapper.find('LoadingIndicator').exists()).toBe(true);
  });

  it('displays "No Data" message when metricsData is null', () => {
    wrapper.setProps({ ...props, loading: false });
    expect(wrapper.text()).toContain('No Data');
  });

  it('displays "Couldn’t fetch data" message when error is present', () => {
    wrapper.setProps({ ...props, loading: false, error: new Error('API Error') });
    expect(wrapper.text()).toContain('Couldn’t fetch data');
  });

  it('displays base graph when metricsData is provided', () => {
    wrapper.setProps({
      ...props,
      loading: false,
      metricsData: serviceMetrics.service_call_rate,
    });
    expect(wrapper.find('ComposedChart').exists()).toBe(true);
  });

  it('displays base graph with legends when showLegend is true', () => {
    wrapper.setProps({
      ...props,
      loading: false,
      metricsData: serviceMetrics.service_call_rate,
      showLegend: true,
    });
    expect(wrapper.find('Legend').exists()).toBe(true);
  });

  it('displays base graph with horizontal lines when showHorizontalLines is true', () => {
    wrapper.setProps({
      ...props,
      loading: false,
      metricsData: serviceMetrics.service_call_rate,
      showHorizontalLines: true,
    });
    expect(wrapper.find('CartesianGrid[horizontal=true]').exists()).toBe(true);
  });

  it('displays base graph with custom color', () => {
    wrapper.setProps({
      ...props,
      loading: false,
      metricsData: serviceMetrics.service_call_rate,
      color: 'AAAAAA',
    });
    expect(wrapper.find('Area[stroke="AAAAAA"]').exists()).toBe(true);
    expect(wrapper.find('Line[stroke="AAAAAA"]').exists()).toBe(true);
  });

  it('Tooltip test', () => {
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
    expect(wrapper.find('Tooltip').exists()).toBe(true);
  });

  it('Tooltip hover test', () => {
    wrapper.setProps({
      ...props,
      loading: false,
      metricsData: {
        ...serviceMetrics.service_call_rate,
        metricPoints: [{ x: 1631271783806, y: null }, ...serviceMetrics.service_call_rate.metricPoints],
      },
    });
    expect(wrapper.find('Area').length).toBeGreaterThan(0);
    expect(wrapper.find('Line').length).toBeGreaterThan(0);
  });

  it('displays Tooltip with custom formatter', () => {
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

    const tooltipComponent = wrapper.find('Tooltip');
    const exampleValue = 42;
    const exampleEntry = {
      payload: {
        x: 1631271783806,
        y: 123,
        label: 0.75,
      },
    };
    const formattedTooltipContent = tooltipComponent.prop('formatter')(exampleValue, 'name', exampleEntry);

    const formattedLabel = new Date(exampleEntry.payload.x).toLocaleTimeString();
    const expectedTooltipContent = [
      `label: ${exampleEntry.payload.label * 100}`,
      `x: ${formattedLabel}`,
      `Y: ${exampleEntry.payload.y}`,
    ];

    expect(formattedTooltipContent).toEqual(expectedTooltipContent);
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
