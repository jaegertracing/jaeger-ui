// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import React from 'react';
import { mount } from 'enzyme';

import SpanBarRow from './SpanBarRow';

describe('<SpanBarRow>', () => {
  const spanID = 'some-id';
  const props = {
    spanID,
    className: 'a-class-name',
    color: 'color-a',
    columnDivision: '0.5',
    depth: 3,
    isChildrenExpanded: true,
    isDetailExapnded: false,
    isFilteredOut: false,
    isParent: true,
    label: 'omg-awesome-label',
    onDetailToggled: jest.fn(),
    onChildrenToggled: jest.fn(),
    operationName: 'op-name',
    numTicks: 5,
    rpc: {
      viewStart: 0.25,
      viewEnd: 0.75,
      color: 'color-b',
      operationName: 'rpc-op-name',
      serviceName: 'rpc-service-name',
    },
    serviceName: 'service-name',
    showErrorIcon: false,
    viewEnd: 1,
    viewStart: 0,
  };

  let wrapper;

  beforeEach(() => {
    props.onDetailToggled.mockReset();
    props.onChildrenToggled.mockReset();
    wrapper = mount(<SpanBarRow {...props} />);
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
  });

  it('escalates detail toggling', () => {
    const { onDetailToggled } = props;
    expect(onDetailToggled.mock.calls.length).toBe(0);
    wrapper.find('.span-view').prop('onClick')();
    expect(onDetailToggled.mock.calls).toEqual([[spanID]]);
  });

  it('escalates children toggling', () => {
    const { onChildrenToggled } = props;
    expect(onChildrenToggled.mock.calls.length).toBe(0);
    wrapper.find('SpanTreeOffset').prop('onClick')();
    expect(onChildrenToggled.mock.calls).toEqual([[spanID]]);
  });
});
