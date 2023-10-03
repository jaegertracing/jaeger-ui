// Copyright (c) 2023 The Jaeger Authors
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

import { Select } from 'antd';
import SearchableSelect from './SearchableSelect';

describe('SearchableSelect', () => {
  let wrapper;

  const options = [
    { label: 'Test 1', value: 'test1' },
    { label: 'Test 2', value: 'test2' },
    { label: 'Test 3', value: 'test3' },
  ];

  beforeEach(() => {
    wrapper = shallow(
      <SearchableSelect data-testid="search-select">
        {options.map((option, i) => (
          <Select.Option key={option.value} value={option.value} data-testid={`option-${i}`}>
            {option.label}
          </Select.Option>
        ))}
      </SearchableSelect>
    );
  });

  it('SearchableSelect renders with all props and options', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('search is enabled', () => {
    expect(wrapper.props().showSearch).toBe(true);
  });

  it('renders all the options correctly', () => {
    const ops = wrapper.find(Select.Option);

    expect(ops.length).toBe(3);

    ops.forEach((op, i) => {
      expect(op.props().value).toBe(options[i].value);
      expect(op.props().children).toBe(options[i].label);
    });
  });
});
