// Copyright (c) 2025 The Jaeger Authors
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
import { shallow, mount } from 'enzyme';
import { TraceId } from './TraceId';
import { getConfigValue } from '../../utils/config/get-config';
import ClickToCopy from './ClickToCopy';

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

      const clickToCopy = wrapper.find(ClickToCopy);
      expect(clickToCopy.prop('text')).toEqual(MOCK_TRACE_ID);
      expect(clickToCopy.prop('children')).toEqual(MOCK_TRACE_ID.slice(0, DEFAULT_LENGTH));
    });

    it('renders the config length when provided', () => {
      const configuredLength = 5;
      getConfigValue.mockReturnValue(configuredLength);
      wrapper = createWrapper();

      const clickToCopy = wrapper.find(ClickToCopy);
      expect(clickToCopy.prop('text')).toEqual(MOCK_TRACE_ID);
      expect(clickToCopy.prop('children')).toEqual(MOCK_TRACE_ID.slice(0, configuredLength));
    });
  });

  describe('Edge case handling', () => {
    it('renders the full traceId when it is shorter than configured length', () => {
      const shortTraceId = '12345';
      const configuredLength = 10;
      getConfigValue.mockReturnValue(configuredLength);

      wrapper = createWrapper({ traceId: shortTraceId });
      const clickToCopy = wrapper.find(ClickToCopy);
      expect(clickToCopy.prop('text')).toBe(shortTraceId);
    });

    it('renders when traceId is empty', () => {
      wrapper = createWrapper({ traceId: '' });
      const clickToCopy = wrapper.find(ClickToCopy);
      expect(clickToCopy.prop('text')).toBe('');
    });
  });

  describe('Style handling', () => {
    beforeEach(() => {
      getConfigValue.mockReturnValue(7);
    });

    it('applies custom className when provided', () => {
      wrapper = createWrapper({ className: CUSTOM_CLASS });
      const expectedClass = `TraceIDLength TraceIDLength--short u-tx-muted ${CUSTOM_CLASS}`;
      expect(wrapper.find(ClickToCopy).prop('className')).toBe(expectedClass);
    });

    it('uses default classes for styling', () => {
      wrapper = createWrapper();
      const expectedClass = 'TraceIDLength TraceIDLength--short u-tx-muted ';
      expect(wrapper.find(ClickToCopy).prop('className')).toBe(expectedClass);
    });

    it('adds a length-based class depending on the configuration', () => {
      getConfigValue.mockReturnValue(7);
      wrapper = createWrapper();
      expect(wrapper.find(ClickToCopy).prop('className')).toContain('TraceIDLength--short');

      getConfigValue.mockReturnValue(32);
      wrapper = createWrapper();
      expect(wrapper.find(ClickToCopy).prop('className')).toContain('TraceIDLength--full');
    });
  });
});
