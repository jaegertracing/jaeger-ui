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
import { TraceId } from './TraceIdDisplayLength';
import { getConfigValue } from '../../utils/config/get-config';

jest.mock('../../utils/config/get-config', () => ({
  getConfigValue: jest.fn(),
}));

describe('TraceIdDisplayLength', () => {
  const DEFAULT_LENGTH = 7;
  const MOCK_TRACE_ID = '12345678901234567890';
  const CUSTOM_CLASS = 'custom-class';

  let wrapper;

  const defaultProps = {
    traceId: MOCK_TRACE_ID,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createWrapper = (props = {}) => {
    return shallow(<TraceId {...defaultProps} {...props} />);
  };

  describe('TraceIdDisplayLength Component', () => {
    it('renders the default traceIdLength 7', () => {
      getConfigValue.mockReturnValue(undefined);
      wrapper = createWrapper();

      const displayedText = wrapper.text();
      expect(displayedText).toEqual(MOCK_TRACE_ID.slice(0, DEFAULT_LENGTH));
    });

    it('renders the config length when provided', () => {
      const configuredLength = 5;
      getConfigValue.mockReturnValue(configuredLength);
      wrapper = createWrapper();

      const displayedText = wrapper.text();
      expect(displayedText).toEqual(MOCK_TRACE_ID.slice(0, configuredLength));
    });
  });

  describe('Edge case handling', () => {
    it('renders the full traceId when it is shorter then configured length', () => {
      const shortTraceId = '12345';
      const configuredLength = 10;
      getConfigValue.mockReturnValue(configuredLength);

      wrapper = createWrapper({ traceId: shortTraceId });
      expect(wrapper.text()).toEqual(shortTraceId);
    });

    it('renders when traceId is undefiend', () => {
      wrapper = createWrapper({ traceId: '' });
      expect(wrapper.text()).toEqual('');
    });
  });

  describe('Style handling', () => {
    it('applies custom className when provided', () => {
      wrapper = createWrapper({ className: CUSTOM_CLASS });
      expect(wrapper.hasClass(CUSTOM_CLASS)).toBe(true);
    });

    it('default classes for styling', () => {
      wrapper = createWrapper();
      expect(wrapper.hasClass('TraceIDLength')).toBe(true);
      expect(wrapper.hasClass('u-tx-muted')).toBe(true);
    });

    it('adds a length-based class depending on the configuration', () => {
      getConfigValue.mockReturnValue(DEFAULT_LENGTH);
      wrapper = createWrapper();
      expect(wrapper.hasClass('TraceIDLength--short')).toBe(true);

      getConfigValue.mockReturnValue(32);
      wrapper = createWrapper();
      expect(wrapper.hasClass('TraceIDLength--full')).toBe(true);
    });
  });
});
