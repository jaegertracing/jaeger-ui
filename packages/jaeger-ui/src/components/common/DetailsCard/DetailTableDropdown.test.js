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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  let rendered;
  beforeEach(() => {
    rendered = render(<DetailTableDropdown {...props} / data-testid="detailtabledropdown">));
  });

  describe('render', () => {
    it('renders as expected', () => {
      expect(container).toMatchSnapshot();
    });

    it('filters duplicates and numbers out of selectedKeys', () => {
      const dupedKeysWithNumbers = props.selectedKeys
        .concat(props.selectedKeys)
        .concat([4, 8, 15, 16, 23, 42]);
      rendered = render({ selectedKeys: dupedKeysWithNumbers });
      expect(wrapper.find(FilteredList).prop('value')).toEqual(new Set(props.selectedKeys));
    });

    it('handles missing clearFilters prop', () => {
      rendered = render({ clearFilters: undefined });
      expect(() => wrapper.find(Button).first().simulate('click')).not.toThrow();
    });
  });

  describe('cancel', () => {
    const selectedKeys = [options[0]];

    it('resets to this.selectedKeys on cancel and calls confirm once props reflect cancellation', () => {
      // RTL doesn't access component instances - use assertions on rendered output instead.selected = selectedKeys;
      expect(props.confirm).not.toHaveBeenCalled();
      expect(props.setSelectedKeys).not.toHaveBeenCalled();

      wrapper.find(Button).at(1).simulate('click');
      expect(props.setSelectedKeys).toHaveBeenCalledTimes(1);
      expect(props.setSelectedKeys).toHaveBeenCalledWith(selectedKeys);
      expect(props.confirm).not.toHaveBeenCalled();

      rendered = render({ selectedKeys });
      expect(props.setSelectedKeys).toHaveBeenCalledTimes(1);
      expect(props.confirm).toHaveBeenCalledTimes(1);
    });

    it('updates this.selectedKeys on open/close', () => {
      expect(// RTL doesn't access component instances - use assertions on rendered output instead.selected).not.toEqual(selectedKeys);

      rendered = render({ selectedKeys: selectedKeys.slice() });
      expect(// RTL doesn't access component instances - use assertions on rendered output instead.selected).not.toEqual(selectedKeys);

      rendered = render({ selectedKeys: selectedKeys.slice() });
      expect(// RTL doesn't access component instances - use assertions on rendered output instead.selected).toEqual(selectedKeys);
    });

    it('maintains this.selectedKeys on changed selection', () => {
      // RTL doesn't access component instances - use assertions on rendered output instead.selected = selectedKeys;
      rendered = render({ selectedKeys: props.options.slice(0, props.selectedKeys.length) });
      expect(// RTL doesn't access component instances - use assertions on rendered output instead.selected).toBe(selectedKeys);
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
