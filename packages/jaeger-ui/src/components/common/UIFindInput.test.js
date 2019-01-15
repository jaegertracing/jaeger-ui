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

import * as React from 'react';
import { shallow } from 'enzyme';
import { Input } from 'antd';
import debounceMock from 'lodash/debounce';
import queryString from 'query-string';

import { UnconnectedUIFindInput, extractUIFindFromState } from './UIFindInput';
import updateUIFindSpy from '../../utils/update-ui-find';

jest.mock('lodash/debounce');

jest.mock('../../utils/update-ui-find');

describe('UIFind', () => {
  const flushMock = jest.fn();
  const queryStringParseSpy = jest.spyOn(queryString, 'parse');

  const uiFind = 'uiFind';
  const ownInputValue = 'ownInputValue';
  const props = {
    uiFind: null,
    history: {
      replace: () => {},
    },
    location: {
      search: null,
    },
  };
  let wrapper;

  beforeAll(() => {
    debounceMock.mockImplementation(fn => {
      function debounceFunction(...args) {
        fn(...args);
      }
      debounceFunction.flush = flushMock;
      return debounceFunction;
    });
  });

  beforeEach(() => {
    flushMock.mockReset();
    wrapper = shallow(<UnconnectedUIFindInput {...props} />);
  });

  describe('rendering', () => {
    it('renders as expected', () => {
      expect(wrapper).toMatchSnapshot();
    });

    it('renders props.uiFind when state.ownInputValue is `null`', () => {
      wrapper.setProps({ uiFind });
      expect(wrapper.find(Input).prop('value')).toBe(uiFind);
    });

    it('renders state.ownInputValue when it is not `null` regardless of props.uiFind', () => {
      wrapper.setProps({ uiFind });
      wrapper.setState({ ownInputValue });
      expect(wrapper.find(Input).prop('value')).toBe(ownInputValue);
    });
  });

  describe('typing in input', () => {
    const newValue = 'newValue';

    it('updates state', () => {
      wrapper.find(Input).simulate('change', { target: { value: newValue } });
      expect(wrapper.state('ownInputValue')).toBe(newValue);
    });

    it('calls updateUIFind with correct kwargs', () => {
      wrapper.find(Input).simulate('change', { target: { value: newValue } });
      expect(updateUIFindSpy).toHaveBeenLastCalledWith({
        history: props.history,
        location: props.location,
        uiFind: newValue,
      });
    });
  });

  describe('blurring input', () => {
    it('clears state.ownInputValue', () => {
      wrapper.setState({ ownInputValue });
      expect(wrapper.state('ownInputValue')).toBe(ownInputValue);
      wrapper.find(Input).simulate('blur');
      expect(wrapper.state('ownInputValue')).toBe(null);
    });

    it('triggers pending queryParameter updates', () => {
      wrapper.find(Input).simulate('blur');
      expect(flushMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('extractUIFindFromState', () => {
    beforeAll(() => {
      queryStringParseSpy.mockReturnValue({ uiFind });
    });

    it('returns uiFind from parsed state.router.location.search', () => {
      const reduxStateValue = 'state.router.location.search';
      const result = extractUIFindFromState({
        router: {
          location: {
            search: reduxStateValue,
          },
        },
      });
      expect(queryStringParseSpy).toHaveBeenCalledWith(reduxStateValue);
      expect(result).toEqual({
        uiFind,
      });
    });
  });
});
