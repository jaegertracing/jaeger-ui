// Copyright (c) 2017 Uber Technologies, Inc.
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

import _omit from 'lodash/omit';

import React from 'react';
import { mount } from 'enzyme';

import SpanBarRow from './SpanBarRow';
import SpanTreeOffset from './SpanTreeOffset';
import { getConfigValue } from '../../../utils/config/get-config';

jest.mock('./SpanTreeOffset');
jest.mock('../../../utils/config/get-config');

describe('<SpanBarRow>', () => {
  const spanID = 'some-id';
  const props = {
    className: 'a-class-name',
    color: 'color-a',
    columnDivision: '0.5',
    isChildrenExpanded: true,
    isDetailExpanded: false,
    isFilteredOut: false,
    onDetailToggled: jest.fn(),
    onChildrenToggled: jest.fn(),
    numTicks: 5,
    rpc: {
      viewStart: 0.25,
      viewEnd: 0.75,
      color: 'color-b',
      operationName: 'rpc-op-name',
      serviceName: 'rpc-service-name',
    },
    showErrorIcon: false,
    getViewedBounds: () => ({ start: 0, end: 1 }),
    span: {
      duration: 'test-duration',
      operationName: 'op-name',
      hasChildren: true,
      process: {
        serviceName: 'service-name',
      },
      spanID,
      logs: [],
      tags: [{ key: 'opLabelTag', value: '#id' }],
    },
  };

  let wrapper;

  beforeEach(() => {
    props.onDetailToggled.mockReset();
    props.onChildrenToggled.mockReset();
    getConfigValue.mockReset();
    wrapper = mount(<SpanBarRow {...props} />);
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
    expect(wrapper.find('.endpoint-name').text()).toBe('rpc-op-name');
  });

  it('escalates detail toggling', () => {
    const { onDetailToggled } = props;
    expect(onDetailToggled.mock.calls.length).toBe(0);
    wrapper.find('div.span-view').prop('onClick')();
    expect(onDetailToggled.mock.calls).toEqual([[spanID]]);
  });

  it('escalates children toggling', () => {
    const { onChildrenToggled } = props;
    expect(onChildrenToggled.mock.calls.length).toBe(0);
    wrapper.find(SpanTreeOffset).prop('onClick')();
    expect(onChildrenToggled.mock.calls).toEqual([[spanID]]);
  });

  it('has expected lebel when pattern is set and tags exist', () => {
    getConfigValue.mockReturnValue('(#{opLabelTag})');
    wrapper = mount(<SpanBarRow {...props} />);
    expect(wrapper.find('.endpoint-name').text()).toBe('rpc-op-name (#id)');
  });

  it('hides unless every tag exists', () => {
    getConfigValue.mockReturnValue('#{opLabelTag} #{http.status_code}');
    wrapper = mount(<SpanBarRow {...props} />);
    expect(wrapper.find('.endpoint-name').text()).toBe('rpc-op-name');
  });

  it('has expected lebel when no rpc', () => {
    const norpc = _omit(props, 'rpc');
    wrapper = mount(<SpanBarRow {...norpc} />);
    expect(wrapper.find('.endpoint-name').text()).toBe('op-name');
  });
});
