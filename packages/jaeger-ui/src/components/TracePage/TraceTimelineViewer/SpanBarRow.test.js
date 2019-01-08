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

import React from 'react';
import { mount } from 'enzyme';
import { Popover } from 'antd';

import SpanBarRow from './SpanBarRow';
import SpanTreeOffset from './SpanTreeOffset';

jest.mock('./SpanTreeOffset');

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
    operationName: 'op-name',
    numTicks: 5,
    rpc: {
      viewStart: 0.25,
      viewEnd: 0.75,
      color: 'color-b',
      operationName: 'rpc-op-name',
      serviceName: 'rpc-service-name',
    },
    showErrorIcon: false,
    getViewedBounds: s => {
      // Log entries
      if (s === 10) {
        return { start: 0.1, end: 0.1 };
      } else if (s === 20) {
        return { start: 0.2, end: 0.2 };
      }
      // Span value
      return { start: 0, end: 1 };
    },
    trace: {
      startTime: 0,
    },
    span: {
      duration: 'test-duration',
      hasChildren: true,
      process: {
        serviceName: 'service-name',
      },
      spanID,
      logs: [
        {
          timestamp: 10,
          fields: [{ key: 'message', value: 'oh the log message' }, { key: 'something', value: 'else' }],
        },
        {
          timestamp: 10,
          fields: [
            { key: 'message', value: 'oh the second log message' },
            { key: 'something', value: 'different' },
          ],
        },
        {
          timestamp: 20,
          fields: [{ key: 'message', value: 'oh the next log message' }, { key: 'more', value: 'stuff' }],
        },
      ],
    },
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
    wrapper.find('div.span-view').prop('onClick')();
    expect(onDetailToggled.mock.calls).toEqual([[spanID]]);
  });

  it('escalates children toggling', () => {
    const { onChildrenToggled } = props;
    expect(onChildrenToggled.mock.calls.length).toBe(0);
    wrapper.find(SpanTreeOffset).prop('onClick')();
    expect(onChildrenToggled.mock.calls).toEqual([[spanID]]);
  });

  it('log markers count', () => {
    // 3 log entries, two grouped together with the same timestamp
    expect(wrapper.find(Popover).length).toEqual(2);
  });
});
