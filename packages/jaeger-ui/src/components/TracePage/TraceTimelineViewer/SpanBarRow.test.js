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
import { mount, shallow } from 'enzyme';

import SpanBarRow from './SpanBarRow';
import SpanTreeOffset from './SpanTreeOffset';
import ReferencesButton from './ReferencesButton';
import * as getConfig from '../../../utils/config/get-config';

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
    wrapper = mount(<SpanBarRow {...props} />);
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
    expect(wrapper.find('.endpoint-name').text()).toBe(props.rpc.operationName);
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

  it('render references button', () => {
    const span = Object.assign(
      {
        references: [
          {
            refType: 'CHILD_OF',
            traceID: 'trace1',
            spanID: 'span0',
            span: {
              spanID: 'span0',
            },
          },
          {
            refType: 'CHILD_OF',
            traceID: 'otherTrace',
            spanID: 'span1',
            span: {
              spanID: 'span1',
            },
          },
        ],
      },
      props.span
    );

    const spanRow = shallow(<SpanBarRow {...props} span={span} />);
    const refButton = spanRow.find(ReferencesButton);
    expect(refButton.length).toEqual(1);
    expect(refButton.at(0).props().tooltipText).toEqual('Contains multiple references');
  });

  it('render referenced to by single span', () => {
    const span = Object.assign(
      {
        subsidiarilyReferencedBy: [
          {
            refType: 'CHILD_OF',
            traceID: 'trace1',
            spanID: 'span0',
            span: {
              spanID: 'span0',
            },
          },
        ],
      },
      props.span
    );
    const spanRow = shallow(<SpanBarRow {...props} span={span} />);
    const refButton = spanRow.find(ReferencesButton);
    expect(refButton.length).toEqual(1);
    expect(refButton.at(0).props().tooltipText).toEqual('This span is referenced by another span');
  });

  it('render referenced to by multiple span', () => {
    const span = Object.assign(
      {
        subsidiarilyReferencedBy: [
          {
            refType: 'CHILD_OF',
            traceID: 'trace1',
            spanID: 'span0',
            span: {
              spanID: 'span0',
            },
          },
          {
            refType: 'CHILD_OF',
            traceID: 'trace1',
            spanID: 'span1',
            span: {
              spanID: 'span1',
            },
          },
        ],
      },
      props.span
    );
    const spanRow = shallow(<SpanBarRow {...props} span={span} />);
    const refButton = spanRow.find(ReferencesButton);
    expect(refButton.length).toEqual(1);
    expect(refButton.at(0).props().tooltipText).toEqual('This span is referenced by multiple other spans');
  });

  describe('operation label', () => {
    let getConfigValueSpy;

    beforeAll(() => {
      getConfigValueSpy = jest.spyOn(getConfig, 'getConfigValue');
    });

    beforeEach(() => {
      getConfigValueSpy.mockReset();
    });

    const tagKey = props.span.tags[0].key;

    it('has expected level when pattern is set and tags exist', () => {
      getConfigValueSpy.mockReturnValue(`(#{${tagKey}})`);
      wrapper = mount(<SpanBarRow {...props} />);
      expect(wrapper.find('.endpoint-name').text()).toBe(
        `${props.rpc.operationName} (${props.span.tags[0].value})`
      );
    });

    it('hides unless every tag exists', () => {
      getConfigValueSpy.mockReturnValue('#{opLabelTag} #{ABSENT_KEY}');
      wrapper = mount(<SpanBarRow {...props} />);
      expect(wrapper.find('.endpoint-name').text()).toBe(props.rpc.operationName);
    });

    it('has expected lebel when no rpc', () => {
      const norpc = _omit(props, 'rpc');
      wrapper = mount(<SpanBarRow {...norpc} />);
      expect(wrapper.find('.endpoint-name').text()).toBe(props.span.operationName);
    });
  });
});
