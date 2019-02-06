// Copyright (c) 2019 The Jaeger Authors.
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
import _map from 'lodash/map';

import drawNode, { DiffNode } from './drawNode';
import filterSpansMock from '../../../utils/filter-spans';

jest.mock('../../../utils/filter-spans');

describe('drawNode', () => {
  const members = [
    {
      span: {
        spanID: 'members-span-id-0',
      },
    },
    {
      span: {
        spanID: 'members-span-id-1',
      },
    },
  ];
  const operation = 'operationName';
  const service = 'serviceName';
  describe('diffNode', () => {
    const defaultCount = 100;
    const props = {
      a: defaultCount,
      b: defaultCount,
      members,
      operation,
      service,
    };

    let wrapper;

    beforeEach(() => {
      filterSpansMock.mockClear();
      wrapper = shallow(<DiffNode {...props} />);
    });

    it('renders as expected when props.a and props.b are the same', () => {
      expect(wrapper).toMatchSnapshot();
    });

    it('renders as expected when props.a is less than props.b', () => {
      wrapper.setProps({ a: defaultCount / 2 });
      expect(wrapper).toMatchSnapshot();
    });

    it('renders as expected when props.a is more than props.b', () => {
      wrapper.setProps({ a: defaultCount * 2 });
      expect(wrapper).toMatchSnapshot();
    });

    it('renders as expected when props.a is 0', () => {
      wrapper.setProps({ a: 0 });
      expect(wrapper).toMatchSnapshot();
    });

    it('renders as expected when props.b is 0', () => {
      wrapper.setProps({ b: 0 });
      expect(wrapper).toMatchSnapshot();
    });

    it('renders as expected when props.members matches props.uiFind', () => {
      const uiFind = 'uiFindValue';
      filterSpansMock.mockReturnValue({ size: 1 });
      wrapper.setProps({ uiFind });
      expect(wrapper).toMatchSnapshot();
      expect(filterSpansMock).toHaveBeenLastCalledWith(uiFind, _map(props.members, 'span'));
    });
  });

  describe('drawNode function', () => {
    it('extracts values from vertex.data', () => {
      const dataKey = 'data-key';
      const dataValue = 'data-value';
      const drawNodeResult = drawNode({
        data: {
          data: {
            [dataKey]: dataValue,
          },
          members,
          operation,
          service,
        },
      });
      expect(drawNodeResult.props[dataKey]).toBe(dataValue);
      expect(drawNodeResult.props.members).toBe(members);
      expect(drawNodeResult.props.operation).toBe(operation);
      expect(drawNodeResult.props.service).toBe(service);
    });
  });
});
