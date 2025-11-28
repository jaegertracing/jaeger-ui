// Copyright (c) 2025 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

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

    it('does not render a <small> element when traceId is an empty string', () => {
      const { container } = render(<TraceId traceId="" />);
      expect(container.querySelector('small')).toBeNull();
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

      const longLength = MOCK_TRACE_ID.length;
      getConfigValue.mockReturnValue(longLength);
      renderComponent();

      const all = screen.getAllByText(MOCK_TRACE_ID.slice(0, 7));
      expect(all[all.length - 1]).toHaveClass('TraceIDLength--short');
    });
  });
});
