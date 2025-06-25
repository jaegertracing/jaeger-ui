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
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
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

  const defaultProps = {
    traceId: MOCK_TRACE_ID,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    render(<TraceId {...defaultProps} {...props} />);
  };

  const createWrapper = (props = {}) => {
    return shallow(<TraceId {...defaultProps} {...props} />);
  };

  describe('TraceIdDisplayLength Component', () => {
    it('renders the default traceIdLength 7', () => {
      getConfigValue.mockReturnValue(undefined);
      renderComponent();

      const displayed = MOCK_TRACE_ID.slice(0, DEFAULT_LENGTH);
      expect(screen.getByText(displayed)).toBeInTheDocument();
      expect(screen.queryByText(MOCK_TRACE_ID.slice(0, DEFAULT_LENGTH + 1))).not.toBeInTheDocument();
    });

    it('renders the default traceIdLength 7 with ClickToCopy', () => {
      getConfigValue.mockReturnValue(undefined);
      const wrapper = createWrapper();
      const displayed = MOCK_TRACE_ID.slice(0, DEFAULT_LENGTH);
      expect(wrapper.find(ClickToCopy).prop('text')).toEqual(MOCK_TRACE_ID);
      expect(wrapper.find(ClickToCopy).prop('children')).toEqual(MOCK_TRACE_ID.slice(0, DEFAULT_LENGTH));
    });

    it('renders the config length when provided', () => {
      const configuredLength = 5;
      getConfigValue.mockReturnValue(configuredLength);
      renderComponent();

      const displayed = MOCK_TRACE_ID.slice(0, configuredLength);
      expect(screen.getByText(displayed)).toBeInTheDocument();
      expect(screen.queryByText(MOCK_TRACE_ID.slice(0, configuredLength + 1))).not.toBeInTheDocument();
    });

    it('renders the config length when provided with ClickToCopy', () => {
      const configuredLength = 5;
      getConfigValue.mockReturnValue(configuredLength);
      const wrapper = createWrapper();
      expect(wrapper.find(ClickToCopy).prop('text')).toEqual(MOCK_TRACE_ID);
      expect(wrapper.find(ClickToCopy).prop('children')).toEqual(MOCK_TRACE_ID.slice(0, configuredLength));
    });
  });

  describe('Edge case handling', () => {
    it('renders the full traceId when it is shorter than configured length', () => {
      const shortTraceId = '12345';
      const configuredLength = 10;
      getConfigValue.mockReturnValue(configuredLength);

      renderComponent({ traceId: shortTraceId });
      expect(screen.getByText(shortTraceId)).toBeInTheDocument();
    });

    it('renders the full traceId when it is shorter than configured length with ClickToCopy', () => {
      const shortTraceId = '12345';
      const configuredLength = 10;
      getConfigValue.mockReturnValue(configuredLength);
      const wrapper = createWrapper({ traceId: shortTraceId });
      expect(wrapper.find(ClickToCopy).prop('text')).toBe(shortTraceId);
    });

    it('renders an empty ClickToCopy element when traceId is an empty string', () => {
      const { container } = render(<TraceId traceId="" />);
      const el = container.querySelector('[role="button"]');
      expect(el).toBeInTheDocument();
      expect(el).toBeEmptyDOMElement();
    });

    it('renders when traceId is empty with ClickToCopy', () => {
      const wrapper = createWrapper({ traceId: '' });
      const clickToCopy = wrapper.find(ClickToCopy);
      expect(clickToCopy.prop('text')).toBe('');
    });
  });

  describe('Style handling', () => {
    it('applies custom className when provided', () => {
      getConfigValue.mockReturnValue(undefined);
      renderComponent({ className: CUSTOM_CLASS });

      const el = screen.getByText(MOCK_TRACE_ID.slice(0, DEFAULT_LENGTH));
      expect(el).toHaveClass(CUSTOM_CLASS);
    });

    it('applies custom className when provided with ClickToCopy', () => {
      getConfigValue.mockReturnValue(7);
      const wrapper = createWrapper({ className: CUSTOM_CLASS });
      const expectedClass = `TraceIDLength TraceIDLength--short u-tx-muted ${CUSTOM_CLASS}`;
      expect(wrapper.find(ClickToCopy).prop('className')).toBe(expectedClass);
    });

    it('uses default classes for styling', () => {
      renderComponent();
      const el = screen.getByText(MOCK_TRACE_ID.slice(0, DEFAULT_LENGTH));

      expect(el).toHaveClass('TraceIDLength');
      expect(el).toHaveClass('u-tx-muted');
    });

    it('uses default classes for styling with ClickToCopy', () => {
      getConfigValue.mockReturnValue(7);
      const wrapper = createWrapper();
      const expectedClass = 'TraceIDLength TraceIDLength--short u-tx-muted ';
      expect(wrapper.find(ClickToCopy).prop('className')).toBe(expectedClass);
    });

    it('adds a length-based class depending on the configuration', () => {
      getConfigValue.mockReturnValue(DEFAULT_LENGTH);
      renderComponent();
      expect(screen.getByText(MOCK_TRACE_ID.slice(0, DEFAULT_LENGTH))).toHaveClass('TraceIDLength--short');

      getConfigValue.mockReturnValue(32);
      renderComponent();
      expect(screen.getByText(MOCK_TRACE_ID.slice(0, 32))).toHaveClass('TraceIDLength--full');
    });

    it('adds a length-based class depending on the configuration with ClickToCopy', () => {
      getConfigValue.mockReturnValue(7);
      const wrapperShort = createWrapper();
      expect(wrapperShort.find(ClickToCopy).prop('className')).toContain('TraceIDLength--short');

      getConfigValue.mockReturnValue(32);
      const wrapperFull = createWrapper();
      expect(wrapperFull.find(ClickToCopy).prop('className')).toContain('TraceIDLength--full');
    });
  });
});