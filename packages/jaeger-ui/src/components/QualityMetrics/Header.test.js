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
import { InputNumber } from 'antd';
import debounceMock from 'lodash/debounce';

import Header from './Header';

jest.mock('lodash/debounce');

// Using a more memory-efficient approach
describe('Header', () => {
  const lookback = 4;
  const minProps = {
    lookback,
    setLookback: jest.fn(),
    setService: jest.fn(),
  };
  const service = 'test service';
  const props = {
    ...minProps,
    service,
    services: ['foo', 'bar', 'baz'],
  };
  let wrapper;
  let callDebouncedFn;
  let setLookbackSpy;

  // Setup debounce mock only once
  beforeAll(() => {
    debounceMock.mockImplementation(fn => {
      setLookbackSpy = jest.fn((...args) => {
        callDebouncedFn = () => fn(...args);
      });
      return setLookbackSpy;
    });
  });

  // Clean up between tests to help with memory
  beforeEach(() => {
    // Reset mocks
    props.setLookback.mockReset();
    setLookbackSpy = undefined;

    // Clean up previous wrapper
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }

    // Create new wrapper
    wrapper = shallow(<Header {...props} />);
  });

  // Clean up after each test
  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('rendering', () => {
    it('renders as expected with minimum props', () => {
      wrapper = shallow(<Header {...minProps} />);
      expect(wrapper).toMatchSnapshot();
    });

    it('renders as expected with full props', () => {
      expect(wrapper).toMatchSnapshot();
    });

    it('renders props.lookback when state.ownInputValue is `undefined`', () => {
      expect(wrapper.find(InputNumber).prop('value')).toBe(lookback);
    });

    it('renders state.ownInputValue when it is not `undefined` regardless of props.lookback', () => {
      const ownInputValue = 27;
      wrapper.setState({ ownInputValue });
      expect(wrapper.find(InputNumber).prop('value')).toBe(ownInputValue);
    });
  });

  describe('setting lookback', () => {
    it('no-ops for string values', () => {
      wrapper.find(InputNumber).prop('onChange')('foo');
      expect(wrapper.state('ownInputValue')).toBe(null);
    });

    it('updates state with numeric value, then clears state and calls props.setLookback after debounce', () => {
      const value = 42;
      wrapper.find(InputNumber).prop('onChange')(value);

      expect(wrapper.state('ownInputValue')).toBe(value);
      expect(setLookbackSpy).toHaveBeenCalledWith(42);
      expect(props.setLookback).not.toHaveBeenCalled();

      callDebouncedFn();
      expect(wrapper.state('ownInputValue')).toBe(null);
      expect(props.setLookback).toHaveBeenCalledWith(42);
    });
  });
});
