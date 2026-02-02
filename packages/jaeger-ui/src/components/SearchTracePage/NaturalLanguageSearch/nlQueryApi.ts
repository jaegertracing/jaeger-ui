// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import prefixUrl from '../../../utils/prefix-url';

/**
 * Search parameters extracted from natural language query.
 * Maps to Jaeger's TraceQueryParameters structure.
 */
export interface INLSearchParams {
  /** Service name to filter traces */
  service?: string;
  /** Operation/span name to filter */
  operation?: string;
  /** Key-value pairs for tag filtering (logfmt format) */
  tags?: Record<string, string>;
  /** Minimum trace duration (e.g., "2s", "500ms") */
  minDuration?: string;
  /** Maximum trace duration (e.g., "5s", "1m") */
  maxDuration?: string;
  /** Filter for error traces only */
  error?: boolean;
  /** Maximum number of results */
  limit?: number;
}

/**
 * Custom error class for NL query failures
 */
export class NLQueryError extends Error {
  public readonly code: string;
  public readonly isRetryable: boolean;

  constructor(message: string, code: string = 'UNKNOWN', isRetryable: boolean = false) {
    super(message);
    this.name = 'NLQueryError';
    this.code = code;
    this.isRetryable = isRetryable;
  }
}

/**
 * API endpoint for natural language query parsing.
 * This will be implemented in the Jaeger Query Service backend.
 */
const NL_QUERY_ENDPOINT = prefixUrl('/api/ai/parse-query');

/**
 * Check if the backend AI feature is enabled.
 * For now, we use a mock implementation.
 */
let _mockEnabled = true;

export function setMockEnabled(enabled: boolean): void {
  _mockEnabled = enabled;
}

/**
 * Parse a natural language query into structured search parameters.
 *
 * This function calls the Jaeger Query Service backend which uses
 * LangChainGo + Ollama to extract search parameters from natural language.
 *
 * @param query - The natural language query (e.g., "500 errors from payment-service > 2s")
 * @returns Extracted search parameters
 * @throws NLQueryError if parsing fails
 *
 * @example
 * const params = await parseNaturalLanguageQuery("Show me errors from auth-service");
 * // Returns: { service: "auth-service", error: true }
 */
export async function parseNaturalLanguageQuery(query: string): Promise<INLSearchParams> {
  if (!query || !query.trim()) {
    throw new NLQueryError('Query cannot be empty', 'EMPTY_QUERY');
  }

  // For now, use mock implementation until backend is deployed
  // TODO: Replace with actual API call when backend is ready
  if (_mockEnabled) {
    return mockParseQuery(query);
  }

  try {
    const response = await fetch(NL_QUERY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.message || `HTTP ${response.status}: ${response.statusText}`;

      if (response.status === 503) {
        throw new NLQueryError(
          'AI service is not available. Is Ollama running?',
          'SERVICE_UNAVAILABLE',
          true
        );
      }
      if (response.status === 408 || response.status === 504) {
        throw new NLQueryError('Request timed out. The model may be loading.', 'TIMEOUT', true);
      }

      throw new NLQueryError(errorMsg, 'API_ERROR');
    }

    const data = await response.json();
    return data.params || data;
  } catch (err) {
    if (err instanceof NLQueryError) {
      throw err;
    }

    // Network error or other fetch failure
    throw new NLQueryError(
      'Failed to connect to AI service. Check if the backend is running.',
      'NETWORK_ERROR',
      true
    );
  }
}

/**
 * Mock implementation for parsing natural language queries.
 * This provides a realistic demo experience without requiring the backend.
 *
 * In production, this is replaced by the actual LangChainGo + Ollama backend.
 */
