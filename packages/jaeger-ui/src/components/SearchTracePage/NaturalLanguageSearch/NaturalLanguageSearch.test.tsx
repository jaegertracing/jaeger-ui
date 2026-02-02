// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import NaturalLanguageSearch from './index';
import * as nlQueryApi from './nlQueryApi';

// Mock the API module
jest.mock('./nlQueryApi', () => ({
  ...jest.requireActual('./nlQueryApi'),
  parseNaturalLanguageQuery: jest.fn(),
}));

const mockParseNaturalLanguageQuery = nlQueryApi.parseNaturalLanguageQuery as jest.MockedFunction<
  typeof nlQueryApi.parseNaturalLanguageQuery
>;

describe('NaturalLanguageSearch', () => {
  const defaultProps = {
    onSearchParamsExtracted: jest.fn(),
    enabled: true,
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the component when enabled', () => {
      render(<NaturalLanguageSearch {...defaultProps} />);

      expect(screen.getByText('AI Search')).toBeInTheDocument();
      expect(screen.getByText('Experimental')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Try:/)).toBeInTheDocument();
    });

    it('does not render when disabled via enabled prop', () => {
      render(<NaturalLanguageSearch {...defaultProps} enabled={false} />);

      expect(screen.queryByText('AI Search')).not.toBeInTheDocument();
    });

    it('renders example buttons', () => {
      render(<NaturalLanguageSearch {...defaultProps} />);

      expect(screen.getByText('500 errors > 2s')).toBeInTheDocument();
      expect(screen.getByText('slow checkout')).toBeInTheDocument();
      expect(screen.getByText('auth errors')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<NaturalLanguageSearch {...defaultProps} placeholder="Custom placeholder" />);

      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('renders with proper aria-labels for accessibility', () => {
      render(<NaturalLanguageSearch {...defaultProps} />);

      expect(screen.getByLabelText('Natural language search input')).toBeInTheDocument();
      expect(screen.getByLabelText('Search with AI')).toBeInTheDocument();
      expect(screen.getByLabelText('Example: 500 errors greater than 2 seconds')).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('updates input value when typing', () => {
      render(<NaturalLanguageSearch {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Try:/);
      fireEvent.change(input, { target: { value: 'test query' } });

      expect(input).toHaveValue('test query');
    });

    it('fills input when clicking example button', () => {
      render(<NaturalLanguageSearch {...defaultProps} />);

      const exampleBtn = screen.getByText('500 errors > 2s');
      fireEvent.click(exampleBtn);

      const input = screen.getByPlaceholderText(/Try:/);
      expect(input).toHaveValue('Show me 500 errors from payment-service > 2s');
    });

    it('clears input when clicking clear icon', async () => {
      render(<NaturalLanguageSearch {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Try:/);
      fireEvent.change(input, { target: { value: 'test query' } });

      // Clear icon should appear
      const clearIcon = document.querySelector('.NaturalLanguageSearch--clearIcon');
      expect(clearIcon).toBeInTheDocument();

      if (clearIcon) {
        fireEvent.click(clearIcon);
      }

      expect(input).toHaveValue('');
    });

    it('disables input and button when disabled prop is true', () => {
      render(<NaturalLanguageSearch {...defaultProps} disabled />);

      const input = screen.getByPlaceholderText(/Try:/);
      const button = screen.getByRole('button', { name: /search/i });

      expect(input).toBeDisabled();
      expect(button).toBeDisabled();
    });

    it('disables example buttons when disabled prop is true', () => {
      render(<NaturalLanguageSearch {...defaultProps} disabled />);

      const exampleButtons = screen
        .getAllByRole('button')
        .filter(btn => btn.classList.contains('NaturalLanguageSearch--exampleBtn'));
      exampleButtons.forEach(btn => {
        expect(btn).toBeDisabled();
      });
    });
  });

  describe('API interactions', () => {
    it('calls parseNaturalLanguageQuery when search button is clicked', async () => {
      const mockParams = { service: 'payment-service', error: true };
      mockParseNaturalLanguageQuery.mockResolvedValue(mockParams);

      render(<NaturalLanguageSearch {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Try:/);
      fireEvent.change(input, { target: { value: 'errors from payment-service' } });

      const button = screen.getByRole('button', { name: /search/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockParseNaturalLanguageQuery).toHaveBeenCalledWith('errors from payment-service');
      });
    });

    it('calls onSearchParamsExtracted with parsed params on success', async () => {
      const mockParams = { service: 'payment-service', minDuration: '2s' };
      mockParseNaturalLanguageQuery.mockResolvedValue(mockParams);

      const onSearchParamsExtracted = jest.fn();
      render(<NaturalLanguageSearch {...defaultProps} onSearchParamsExtracted={onSearchParamsExtracted} />);

      const input = screen.getByPlaceholderText(/Try:/);
      fireEvent.change(input, { target: { value: 'payment-service > 2s' } });

      const button = screen.getByRole('button', { name: /search/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(onSearchParamsExtracted).toHaveBeenCalledWith(mockParams);
      });
    });

    it('clears input after successful extraction', async () => {
      const mockParams = { service: 'payment-service' };
      mockParseNaturalLanguageQuery.mockResolvedValue(mockParams);

      render(<NaturalLanguageSearch {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Try:/);
      fireEvent.change(input, { target: { value: 'test query' } });

      const button = screen.getByRole('button', { name: /search/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('does not call onSearchParamsExtracted when result is empty', async () => {
      mockParseNaturalLanguageQuery.mockResolvedValue({});

      const onSearchParamsExtracted = jest.fn();
      render(<NaturalLanguageSearch {...defaultProps} onSearchParamsExtracted={onSearchParamsExtracted} />);

      const input = screen.getByPlaceholderText(/Try:/);
      fireEvent.change(input, { target: { value: 'gibberish' } });

      const button = screen.getByRole('button', { name: /search/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(onSearchParamsExtracted).not.toHaveBeenCalled();
      });
    });

    it('shows loading state while processing', async () => {
      // Create a promise that we can control
      let resolvePromise: (value: nlQueryApi.INLSearchParams) => void;
      const promise = new Promise<nlQueryApi.INLSearchParams>(resolve => {
        resolvePromise = resolve;
      });
      mockParseNaturalLanguageQuery.mockReturnValue(promise);

      render(<NaturalLanguageSearch {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Try:/);
      fireEvent.change(input, { target: { value: 'test query' } });

      const button = screen.getByRole('button', { name: /search/i });
      fireEvent.click(button);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Analyzing...')).toBeInTheDocument();
      });

      // Input should be disabled during loading
      expect(input).toBeDisabled();

      // Resolve the promise
      resolvePromise!({ service: 'test' });

      await waitFor(() => {
        expect(screen.queryByText('Analyzing...')).not.toBeInTheDocument();
      });
    });

    it('handles NLQueryError gracefully', async () => {
      mockParseNaturalLanguageQuery.mockRejectedValue(
        new nlQueryApi.NLQueryError('Failed to parse', 'PARSE_ERROR')
      );

      render(<NaturalLanguageSearch {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Try:/);
      fireEvent.change(input, { target: { value: 'invalid query' } });

      const button = screen.getByRole('button', { name: /search/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Failed to parse')).toBeInTheDocument();
      });
    });

    it('handles generic errors gracefully', async () => {
      mockParseNaturalLanguageQuery.mockRejectedValue(new TypeError('Unexpected error'));

      render(<NaturalLanguageSearch {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Try:/);
      fireEvent.change(input, { target: { value: 'test query' } });

      const button = screen.getByRole('button', { name: /search/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Failed to process query')).toBeInTheDocument();
      });
    });

    it('displays error with role="alert" for accessibility', async () => {
      mockParseNaturalLanguageQuery.mockRejectedValue(new nlQueryApi.NLQueryError('Test error', 'TEST'));

      render(<NaturalLanguageSearch {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Try:/);
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toHaveTextContent('Test error');
      });
    });

    it('triggers search on Enter key', async () => {
      const mockParams = { service: 'test-service' };
      mockParseNaturalLanguageQuery.mockResolvedValue(mockParams);

      render(<NaturalLanguageSearch {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Try:/);
      fireEvent.change(input, { target: { value: 'test query' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockParseNaturalLanguageQuery).toHaveBeenCalledWith('test query');
      });
    });

    it('does not trigger search on Enter when input is empty', async () => {
      render(<NaturalLanguageSearch {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Try:/);
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockParseNaturalLanguageQuery).not.toHaveBeenCalled();
    });

    it('does not trigger search on Enter when disabled', async () => {
      render(<NaturalLanguageSearch {...defaultProps} disabled />);

      const input = screen.getByPlaceholderText(/Try:/);
      fireEvent.change(input, { target: { value: 'test query' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockParseNaturalLanguageQuery).not.toHaveBeenCalled();
    });

    it('prevents double submission while loading', async () => {
      let resolvePromise: (value: nlQueryApi.INLSearchParams) => void;
      const promise = new Promise<nlQueryApi.INLSearchParams>(resolve => {
        resolvePromise = resolve;
      });
      mockParseNaturalLanguageQuery.mockReturnValue(promise);

      render(<NaturalLanguageSearch {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Try:/);
      fireEvent.change(input, { target: { value: 'test query' } });

      const button = screen.getByRole('button', { name: /search/i });
      fireEvent.click(button);

      // Wait for loading state
      await waitFor(() => {
        expect(screen.getByText('Analyzing...')).toBeInTheDocument();
      });

      // Input should be disabled during loading
      expect(input).toBeDisabled();

      // Try pressing Enter - should not trigger another call
      fireEvent.keyDown(input, { key: 'Enter' });

      // Should still only have been called once
      expect(mockParseNaturalLanguageQuery).toHaveBeenCalledTimes(1);

      // Cleanup
      resolvePromise!({ service: 'test' });
    });
  });
});

describe('nlQueryApi', () => {
  describe('nlParamsToFormValues', () => {
    const { nlParamsToFormValues } = nlQueryApi;

    it('converts service to form value', () => {
      const result = nlParamsToFormValues({ service: 'payment-service' });
      expect(result.service).toBe('payment-service');
    });

    it('converts operation to form value', () => {
      const result = nlParamsToFormValues({ operation: 'checkout' });
      expect(result.operation).toBe('checkout');
    });

    it('converts durations to form values', () => {
      const result = nlParamsToFormValues({ minDuration: '2s', maxDuration: '5s' });
      expect(result.minDuration).toBe('2s');
      expect(result.maxDuration).toBe('5s');
    });

    it('converts limit to string', () => {
      const result = nlParamsToFormValues({ limit: 50 });
      expect(result.resultsLimit).toBe('50');
    });

    it('converts tags to logfmt format', () => {
      const result = nlParamsToFormValues({
        tags: { 'http.status_code': '500', env: 'production' },
      });
      expect(result.tags).toContain('http.status_code=500');
      expect(result.tags).toContain('env=production');
    });

    it('adds error=true to tags when error is true', () => {
      const result = nlParamsToFormValues({ error: true });
      expect(result.tags).toBe('error=true');
    });

    it('combines tags and error flag', () => {
      const result = nlParamsToFormValues({
        tags: { 'http.status_code': '500' },
        error: true,
      });
      expect(result.tags).toContain('http.status_code=500');
      expect(result.tags).toContain('error=true');
    });

    it('handles empty params', () => {
      const result = nlParamsToFormValues({});
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('quotes tag values with spaces', () => {
      const result = nlParamsToFormValues({
        tags: { message: 'hello world' },
      });
      expect(result.tags).toBe('message="hello world"');
    });
  });

  describe('NLQueryError', () => {
    const { NLQueryError } = nlQueryApi;

    it('creates error with message and code', () => {
      const error = new NLQueryError('Test error', 'TEST_CODE');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('NLQueryError');
    });

    it('defaults isRetryable to false', () => {
      const error = new NLQueryError('Test error', 'TEST_CODE');
      expect(error.isRetryable).toBe(false);
    });

    it('allows setting isRetryable', () => {
      const error = new NLQueryError('Test error', 'TIMEOUT', true);
      expect(error.isRetryable).toBe(true);
    });

    it('defaults code to UNKNOWN', () => {
      const error = new NLQueryError('Test error');
      expect(error.code).toBe('UNKNOWN');
    });
  });
});
