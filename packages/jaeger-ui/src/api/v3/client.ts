// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Jaeger API Client
 *
 * Uses /api/v3/ where available and retains existing routes for operations
 * without a v3 counterpart.
 */

import queryString from 'query-string';

import { ALL_SERVICES } from '../../constants/search-form';
import prefixUrl from '../../utils/prefix-url';
import {
  ServicesResponseSchema,
  OperationsResponseSchema,
  TraceSummariesResponseSchema,
  GetTraceResponseSchema,
  traceIdHex,
} from './schemas';
import type { TracesDataWire } from './schemas';
import type { SearchQuery } from '../../types/search';
import type { TraceSummary, ServiceSummary } from '../../types/trace-summary';
import type { ApiError } from '../../types/api-error';
import type { Microseconds } from '../../types/units';
import type { TDdgModelParams } from '../../model/ddg/types';

export const DEFAULT_DEPENDENCY_LOOKBACK = 7 * 24 * 60 * 60 * 1000;

/**
 * Convert a microsecond epoch timestamp to an ISO-8601 string.
 * Returns undefined if the timestamp is missing, non-positive, not finite,
 * or outside JavaScript's representable Date range, so malformed URL parameters
 * are dropped gracefully.
 */
function toIsoTimestamp(epochMicroseconds: number): string | undefined {
  if (Number.isFinite(epochMicroseconds) && epochMicroseconds > 0) {
    const date = new Date(epochMicroseconds / 1000);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return undefined;
}

/**
 * Build the error for a failed response, keeping the HTTP details and response body
 * that ErrorMessage renders. An unreadable body is reported as absent.
 */
async function httpError(message: string, url: string, response: Response): Promise<Error> {
  const error: Error & Exclude<ApiError, string> = new Error(
    `${message}: ${response.status} ${response.statusText}`
  );
  const queryStart = url.indexOf('?');
  error.httpStatus = response.status;
  error.httpStatusText = response.statusText;
  error.httpUrl = queryStart === -1 ? url : url.slice(0, queryStart);
  if (queryStart !== -1) error.httpQuery = url.slice(queryStart + 1);
  let body = '';
  try {
    body = await response.text();
  } catch {
    // The status still describes the failure.
  }
  if (body) {
    try {
      error.httpBody = JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      error.httpBody = body;
    }
  }
  return error;
}

export class JaegerClient {
  private apiRoot = prefixUrl('/api/v3');
  // Archive and dependency-graph requests retain their existing /api/ routes.
  private legacyApiRoot = prefixUrl('/api/');

  async fetchDependencies(
    endTs = Date.now(),
    lookback = DEFAULT_DEPENDENCY_LOOKBACK,
    signal?: AbortSignal
  ): Promise<unknown> {
    const query = queryString.stringify({ endTs, lookback });
    const url = `${this.legacyApiRoot}dependencies?${query}`;
    // Preserve deadline-free graph reads, which can wait on storage queries.
    const response = await this.fetchWithTimeout(url, { timeout: null, signal });
    if (!response.ok) {
      throw await httpError('Failed to fetch dependencies', url, response);
    }
    return response.json();
  }

  async fetchDeepDependencyGraph(params: TDdgModelParams, signal?: AbortSignal): Promise<unknown> {
    const query = queryString.stringify(params);
    const url = `${this.legacyApiRoot}deep-dependencies?${query}`;
    const response = await this.fetchWithTimeout(url, { timeout: null, signal });
    if (!response.ok) {
      throw await httpError('Failed to fetch deep dependencies', url, response);
    }
    return response.json();
  }

  async archiveTrace(id: string): Promise<unknown> {
    const url = `${this.legacyApiRoot}archive/${id}`;
    const response = await this.fetchWithTimeout(url, { method: 'POST' });
    if (!response.ok) {
      throw await httpError(`Failed to archive trace ${id}`, url, response);
    }
    return response.json();
  }

  async fetchDecoration(url: string): Promise<unknown> {
    const response = await this.fetchWithTimeout(url);
    if (!response.ok) {
      throw await httpError('Failed to fetch decoration', url, response);
    }
    return response.json();
  }

  /**
   * Fetch the list of services from the Jaeger API.
   * @returns Promise<string[]> - Array of service names
   */
  async fetchServices(): Promise<string[]> {
    const url = `${this.apiRoot}/services`;
    const response = await this.fetchWithTimeout(url);
    if (!response.ok) {
      throw await httpError('Failed to fetch services', url, response);
    }
    const data = await response.json();

    // Runtime validation with Zod
    const validated = ServicesResponseSchema.parse(data);
    return validated.services;
  }

  /**
   * Fetch the list of span names (operations) for a given service.
   * @param service - The service name
   * @returns Promise<{ name: string; spanKind: string }[]> - Array of span name objects
   */
  async fetchSpanNames(service: string): Promise<{ name: string; spanKind: string }[]> {
    const url = `${this.apiRoot}/operations?service=${encodeURIComponent(service)}`;
    const response = await this.fetchWithTimeout(url);
    if (!response.ok) {
      throw await httpError(`Failed to fetch span names for service "${service}"`, url, response);
    }
    const data = await response.json();

    // Runtime validation with Zod
    const validated = OperationsResponseSchema.parse(data);
    return validated.operations;
  }

  /**
   * Search for traces by query parameters.
   * Calls /api/v3/trace-summaries and maps the response to TraceSummary[].
   */
  async fetchTraceSummaries(query: SearchQuery): Promise<TraceSummary[]> {
    const params = new URLSearchParams();
    // ALL_SERVICES is a UI-only value: the v3 search API reads an absent service name
    // as "any service", so the parameter is left off rather than sent through.
    if (query.service && query.service !== ALL_SERVICES) params.set('query.serviceName', query.service);
    if (query.operation) params.set('query.operationName', String(query.operation));
    // start/end are microsecond epoch integers from the URL; convert to ISO for the v3 API.
    // Drop malformed or out-of-range URL params gracefully.
    const startTimeMin = toIsoTimestamp(Number(query.start));
    if (startTimeMin) params.set('query.startTimeMin', startTimeMin);
    const startTimeMax = toIsoTimestamp(Number(query.end));
    if (startTimeMax) params.set('query.startTimeMax', startTimeMax);
    if (query.limit) params.set('query.searchDepth', String(query.limit));
    if (query.minDuration) params.set('query.durationMin', query.minDuration);
    if (query.maxDuration) params.set('query.durationMax', query.maxDuration);
    if (query.tags) params.set('query.attributes', query.tags);

    const url = `${this.apiRoot}/trace-summaries?${params.toString()}`;
    const response = await this.fetchWithTimeout(url);
    if (!response.ok) {
      throw await httpError('Failed to fetch trace summaries', url, response);
    }
    const data = await response.json();
    const validated = TraceSummariesResponseSchema.parse(data);

    // Timestamps are decimal ns strings (proto3 JSON encoding for int64).
    // Use BigInt arithmetic to avoid precision loss; µs-epoch values (~1.7e15)
    // fit safely in Number after dividing by 1000.
    // Fall back to 0 when timestamps are absent (partial backend implementation).
    return (validated.summaries ?? []).map(s => {
      // If only one timestamp is present, clamp the missing one to the present one
      // so duration is 0 rather than an astronomically large value from epoch.
      const startNsRaw = s.minStartTimeUnixNano ? BigInt(s.minStartTimeUnixNano) : null;
      const endNsRaw = s.maxEndTimeUnixNano ? BigInt(s.maxEndTimeUnixNano) : null;
      const startNs = startNsRaw ?? endNsRaw ?? 0n;
      const endNs = endNsRaw ?? startNsRaw ?? 0n;
      const rootServiceName = s.rootServiceName ?? '';
      const rootOperationName = s.rootOperationName ?? '';
      // Wire field is `traceId` (proto3 camelCase of `trace_id`).
      // Internal TraceSummary uses `traceID` (Jaeger convention) to match legacy code.
      const services: ServiceSummary[] = (s.services ?? []).map(svc => ({
        name: svc.name ?? '',
        spanCount: svc.spanCount,
        errorSpanCount: svc.errorSpanCount,
      }));
      return {
        traceID: s.traceId,
        traceName:
          rootServiceName && rootOperationName
            ? `${rootServiceName}: ${rootOperationName}`
            : rootServiceName || rootOperationName,
        rootServiceName,
        rootOperationName,
        startTime: Number(startNs / 1000n) as Microseconds,
        duration: Number((endNs - startNs) / 1000n) as Microseconds,
        spanCount: s.spanCount,
        errorSpanCount: s.errorSpanCount,
        orphanSpanCount: s.orphanSpanCount,
        services,
      };
    });
  }

  /**
   * Fetch a single trace by ID from /api/v3/traces/{trace_id}.
   * Validates the grpc-gateway envelope {"result": TracesData} and all nested
   * OTLP fields at the network boundary. Envelope handling is kept separate from
   * enrichment so future streaming can be added without touching the parser.
   */
  async fetchTrace(traceId: string, signal?: AbortSignal): Promise<TracesDataWire> {
    traceIdHex.parse(traceId);
    const url = `${this.apiRoot}/traces/${encodeURIComponent(traceId)}`;
    // Trace queries buffer storage and archive reads before sending headers and can exceed 10 seconds.
    const response = await this.fetchWithTimeout(url, { timeout: null, signal });
    if (!response.ok) {
      throw await httpError(`Failed to fetch trace ${traceId}`, url, response);
    }
    const data = await response.json();
    const validated = GetTraceResponseSchema.parse(data);
    return validated.result;
  }

  /**
   * Fetch with timeout support using AbortController.
   * @param url - The URL to fetch
   * @param options - Fetch request options, plus a timeout in milliseconds (default: 10 seconds) or null for no deadline
   * @returns Promise<Response>
   * @throws Error if request times out or network error occurs
   */
  private async fetchWithTimeout(
    url: string,
    { timeout = 10000, signal, ...options }: RequestInit & { timeout?: number | null } = {}
  ): Promise<Response> {
    if (timeout === null) {
      return fetch(url, { ...options, signal });
    }

    const controller = new AbortController();
    const forwardAbort = () => controller.abort(signal?.reason);
    if (signal?.aborted) {
      forwardAbort();
    } else {
      signal?.addEventListener('abort', forwardAbort, { once: true });
    }
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      if (!controller.signal.aborted) {
        timedOut = true;
        controller.abort();
      }
    }, timeout);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError' && timedOut) {
        throw new Error(`Request timeout after ${timeout}ms`, { cause: error });
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', forwardAbort);
    }
  }
}

// Export a singleton instance
export const jaegerClient = new JaegerClient();
