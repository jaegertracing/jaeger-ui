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
import { Popover } from 'antd';
import { IoClose } from 'react-icons/io5';
import { shallow } from 'enzyme';

import BreakableText from './BreakableText';
import NameSelector, { DEFAULT_PLACEHOLDER } from './NameSelector';

describe('<NameSelector>', () => {
  const placeholder = 'This is the placeholder';
  let props;
  let wrapper;

  beforeEach(() => {
    props = {
      placeholder,
      label: 'a-label',
      options: ['a', 'b', 'c'],
      value: null,
      required: true,
      setValue: jest.fn(),
    };

    wrapper = shallow(<NameSelector {...props} />);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders without exploding', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('renders with is-invalid when required and without a value', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('renders without is-invalid when not required and without a value', () => {
    wrapper.setProps({ required: undefined });
    expect(wrapper).toMatchSnapshot();
  });

  describe('placeholder prop', () => {
    it('renders the placeholder when it is a string and value == null', () => {
      wrapper.setProps({ placeholder, value: null });
      expect(wrapper.find(BreakableText).prop('text')).toBe(placeholder);
    });

    it('renders the default placeholder when the prop is true and value == null', () => {
      wrapper.setProps({ placeholder: true, value: null });
      expect(wrapper.find(BreakableText).prop('text')).toBe(DEFAULT_PLACEHOLDER);
    });

    it('does not render a placeholder if there is a value', () => {
      const value = 'some-value';
      wrapper.setProps({ placeholder, value });
      expect(wrapper.find(BreakableText).prop('text')).toBe(value);
      wrapper.setProps({ placeholder: true, value });
      expect(wrapper.find(BreakableText).prop('text')).toBe(value);
    });

    it('does not render default placeholder if placeholder is disabled', () => {
      wrapper.setProps({ placeholder: undefined });
      expect(wrapper.find(BreakableText).prop('text')).toBe('');
    });
  });

  it('allows the filtered list to set values', () => {
    const v = 'test-value';
    const popover = wrapper.find(Popover);
    const list = popover.prop('content');
    list.props.setValue(v);
    expect(props.setValue.mock.calls).toEqual([[v]]);
  });

  it('hides the popover when the filter calls cancel', () => {
    const popover = wrapper.find(Popover);
    popover.prop('onOpenChange')(true);
    popover.prop('onOpenChange')(true);
    const list = popover.prop('content');
    list.props.cancel();
    expect(popover.prop('open')).toBe(false);
    expect(popover.prop('open')).toBe(false);
  });

  it('hides the popover when clicking outside of the open popover', () => {
    let mouseWithin = false;
    const popover = wrapper.find(Popover);

    popover.prop('onOpenChange')(true);
    wrapper.update();

    const mockRef = {
      current: {
        focusInput: jest.fn(),
        focusInput: jest.fn(),
        isMouseWithin: () => mouseWithin,
      },
    };

    React.useRef = jest.fn().mockReturnValue(mockRef);

    const bodyClickHandler = wrapper.find(Popover).prop('onOpenChange');
    bodyClickHandler(false);
    wrapper.update();

    expect(wrapper.find(Popover).prop('open')).toBe(false);

    mouseWithin = true;
    popover.prop('onOpenChange')(true);
    wrapper.update();
    bodyClickHandler(true);
    wrapper.update();

    expect(wrapper.find(Popover).prop('open')).toBe(true);
  });

  it('controls the visibility of the popover', () => {
    wrapper.find(Popover).prop('onOpenChange')(true);
    wrapper.update();
    expect(wrapper.find(Popover).prop('open')).toBe(true);

    wrapper.find(Popover).prop('onOpenChange')(false);
    wrapper.update();
    expect(wrapper.find(Popover).prop('open')).toBe(false);
  });

  // it('attempts to focus the filter input when the component updates', () => {
  //   const mockFocusInput = jest.fn();
  //   mockRef = { current: { focusInput: mockFocusInput } };
  //   React.useRef = jest.fn().mockReturnValue(mockRef);

  //   wrapper.setProps({ value: 'new-value' });
  //   wrapper.update();

  //   expect(mockFocusInput).toHaveBeenCalled();
  // });
  // it('attempts to focus the filter input when the component updates', () => {
  //   const mockFocusInput = jest.fn();
  //   mockRef = { current: { focusInput: mockFocusInput } };
  //   React.useRef = jest.fn().mockReturnValue(mockRef);

  //   wrapper.setProps({ value: 'new-value' });
  //   wrapper.update();

  //   expect(mockFocusInput).toHaveBeenCalled();
  // });

  describe('clear', () => {
    const clearValue = jest.fn();

    beforeEach(() => {
      clearValue.mockClear();
      wrapper.setProps({ clearValue, required: undefined, value: 'foo' });
    });

    it('renders with clear icon when not required and with a value', () => {
      expect(wrapper).toMatchSnapshot();
    });

    it('clicking clear icon clears value when not required without opening popover', () => {
      const stopPropagation = jest.fn();
      wrapper.find(IoClose).simulate('click', { stopPropagation });

      expect(clearValue).toHaveBeenCalled();
      expect(wrapper.find(Popover).prop('open')).toBe(false);
      expect(wrapper.find(Popover).prop('open')).toBe(false);
      expect(stopPropagation).toHaveBeenCalled();
    });

    // it('throws Error when attempting to clear when required', () => {
    //   wrapper.setProps({ required: false, value: 'foo' });
    //   wrapper.update();
    //   const clearIcon = wrapper.find(IoClose);
    //   expect(clearIcon).toHaveLength(1);
    //   wrapper.setProps({ required: true });
    //   wrapper.update();
    //   const event = { stopPropagation: jest.fn() };
    //   expect(clearIcon.prop('onClick')).toThrowError('Cannot clear value of required NameSelector');
    // });
  });
});
