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

import OpNode, { getNodeDrawer, MODE_SERVICE, MODE_TIME, MODE_SELFTIME } from './OpNode';
import CopyIcon from '../../common/copy-icon';

describe('<OpNode>', () => {
  let wrapper;
  let mode;
  let props;

  beforeEach(() => {
    mode = MODE_SERVICE;
    props = {
      count: 5,
      errors: 0,
      time: 200000,
      percent: 7.89,
      selfTime: 180000,
      percentSelfTime: 90,
      operation: 'op1',
      service: 'service1',
    };
    wrapper = shallow(<OpNode {...props} mode={mode} />);
  });

  it('it does not explode', () => {
    expect(wrapper).toBeDefined();
    expect(wrapper.find('.OpNode').length).toBe(1);
    expect(wrapper.find('.OpNode--mode-service').length).toBe(1);
  });

  it('it renders OpNode', () => {
    expect(wrapper.find('.OpNode--count').text()).toBe('5 / 0');
    expect(wrapper.find('.OpNode--time').text()).toBe('200 ms (7.89 %)');
    expect(wrapper.find('.OpNode--avg').text()).toBe('40 ms');
    expect(wrapper.find('.OpNode--selfTime').text()).toBe('180 ms (90 %)');
    expect(wrapper.find('.OpNode--op').text()).toBe('op1');
    expect(
      wrapper
        .find('.OpNode--service')
        .find('strong')
        .text()
    ).toBe('service1');
  });

  it('it switches mode', () => {
    mode = MODE_SERVICE;
    wrapper = shallow(<OpNode {...props} mode={mode} />);
    expect(wrapper.find('.OpNode--mode-service').length).toBe(1);
    expect(wrapper.find('.OpNode--mode-time').length).toBe(0);
    expect(wrapper.find('.OpNode--mode-selftime').length).toBe(0);

    mode = MODE_TIME;
    wrapper = shallow(<OpNode {...props} mode={mode} />);
    expect(wrapper.find('.OpNode--mode-service').length).toBe(0);
    expect(wrapper.find('.OpNode--mode-time').length).toBe(1);
    expect(wrapper.find('.OpNode--mode-selftime').length).toBe(0);

    mode = MODE_SELFTIME;
    wrapper = shallow(<OpNode {...props} mode={mode} />);
    expect(wrapper.find('.OpNode--mode-service').length).toBe(0);
    expect(wrapper.find('.OpNode--mode-time').length).toBe(0);
    expect(wrapper.find('.OpNode--mode-selftime').length).toBe(1);
  });

  it('renders a copy icon', () => {
    const copyIcon = wrapper.find(CopyIcon);
    expect(copyIcon.length).toBe(1);
    expect(copyIcon.prop('copyText')).toBe(`${props.service} ${props.operation}`);
    expect(copyIcon.prop('tooltipTitle')).toBe('Copy label');
  });

  describe('getNodeDrawer()', () => {
    it('it creates OpNode', () => {
      const vertex = {
        data: {
          service: 'service1',
          operation: 'op1',
          data: {},
        },
      };
      const drawNode = getNodeDrawer(MODE_SERVICE);
      const opNode = drawNode(vertex);
      expect(opNode.type === 'OpNode');
    });
  });
});
