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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import OpNode, { getNodeRenderer, MODE_SERVICE, MODE_TIME, MODE_SELFTIME } from './OpNode';
import CopyIcon from '../../common/CopyIcon';

describe('<OpNode>', () => {
  let rendered;
  beforeEach(() => {
    rendered = render(<OpNode {...props} mode={mode} / data-testid="opnode">));
  });

  it('does not explode', () => {
    expect(wrapper).toBeDefined();
    expect(screen.getAllByTestId('.OpNode')).toHaveLength(1);
    expect(screen.getAllByTestId('.OpNode--mode-service')).toHaveLength(1);
  });

  it('renders OpNode', () => {
    expect(wrapper.find('.OpNode--count').text()).toBe('5 / 0');
    expect(wrapper.find('.OpNode--time').text()).toBe('200 ms (7.89 %)');
    expect(wrapper.find('.OpNode--avg').text()).toBe('40 ms');
    expect(wrapper.find('.OpNode--selfTime').text()).toBe('180 ms (90 %)');
    expect(wrapper.find('.OpNode--op').text()).toBe('op1');
    expect(wrapper.find('.OpNode--service').find('strong').text()).toBe('service1');
  });

  it('switches mode', () => {
    mode = MODE_SERVICE;
    wrapper = shallow(<OpNode {...props} mode={mode} / data-testid="opnode">);
    expect(screen.getAllByTestId('.OpNode--mode-service')).toHaveLength(1);
    expect(screen.getAllByTestId('.OpNode--mode-time')).toHaveLength(0);
    expect(screen.getAllByTestId('.OpNode--mode-selftime')).toHaveLength(0);

    mode = MODE_TIME;
    wrapper = shallow(<OpNode {...props} mode={mode} / data-testid="opnode">);
    expect(screen.getAllByTestId('.OpNode--mode-service')).toHaveLength(0);
    expect(screen.getAllByTestId('.OpNode--mode-time')).toHaveLength(1);
    expect(screen.getAllByTestId('.OpNode--mode-selftime')).toHaveLength(0);

    mode = MODE_SELFTIME;
    wrapper = shallow(<OpNode {...props} mode={mode} / data-testid="opnode">);
    expect(screen.getAllByTestId('.OpNode--mode-service')).toHaveLength(0);
    expect(screen.getAllByTestId('.OpNode--mode-time')).toHaveLength(0);
    expect(screen.getAllByTestId('.OpNode--mode-selftime')).toHaveLength(1);
  });

  it('renders a copy icon', () => {
    const copyIcon = wrapper.find(CopyIcon);
    expect(copyIcon.length).toBe(1);
    expect(copyIcon.prop('copyText')).toBe(`${props.service} ${props.operation}`);
    expect(copyIcon.prop('tooltipTitle')).toBe('Copy label');
  });

  describe('getNodeRenderer()', () => {
    const key = 'key test value';
    const vertex = {
      data: {
        service: 'service1',
        operation: 'op1',
        data: {},
      },
      key,
    };

    it('creates OpNode', () => {
      const drawNode = getNodeRenderer(MODE_SERVICE);
      const opNode = drawNode(vertex);
      expect(opNode.type === 'OpNode');
      expect(opNode.props.mode).toBe(MODE_SERVICE);
    });
  });
});
