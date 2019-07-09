// Copyright (c) 2019 Uber Technologies, Inc.
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

import Header from './index';
import NameSelector from './NameSelector';

describe('<ListItem>', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<Header />);
  });

  it('renders without exploding', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('omits the operation selector if a service is not selected', () => {
    expect(wrapper.state('service')).toBe(null);
    const nameSelector = wrapper.find(NameSelector);
    expect(nameSelector.length).toBe(1);
    expect(nameSelector.prop('label')).toMatch(/service/i);
  });

  it('renders the operation selector if a service is selected', () => {
    expect(wrapper.state('service')).toBe(null);
    let nameSelector = wrapper.find(NameSelector);
    nameSelector.prop('setValue')('a');
    nameSelector = wrapper.find(NameSelector);
    expect(nameSelector.length).toBe(2);
    expect(nameSelector.at(1).prop('label')).toMatch(/operation/i);
    expect(wrapper).toMatchSnapshot();
  });
});
