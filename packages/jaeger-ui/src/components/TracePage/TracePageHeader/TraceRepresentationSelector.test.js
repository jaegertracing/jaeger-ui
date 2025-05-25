// Copyright (c) 2023 The Jaeger Authors.
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

import * as React from 'react';
import { shallow } from 'enzyme';
import { Dropdown } from 'antd';
import TraceRepresentationSelector from './TraceRepresentationSelector';

describe('TraceRepresentationSelector', () => {
  const representations = [
    {
      name: 'Original',
      description: 'Original trace without any modifications',
      transformFunction: 'function(trace) { return trace; }',
    },
    {
      name: 'Test Representation',
      description: 'Test representation for unit tests',
      transformFunction: 'function(trace) { return trace; }',
    },
  ];

  const props = {
    representations,
    currentRepresentation: 'Original',
    onRepresentationChange: jest.fn(),
  };

  let wrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    wrapper = shallow(<TraceRepresentationSelector {...props} />);
  });

  it('renders correctly', () => {
    expect(wrapper).toBeDefined();
    expect(wrapper.find(Dropdown).length).toBe(1);
  });

  it('renders nothing when there are no representations', () => {
    wrapper.setProps({ representations: [] });
    expect(wrapper.type()).toBeNull();
  });

  it('renders nothing when there is only one representation', () => {
    wrapper.setProps({ representations: [representations[0]] });
    expect(wrapper.type()).toBeNull();
  });

  it('calls onRepresentationChange when a representation is selected', () => {
    const items = wrapper.find(Dropdown).prop('menu').items;
    const testRepItem = items.find(item => item.key === 'Test Representation');
    
    expect(testRepItem).toBeDefined();
    testRepItem.label.props.onClick();
    
    expect(props.onRepresentationChange).toHaveBeenCalledTimes(1);
    expect(props.onRepresentationChange).toHaveBeenCalledWith(representations[1]);
  });

  it('displays the current representation name', () => {
    const buttonText = wrapper.find('Button').childAt(0).text();
    expect(buttonText).toContain('Original');
    
    wrapper.setProps({ currentRepresentation: 'Test Representation' });
    const updatedButtonText = wrapper.find('Button').childAt(0).text();
    expect(updatedButtonText).toContain('Test Representation');
  });
});