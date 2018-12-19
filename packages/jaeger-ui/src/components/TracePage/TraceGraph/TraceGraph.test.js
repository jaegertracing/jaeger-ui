// Copyright (c) 2018 The Jaeger Authors.
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

import transformTraceData from '../../../model/transform-trace-data';

import TraceGraph, { setOnEdgePath } from './TraceGraph';
import { MODE_SERVICE, MODE_TIME, MODE_SELFTIME } from './OpNode';

const testTrace = require('./testTrace.json');

function assertData(nodes, service, operation, count, errors, time, percent, selfTime) {
  const d = nodes.find(n => n.service === service && n.operation === operation).data;
  expect(d).toBeDefined();
  expect(d.count).toBe(count);
  expect(d.errors).toBe(errors);
  expect(d.time).toBe(time * 1000);
  expect(d.percent).toBeCloseTo(percent, 2);
  expect(d.selfTime).toBe(selfTime * 1000);
}

describe('<TraceGraph>', () => {
  let wrapper;

  beforeEach(() => {
    const props = {
      headerHeight: 60,
      trace: transformTraceData(testTrace),
    };
    wrapper = shallow(<TraceGraph {...props} />);
  });

  it('it does not explode', () => {
    expect(wrapper).toBeDefined();
    expect(wrapper.find('.TraceGraph--menu').length).toBe(1);
    expect(wrapper.find('Button').length).toBe(3);
  });

  it('it calculates TraceGraph', () => {
    const traceDag = wrapper.instance().calculateTraceDag();
    expect(traceDag.nodesMap.size).toBe(9);
    const nodes = [...traceDag.nodesMap.values()];
    assertData(nodes, 'service1', 'op1', 1, 0, 390, 39, 224);
    // accumulate data (count,times)
    assertData(nodes, 'service1', 'op2', 2, 1, 70, 7, 70);
    // self-time is substracted from child
    assertData(nodes, 'service1', 'op3', 1, 0, 66, 6.6, 46);
    assertData(nodes, 'service2', 'op1', 1, 0, 20, 2, 2);
    assertData(nodes, 'service2', 'op2', 1, 0, 18, 1.8, 18);
    // follows_from relation will not influence self-time
    assertData(nodes, 'service1', 'op4', 1, 0, 20, 2, 20);
    assertData(nodes, 'service2', 'op3', 1, 0, 200, 20, 200);
    // fork-join self-times are calculated correctly (self-time drange)
    assertData(nodes, 'service1', 'op6', 1, 0, 10, 1, 1);
    assertData(nodes, 'service1', 'op7', 2, 0, 17, 1.7, 17);
  });

  it('it may show no traces', () => {
    const props = {};
    wrapper = shallow(<TraceGraph {...props} />);
    expect(wrapper).toBeDefined();
    expect(wrapper.find('h1').text()).toBe('No trace found');
  });

  it('it toggle nodeMode to time', () => {
    const mode = MODE_SERVICE;
    wrapper.setState({ mode });
    wrapper.instance().toggleNodeMode(MODE_TIME);
    const modeState = wrapper.state('mode');
    expect(modeState).toEqual(MODE_TIME);
  });

  it('it validates button nodeMode change click', () => {
    const toggleNodeMode = jest.spyOn(wrapper.instance(), 'toggleNodeMode');
    const btnService = wrapper.find('.TraceGraph--btn-service');
    expect(btnService.length).toBe(1);
    btnService.simulate('click');
    expect(toggleNodeMode).toHaveBeenCalledWith(MODE_SERVICE);
    const btnTime = wrapper.find('.TraceGraph--btn-time');
    expect(btnTime.length).toBe(1);
    btnTime.simulate('click');
    expect(toggleNodeMode).toHaveBeenCalledWith(MODE_TIME);
    const btnSelftime = wrapper.find('.TraceGraph--btn-selftime');
    expect(btnSelftime.length).toBe(1);
    btnSelftime.simulate('click');
    expect(toggleNodeMode).toHaveBeenCalledWith(MODE_SELFTIME);
  });

  it('it shows help', () => {
    const showHelp = false;
    wrapper.setState({ showHelp });
    wrapper.instance().showHelp();
    expect(wrapper.state('showHelp')).toBe(true);
  });

  it('it hides help', () => {
    const showHelp = true;
    wrapper.setState({ showHelp });
    wrapper.instance().closeSidebar();
    expect(wrapper.state('showHelp')).toBe(false);
  });

  it('it uses stroke-dash edges for followsFrom', () => {
    const edge = { from: 0, to: 1, followsFrom: true };
    expect(setOnEdgePath(edge)).toEqual({ strokeDasharray: 4 });

    const edge2 = { from: 0, to: 1, followsFrom: false };
    expect(setOnEdgePath(edge2)).toEqual({});
  });
});
