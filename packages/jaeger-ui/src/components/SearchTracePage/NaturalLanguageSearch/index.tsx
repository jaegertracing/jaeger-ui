// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useCallback, useRef } from 'react';
import { Input, Button, Tooltip, message } from 'antd';
import type { InputRef } from 'antd';
import { SearchOutlined, ThunderboltOutlined, CloseCircleOutlined } from '@ant-design/icons';
import cx from 'classnames';

import { parseNaturalLanguageQuery, INLSearchParams, NLQueryError } from './nlQueryApi';
import './NaturalLanguageSearch.css';

export interface INaturalLanguageSearchProps {
  /** Callback when search params are extracted from natural language */
  onSearchParamsExtracted: (params: INLSearchParams) => void;
  /** Whether the AI search feature is enabled */
  enabled?: boolean;
  /** Whether the form is currently submitting */
  disabled?: boolean;
  /** Placeholder text for the input */
  placeholder?: string;
}

/**
 * NaturalLanguageSearch provides an experimental AI-powered search input that converts
 * natural language queries into structured Jaeger search parameters.
 *
 * ⚠️ EXPERIMENTAL: Currently uses a mock regex-based parser.
 * Backend LLM integration is planned for future work.
 *
 * Example queries:
 * - "Show me 500 errors from payment-service > 2s"
 * - "Find slow traces for checkout operation, latency above 1s"
 * - "auth-service errors in the last hour"
 */
export function NaturalLanguageSearch({
  onSearchParamsExtracted,
  enabled = true,
  disabled = false,
  placeholder = 'Try: "Show me errors from payment-service > 2s"',
}: INaturalLanguageSearchProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const inputRef = useRef<InputRef>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      message.warning('Please enter a search query');
      return;
    }

    setIsLoading(true);
    setLastError(null);

    try {
      const params = await parseNaturalLanguageQuery(query);

      if (params && Object.keys(params).length > 0) {
        message.success('Search parameters extracted successfully!');
        onSearchParamsExtracted(params);
        // Clear the input after successful extraction
        setQuery('');
      } else {
        message.info('No search parameters could be extracted. Try being more specific.');
      }
    } catch (err) {
      const errorMessage = err instanceof NLQueryError ? err.message : 'Failed to process query';
      setLastError(errorMessage);
      message.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [query, onSearchParamsExtracted]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !disabled && !isLoading) {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch, disabled, isLoading]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setLastError(null);
    inputRef.current?.focus();
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <div className="NaturalLanguageSearch">
      <div className="NaturalLanguageSearch--header">
        <ThunderboltOutlined className="NaturalLanguageSearch--icon" />
        <span className="NaturalLanguageSearch--label">AI Search</span>
        <Tooltip title="Describe what traces you're looking for in plain English. This experimental feature extracts search parameters automatically.">
          <span className="NaturalLanguageSearch--beta">Experimental</span>
        </Tooltip>
      </div>

      <div className="NaturalLanguageSearch--inputWrapper">
        <Input
          ref={inputRef}
          className={cx('NaturalLanguageSearch--input', {
            'NaturalLanguageSearch--input-error': lastError,
          })}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          prefix={<SearchOutlined className="NaturalLanguageSearch--searchIcon" />}
          suffix={
            query && !isLoading ? (
              <CloseCircleOutlined
                className="NaturalLanguageSearch--clearIcon"
                onClick={handleClear}
                aria-label="Clear search input"
              />
            ) : null
          }
          aria-label="Natural language search input"
          allowClear={false}
        />
        <Button
          type="primary"
          className="NaturalLanguageSearch--button"
          onClick={handleSearch}
          loading={isLoading}
          disabled={disabled || !query.trim()}
          icon={!isLoading ? <ThunderboltOutlined /> : undefined}
          aria-label={isLoading ? 'Analyzing query' : 'Search with AI'}
        >
          {isLoading ? 'Analyzing...' : 'Search'}
        </Button>
      </div>

      {lastError && (
        <div className="NaturalLanguageSearch--error" role="alert">
          {lastError}
        </div>
      )}

      <div className="NaturalLanguageSearch--examples">
        <span className="NaturalLanguageSearch--examplesLabel">Examples:</span>
        <button
          type="button"
          className="NaturalLanguageSearch--exampleBtn"
          onClick={() => setQuery('Show me 500 errors from payment-service > 2s')}
          disabled={disabled || isLoading}
          aria-label="Example: 500 errors greater than 2 seconds"
        >
          500 errors &gt; 2s
        </button>
        <button
          type="button"
          className="NaturalLanguageSearch--exampleBtn"
          onClick={() => setQuery('checkout operation with latency above 1s')}
          disabled={disabled || isLoading}
          aria-label="Example: slow checkout operation"
        >
          slow checkout
        </button>
        <button
          type="button"
          className="NaturalLanguageSearch--exampleBtn"
          onClick={() => setQuery('errors from auth-service')}
          disabled={disabled || isLoading}
          aria-label="Example: auth service errors"
        >
          auth errors
        </button>
      </div>
    </div>
  );
}

export default NaturalLanguageSearch;
