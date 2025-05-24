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
import userEvent from '@testing-library/user-event';
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

  describe('TraceIdDisplayLength Component', () => {
    it('renders the default traceIdLength 7', () => {
      getConfigValue.mockReturnValue(undefined);
      const { container } = render(<TraceId {...defaultProps} data-testid="traceid" />);

      expect(container.textContent).toEqual(MOCK_TRACE_ID.slice(0, DEFAULT_LENGTH));
    });

    it('renders the config length when provided', () => {
      const configuredLength = 5;
      getConfigValue.mockReturnValue(configuredLength);
      const { container } = render(<TraceId {...defaultProps} data-testid="traceid" />);

      expect(container.textContent).toEqual(MOCK_TRACE_ID.slice(0, configuredLength));
    });
  });

  describe('Edge case handling', () => {
    it('renders the full traceId when it is shorter then configured length', () => {
      const shortTraceId = '12345';
      const configuredLength = 10;
      getConfigValue.mockReturnValue(configuredLength);

      const { container } = render(<TraceId {...defaultProps} traceId={shortTraceId} data-testid="traceid" />);
      expect(container.textContent).toEqual(shortTraceId);
    });

    it('renders when traceId is undefiend', () => {
      const { container } = render(<TraceId {...defaultProps} traceId="" data-testid="traceid" />);
      expect(container.textContent).toEqual('');
    });
  });

  describe('Style handling', () => {
    it('applies custom className when provided', () => {
      const { container } = render(<TraceId {...defaultProps} className={CUSTOM_CLASS} data-testid="traceid" />);
      const element = container.firstChild;
      expect(element.classList.contains(CUSTOM_CLASS)).toBe(true);
    });

    it('default classes for styling', () => {
      const { container } = render(<TraceId {...defaultProps} data-testid="traceid" />);
      const element = container.firstChild;
      expect(element.classList.contains('TraceIDLength')).toBe(true);
      expect(element.classList.contains('u-tx-muted')).toBe(true);
    });

    it('adds a length-based class depending on the configuration', () => {
      getConfigValue.mockReturnValue(DEFAULT_LENGTH);
      const { container } = render(<TraceId {...defaultProps} data-testid="traceid" />);
      const element = container.firstChild;
      expect(element.classList.contains('TraceIDLength--short')).toBe(true);

      getConfigValue.mockReturnValue(32);
      const { container: container2 } = render(<TraceId {...defaultProps} data-testid="traceid" />);
      const element2 = container2.firstChild;
      expect(element2.classList.contains('TraceIDLength--full')).toBe(true);
    });
  });
});