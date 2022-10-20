// Copyright (c) 2020 Uber Technologies, Inc.
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
import { Button } from 'antd';

import FilteredList from '../FilteredList';
import DetailTableDropdown from './DetailTableDropdown';

describe('DetailTable', () => {
  const options = ['foo', 'bar', 'baz'];
  const props = {
    clearFilters: jest.fn(),
    confirm: jest.fn(),
    options,
    selectedKeys: options.slice(1),
    setSelectedKeys: jest.fn(),
  };
  let wrapper;

  beforeEach(() => {
    props.clearFilters.mockReset();
    props.confirm.mockReset();
    props.setSelectedKeys.mockReset();
    wrapper = shallow(<DetailTableDropdown {...props} />);
  });

  describe('render', () => {
    it('renders as expected', () => {
      expect(wrapper).toMatchSnapshot();
    });

    it('filters duplicates and numbers out of selectedKeys', () => {
      const dupedKeysWithNumbers = props.selectedKeys
        .concat(props.selectedKeys)
        .concat([4, 8, 15, 16, 23, 42]);
      wrapper.setProps({ selectedKeys: dupedKeysWithNumbers });
      expect(wrapper.find(FilteredList).prop('value')).toEqual(new Set(props.selectedKeys));
    });

    it('handles missing clearFilters prop', () => {
      wrapper.setProps({ clearFilters: undefined });
      expect(() =>
        wrapper
          .find(Button)
          .first()
          .simulate('click')
      ).not.toThrow();
    });
  });

  describe('cancel', () => {
    const selectedKeys = [options[0]];

    it('resets to this.selectedKeys on cancel and calls confirm once props reflect cancellation', () => {
      wrapper.instance().selected = selectedKeys;
      expect(props.confirm).not.toHaveBeenCalled();
      expect(props.setSelectedKeys).not.toHaveBeenCalled();

      wrapper
        .find(Button)
        .at(1)
        .simulate('click');
      expect(props.setSelectedKeys).toHaveBeenCalledTimes(1);
      expect(props.setSelectedKeys).toHaveBeenCalledWith(selectedKeys);
      expect(props.confirm).not.toHaveBeenCalled();

      wrapper.setProps({ selectedKeys });
      expect(props.setSelectedKeys).toHaveBeenCalledTimes(1);
      expect(props.confirm).toHaveBeenCalledTimes(1);
    });

    it('updates this.selectedKeys on open/close', () => {
      expect(wrapper.instance().selected).not.toEqual(selectedKeys);

      wrapper.setProps({ selectedKeys: selectedKeys.slice() });
      expect(wrapper.instance().selected).not.toEqual(selectedKeys);

      wrapper.setProps({ selectedKeys: selectedKeys.slice() });
      expect(wrapper.instance().selected).toEqual(selectedKeys);
    });

    it('maintains this.selectedKeys on changed selection', () => {
      wrapper.instance().selected = selectedKeys;
      wrapper.setProps({ selectedKeys: props.options.slice(0, props.selectedKeys.length) });
      expect(wrapper.instance().selected).toBe(selectedKeys);
    });
  });

  describe('FilteredList interactions', () => {
    const getFn = propName => wrapper.find(FilteredList).prop(propName);

    it('adds values', () => {
      const newValues = props.options.map(o => `not-${o}`);
      getFn('addValues')(newValues);
      expect(props.setSelectedKeys).toHaveBeenCalledWith([...props.selectedKeys, ...newValues]);
    });

    it('removes values', () => {
      getFn('removeValues')([props.selectedKeys[0]]);
      expect(props.setSelectedKeys).toHaveBeenCalledWith(props.selectedKeys.slice(1));
    });

    it('sets a value', () => {
      getFn('setValue')(props.options[0]);
      expect(props.setSelectedKeys).toHaveBeenCalledWith([props.options[0]]);
    });
  });
});
