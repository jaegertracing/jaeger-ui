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
import { TraceId } from './TraceId';
import { getConfigValue } from '../../utils/config/get-config';

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

  describe('TraceIdDisplayLength Component', () => {
    it('renders the default traceIdLength 7', () => {
      getConfigValue.mockReturnValue(undefined);
      renderComponent();

      const displayed = MOCK_TRACE_ID.slice(0, DEFAULT_LENGTH);
      expect(screen.getByText(displayed)).toBeInTheDocument();
      expect(screen.queryByText(MOCK_TRACE_ID.slice(0, DEFAULT_LENGTH + 1))).not.toBeInTheDocument();
    });

    it('renders the config length when provided', () => {
      const configuredLength = 5;
      getConfigValue.mockReturnValue(configuredLength);
      renderComponent();

      const displayed = MOCK_TRACE_ID.slice(0, configuredLength);
      expect(screen.getByText(displayed)).toBeInTheDocument();
      expect(screen.queryByText(MOCK_TRACE_ID.slice(0, configuredLength + 1))).not.toBeInTheDocument();
    });
  });

  describe('Edge case handling', () => {
    it('renders the full traceId when it is shorter then configured length', () => {
      const shortTraceId = '12345';
      const configuredLength = 10;
      getConfigValue.mockReturnValue(configuredLength);

      renderComponent({ traceId: shortTraceId });
      expect(screen.getByText(shortTraceId)).toBeInTheDocument();
    });

    it('renders an empty <small> element when traceId is an empty string', () => {
      const { container } = render(<TraceId traceId="" />);
      const el = container.querySelector('small');
      expect(el).toBeInTheDocument();
      expect(el).toBeEmptyDOMElement();
    });
  });

  describe('Style handling', () => {
    it('applies custom className when provided', () => {
      getConfigValue.mockReturnValue(undefined);
      renderComponent({ className: CUSTOM_CLASS });

      const el = screen.getByText(MOCK_TRACE_ID.slice(0, DEFAULT_LENGTH));
      expect(el).toHaveClass(CUSTOM_CLASS);
    });

    it('default classes for styling', () => {
      renderComponent();
      const el = screen.getByText(MOCK_TRACE_ID.slice(0, DEFAULT_LENGTH));

      expect(el).toHaveClass('TraceIDLength');
      expect(el).toHaveClass('u-tx-muted');
    });

    it('adds a length-based class depending on the configuration', () => {
      getConfigValue.mockReturnValue(DEFAULT_LENGTH);
      renderComponent();
      expect(screen.getByText(MOCK_TRACE_ID.slice(0, DEFAULT_LENGTH))).toHaveClass('TraceIDLength--short');

      getConfigValue.mockReturnValue(32);
      renderComponent();
      expect(screen.getByText(MOCK_TRACE_ID.slice(0, 32))).toHaveClass('TraceIDLength--full');
    });
  });
});
