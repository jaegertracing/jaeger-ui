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
import { mount, shallow } from 'enzyme';
import { Icon, Input } from 'antd';
import debounceMock from 'lodash/debounce';
import queryString from 'query-string';

import { UnconnectedGraphSearch, mapStateToProps } from './GraphSearch';
import prefixUrlSpy from '../../utils/prefix-url';

jest.mock('lodash/debounce');

jest.mock('../../utils/prefix-url');

describe('GraphSearch', () => {
  const flushMock = jest.fn();
  const replaceMock = jest.fn();
  const queryStringParseSpy = jest.spyOn(queryString, 'parse');

  const graphSearch = 'graphSearch';
  const ownInputValue = 'ownInputValue';
  const props = {
    graphSearch: null,
    history: {
      replace: replaceMock,
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
    wrapper = shallow(<UnconnectedGraphSearch {...props} />);
  });

  describe('rendering', () => {
    it('renders as expected', () => {
      expect(wrapper).toMatchSnapshot();
    });

    it('renders props.graphSearch when state.ownInputValue is `null`', () => {
      wrapper.setProps({ graphSearch });
      expect(wrapper.find(Input).prop('value')).toBe(graphSearch);
    });

    it('renders state.ownInputValue when it is not `null` regardless of props.graphSearch', () => {
      wrapper.setProps({ graphSearch });
      wrapper.setState({ ownInputValue });
      expect(wrapper.find(Input).prop('value')).toBe(ownInputValue);
    });
  });

  describe('typing in input', () => {
    const newValue = 'newValue';
    const preexistingQueryParams = {
      preexistingParamName: 'preexistingParamValue',
      graphSearch: 'preexstingGraphSearchValue',
    };
    const prefixUrlSpyMockReturnValue = 'prefixUrlSpyMockReturnValue';
    const queryStringStringifySpyMockReturnValue = 'queryStringStringifySpyMockReturnValue';
    const queryStringStringifySpy = jest
      .spyOn(queryString, 'stringify')
      .mockReturnValue(queryStringStringifySpyMockReturnValue);

    beforeAll(() => {
      prefixUrlSpy.mockReturnValue(prefixUrlSpyMockReturnValue);
      queryStringParseSpy.mockReturnValue(preexistingQueryParams);
    });

    beforeEach(() => {
      replaceMock.mockReset();
    });

    afterAll(() => {
      prefixUrlSpy.mockReset();
      queryStringParseSpy.mockReset();
      queryStringStringifySpy.mockReset();
    });

    it('updates state', () => {
      wrapper.find(Input).simulate('change', { target: { value: newValue } });
      expect(wrapper.state('ownInputValue')).toBe(newValue);
    });

    it('adds truthy graphSearch to existing params', () => {
      wrapper.find(Input).simulate('change', { target: { value: newValue } });
      expect(queryStringStringifySpy).toHaveBeenCalledWith({
        ...preexistingQueryParams,
        graphSearch: newValue,
      });
      expect(prefixUrlSpy).toHaveBeenCalledWith(`?${queryStringStringifySpyMockReturnValue}`);
      expect(replaceMock).toHaveBeenCalledWith(prefixUrlSpyMockReturnValue);
    });

    it('omits falsy graphSearch from query params', () => {
      wrapper.find(Input).simulate('change', { target: { value: '' } });
      const { graphSearch: omitted, ...preexistingQueryParamsWithoutGraphSearch } = preexistingQueryParams;
      expect(queryStringStringifySpy).toHaveBeenCalledWith(preexistingQueryParamsWithoutGraphSearch);
      expect(prefixUrlSpy).toHaveBeenCalledWith(`?${queryStringStringifySpyMockReturnValue}`);
      expect(replaceMock).toHaveBeenCalledWith(prefixUrlSpyMockReturnValue);
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

  describe('clicking icon', () => {
    it('handles missing input ref', () => {
      expect(wrapper.instance().inputRef).toBe(null);
      wrapper.find(Icon).simulate('click');
    });

    it('focuses input', () => {
      // Mount is necessary for refs to be registered
      wrapper = mount(<UnconnectedGraphSearch {...props} />);
      const focusMock = jest.spyOn(wrapper.instance().inputRef, 'focus');
      expect(focusMock).toHaveBeenCalledTimes(0);
      wrapper.find(Icon).simulate('click');
      expect(focusMock).toHaveBeenCalledTimes(1);
    });

    it('triggers pending queryParameter updates', () => {
      wrapper.find(Icon).simulate('click');
      expect(flushMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('mapStateToProps', () => {
    beforeAll(() => {
      queryStringParseSpy.mockReturnValue({ graphSearch });
    });

    it('returns graphSearch from parsed state.router.location.search', () => {
      const reduxStateValue = 'state.router.location.search';
      const result = mapStateToProps({
        router: {
          location: {
            search: reduxStateValue,
          },
        },
      });
      expect(queryStringParseSpy).toHaveBeenCalledWith(reduxStateValue);
      expect(result).toEqual({
        graphSearch,
      });
    });
  });
});