function mockParseQuery(query: string): Promise<INLSearchParams> {
  return new Promise((resolve, reject) => {
    // Simulate network latency (300-800ms)
    const delay = 300 + Math.random() * 500;

    setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      const params: INLSearchParams = {};

      // Extract service name
      const servicePatterns = [
        /from\s+([a-z0-9-_]+)(?:-service)?/i,
        /([a-z0-9-_]+)-service/i,
        /service[:\s]+([a-z0-9-_]+)/i,
      ];
      for (const pattern of servicePatterns) {
        const match = query.match(pattern);
        if (match) {
          params.service = match[1].replace(/-service$/i, '') + '-service';
          break;
        }
      }

      // Extract operation
      const operationPatterns = [/operation[:\s]+([a-z0-9-_/]+)/i, /for\s+([a-z0-9-_]+)\s+operation/i];
      for (const pattern of operationPatterns) {
        const match = query.match(pattern);
        if (match) {
          params.operation = match[1];
          break;
        }
      }

      // Extract duration constraints
      const minDurationMatch = query.match(
        /(?:>|greater than|more than|above|over|taking more than|latency above)\s*(\d+(?:\.\d+)?)\s*(s|ms|m|us|seconds?|milliseconds?|minutes?)/i
      );
      if (minDurationMatch) {
        const value = minDurationMatch[1];
        let unit = minDurationMatch[2].toLowerCase();
        // Normalize unit
        if (unit.startsWith('second')) unit = 's';
        else if (unit.startsWith('milli')) unit = 'ms';
        else if (unit.startsWith('minute')) unit = 'm';
        else if (unit.startsWith('micro')) unit = 'us';
        params.minDuration = `${value}${unit}`;
      }

      const maxDurationMatch = query.match(
        /(?:<|less than|under|below)\s*(\d+(?:\.\d+)?)\s*(s|ms|m|us|seconds?|milliseconds?|minutes?)/i
      );
      if (maxDurationMatch) {
        const value = maxDurationMatch[1];
        let unit = maxDurationMatch[2].toLowerCase();
        if (unit.startsWith('second')) unit = 's';
        else if (unit.startsWith('milli')) unit = 'ms';
        else if (unit.startsWith('minute')) unit = 'm';
        else if (unit.startsWith('micro')) unit = 'us';
        params.maxDuration = `${value}${unit}`;
      }

      // Extract error status
      if (
        lowerQuery.includes('error') ||
        lowerQuery.includes('failed') ||
        lowerQuery.includes('failure') ||
        lowerQuery.includes('500') ||
        lowerQuery.includes('5xx')
      ) {
        params.error = true;
      }

      // Extract HTTP status codes as tags
      const statusMatch = query.match(/\b([45]\d{2})\b/);
      if (statusMatch) {
        params.tags = params.tags || {};
        params.tags['http.status_code'] = statusMatch[1];
      }

      // Extract limit
      const limitMatch = query.match(/(?:limit|top|first|last)\s*(\d+)/i);
      if (limitMatch) {
        params.limit = parseInt(limitMatch[1], 10);
      }

      // If we couldn't extract anything useful, reject
      if (Object.keys(params).length === 0) {
        reject(
          new NLQueryError(
            'Could not understand the query. Try something like "errors from payment-service > 2s"',
            'PARSE_ERROR'
          )
        );
        return;
      }

      resolve(params);
    }, delay);
  });
}

/**
 * Convert extracted NL params to the format expected by SearchForm.
 * Maps the INLSearchParams to form field values.
 */
export function nlParamsToFormValues(params: INLSearchParams): Record<string, any> {
  const formValues: Record<string, any> = {};

  if (params.service) {
    formValues.service = params.service;
  }

  if (params.operation) {
    formValues.operation = params.operation;
  }

  if (params.minDuration) {
    formValues.minDuration = params.minDuration;
  }

  if (params.maxDuration) {
    formValues.maxDuration = params.maxDuration;
  }

  if (params.limit) {
    formValues.resultsLimit = String(params.limit);
  }

  // Convert tags to logfmt format
  if (params.tags && Object.keys(params.tags).length > 0) {
    const tagParts: string[] = [];
    for (const [key, value] of Object.entries(params.tags)) {
      // Quote values with spaces
      const formattedValue = value.includes(' ') ? `"${value}"` : value;
      tagParts.push(`${key}=${formattedValue}`);
    }

    // Add error=true if error flag is set
    if (params.error) {
      tagParts.push('error=true');
    }

    formValues.tags = tagParts.join(' ');
  } else if (params.error) {
    formValues.tags = 'error=true';
  }

  return formValues;
}
