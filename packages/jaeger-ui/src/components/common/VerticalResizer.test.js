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

import VerticalResizer from './VerticalResizer';

describe('<VerticalResizer>', () => {
  let wrapper;

  const props = {
    min: 0.1,
    max: 0.9,
    onChange: jest.fn(),
    position: 0.5,
  };

  beforeEach(() => {
    props.onChange.mockReset();
    wrapper = mount(<VerticalResizer {...props} />);
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
    expect(wrapper.find('.VerticalResizer').length).toBe(1);
    expect(wrapper.find('.VerticalResizer--gripIcon').length).toBe(1);
    expect(wrapper.find('.VerticalResizer--dragger').length).toBe(1);
  });

  it('sets the root element', () => {
    const rootElm = wrapper.find('.VerticalResizer').getDOMNode();
    expect(rootElm).toBe(wrapper.instance().rootElmRef.current);
  });

  it('handles drag start and updates drag position', () => {
    const value = 0.6;
    wrapper.find('.VerticalResizer--dragger').simulate('mousedown');
    wrapper.instance().handleDragUpdate({ value });
    expect(wrapper.state('dragPosition')).toBe(value);
  });

  it('handles drag end and calls onChange', () => {
    const value = 0.7;
    wrapper.find('.VerticalResizer--dragger').simulate('mousedown');
    wrapper.instance().handleDragEnd({ manager: { resetBounds: jest.fn() }, value });
    expect(props.onChange).toHaveBeenCalledWith(value);
  });

  it('cleans up DraggableManager on unmount', () => {
    const disposeSpy = jest.spyOn(wrapper.instance().dragManagerRef.current, 'dispose');
    wrapper.unmount();
    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });
});