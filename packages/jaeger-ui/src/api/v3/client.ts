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
import getConfig from '../../utils/config/get-config';
import prefixUrl from '../../utils/prefix-url';
import { truncateErrorDetail } from '../../utils/error-message';
import {
  ServicesResponseSchema,
  OperationsResponseSchema,
  TraceSummariesResponseSchema,
  GetTraceResponseSchema,
  ServiceMetricsResponseSchema,
  OperationMetricsResponseSchema,
  traceIdHex,
} from './schemas';
import type { TracesDataWire } from './schemas';
import type { SearchQuery } from '../../types/search';
import type { TraceSummary, ServiceSummary } from '../../types/trace-summary';
import type { ApiError } from '../../types/api-error';
import type { Microseconds } from '../../types/units';
import type { TDdgModelParams } from '../../model/ddg/types';
import type { MetricsAPIQueryParams, MetricsAPIResponse } from '../../types/metrics';

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

// ErrorMessage shows at most 1024 characters, so a few KB covers a pretty-printed JSON error.
const MAX_ERROR_BODY_BYTES = 4096;
// The status is already known, so a stalled error body must not delay reporting it,
// including on requests without a deadline.
const ERROR_BODY_TIMEOUT_MS = 2000;

/**
 * Read up to MAX_ERROR_BODY_BYTES of a failed response within ERROR_BODY_TIMEOUT_MS and
 * cancel the rest, so a large, endless, or stalled error body never holds up the error.
 * A read that fails because the request was aborted rethrows the abort reason; any other
 * read failure is reported as an absent body.
 */
async function readErrorBody(response: Response, signal: AbortSignal | null | undefined): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let body = '';
  let remaining = MAX_ERROR_BODY_BYTES;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<null>(resolve => {
    timeoutId = setTimeout(() => resolve(null), ERROR_BODY_TIMEOUT_MS);
  });
  try {
    while (remaining > 0) {
      const result = await Promise.race([reader.read(), expired]);
      // On expiry, keep the part of the body read so far.
      if (!result) break;
      if (result.done) return body + decoder.decode();
      const chunk = result.value.subarray(0, remaining);
      remaining -= chunk.byteLength;
      body += decoder.decode(chunk, { stream: true });
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    return '';
  } finally {
    clearTimeout(timeoutId);
  }
  reader.cancel().catch(() => undefined);
  return body + decoder.decode();
}

function nonBlankString(value: unknown): string | undefined {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || undefined;
}

/** Reads the human-readable detail from a parsed JSON error body. */
type ErrorDetailFn = (data: unknown) => string | undefined;

type FetchOptions = RequestInit & {
  timeout?: number | null;
  errorDetailFn?: ErrorDetailFn;
};

/** The v3 HTTP gateway returns `{ error: { httpCode, message } }`. */
function v3ErrorDetail(data: unknown): string | undefined {
  const { error } = (data ?? {}) as { error?: { message?: unknown } | null };
  return nonBlankString(error?.message);
}

/** The legacy /api/ routes return `{ errors: [{ code, msg }] }`. */
function legacyErrorDetail(data: unknown): string | undefined {
  const { errors } = (data ?? {}) as { errors?: unknown };
  if (!Array.isArray(errors)) return undefined;
  const messages = errors
    .map(e => nonBlankString((e as { msg?: unknown } | null)?.msg))
    .filter((m): m is string => m !== undefined);
  return messages.length ? messages.join('; ') : undefined;
}

/**
 * Build the error for a failed response. The message carries the server's own
 * message when the body has one; the HTTP details and body are kept for ErrorMessage.
 */
async function httpError(
  message: string,
  url: string,
  response: Response,
  signal: AbortSignal | null | undefined,
  errorDetailFn?: ErrorDetailFn
): Promise<Error> {
  const error: Error & Exclude<ApiError, string> = new Error(
    `${message}: ${response.status} ${response.statusText}`
  );
  const queryStart = url.indexOf('?');
  error.httpStatus = response.status;
  error.httpStatusText = response.statusText;
  error.httpUrl = queryStart === -1 ? url : url.slice(0, queryStart);
  if (queryStart !== -1) error.httpQuery = url.slice(queryStart + 1);
  const body = await readErrorBody(response, signal);
  if (body) {
    try {
      const data: unknown = JSON.parse(body);
      error.httpBody = JSON.stringify(data, null, 2);
      const detail = truncateErrorDetail(errorDetailFn?.(data));
      if (detail) error.message += `: ${detail}`;
    } catch {
      error.httpBody = body;
    }
  }
  return error;
}

export class JaegerClient {
  private apiRoot = prefixUrl('/api/v3');
  // Archive, dependency-graph, and metrics requests retain their existing /api/ routes.
  private legacyApiRoot = prefixUrl('/api/');

  async fetchMetrics<TGroupByOperation extends boolean = false>(
    metricType: 'latencies' | 'calls' | 'errors',
    service: string,
    query: MetricsAPIQueryParams & { groupByOperation?: TGroupByOperation },
    signal?: AbortSignal
  ): Promise<MetricsAPIResponse<TGroupByOperation>>;
  async fetchMetrics(
    metricType: 'latencies' | 'calls' | 'errors',
    service: string,
    query: MetricsAPIQueryParams,
    signal?: AbortSignal
  ): Promise<MetricsAPIResponse<boolean>> {
    const path = `metrics/${metricType}?service=${encodeURIComponent(service)}&${queryString.stringify(query)}`;
    // Preserve deadline-free metrics reads, which can wait on storage queries.
    const data = await this.fetchLegacy(path, `Failed to fetch ${metricType} metrics`, {
      timeout: null,
      signal,
    });
    const schema = query.groupByOperation ? OperationMetricsResponseSchema : ServiceMetricsResponseSchema;
    return { ...schema.parse(data), quantile: query.quantile };
  }

  async fetchDependencies(
    endTs = Date.now(),
    lookback = DEFAULT_DEPENDENCY_LOOKBACK,
    signal?: AbortSignal
  ): Promise<unknown> {
    const query = queryString.stringify({ endTs, lookback });
    // Preserve deadline-free graph reads, which can wait on storage queries.
    return this.fetchLegacy(`dependencies?${query}`, 'Failed to fetch dependencies', {
      timeout: null,
      signal,
    });
  }

  async fetchDeepDependencyGraph(params: TDdgModelParams, signal?: AbortSignal): Promise<unknown> {
    const query = queryString.stringify(params);
    return this.fetchLegacy(`deep-dependencies?${query}`, 'Failed to fetch deep dependencies', {
      timeout: null,
      signal,
    });
  }

  async archiveTrace(id: string): Promise<unknown> {
    return this.fetchLegacy(`archive/${id}`, `Failed to archive trace ${id}`, { method: 'POST' });
  }

  async fetchDecoration(url: string): Promise<unknown> {
    return this.fetchJson(url, 'Failed to fetch decoration');
  }

  async fetchQualityMetrics(service: string, hours: number, signal?: AbortSignal): Promise<unknown> {
    const endpoint = getConfig().qualityMetrics?.apiEndpoint;
    if (!endpoint) {
      throw new Error('qualityMetrics.apiEndpoint is not set in the UI config');
    }
    const url = `${prefixUrl(endpoint)}?${queryString.stringify({ hours, service })}`;
    return this.fetchJson(url, 'Failed to fetch quality metrics', { timeout: null, signal });
  }

  private fetchV3(path: string, errorMessage: string, options?: FetchOptions): Promise<unknown> {
    return this.fetchJson(`${this.apiRoot}/${path}`, errorMessage, {
      ...options,
      errorDetailFn: v3ErrorDetail,
    });
  }

  private fetchLegacy(path: string, errorMessage: string, options?: FetchOptions): Promise<unknown> {
    return this.fetchJson(`${this.legacyApiRoot}${path}`, errorMessage, {
      ...options,
      errorDetailFn: legacyErrorDetail,
    });
  }

  /**
   * Fetch the list of services from the Jaeger API.
   * @returns Promise<string[]> - Array of service names
   */
  async fetchServices(): Promise<string[]> {
    const data = await this.fetchV3('services', 'Failed to fetch services');

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
    const path = `operations?service=${encodeURIComponent(service)}`;
    const data = await this.fetchV3(path, `Failed to fetch span names for service "${service}"`);

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

    const data = await this.fetchV3(
      `trace-summaries?${params.toString()}`,
      'Failed to fetch trace summaries'
    );
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
    const path = `traces/${encodeURIComponent(traceId)}`;
    // Trace queries buffer storage and archive reads before sending headers and can exceed 10 seconds.
    const data = await this.fetchV3(path, `Failed to fetch trace ${traceId}`, {
      timeout: null,
      signal,
    });
    const validated = GetTraceResponseSchema.parse(data);
    return validated.result;
  }

  /**
   * Fetch and parse a JSON response with timeout support using AbortController. The
   * timeout and caller signal cover the whole request, including the body read, and a
   * failed response is turned into an httpError, whose body read also has its own
   * short deadline.
   * @param url - The URL to fetch
   * @param errorMessage - Prefix for the error thrown on a failed response
   * @param options - Fetch request options, plus a timeout in milliseconds (default: 10 seconds) or null
   *   for no deadline, and the reader for the detail in an error body
   * @returns Promise<unknown> - The parsed JSON body of a successful response
   * @throws Error if the response fails, the request times out, or a network error occurs
   */
  private async fetchJson(
    url: string,
    errorMessage: string,
    { timeout = 10000, signal, errorDetailFn, ...options }: FetchOptions = {}
  ): Promise<unknown> {
    if (timeout === null) {
      const response = await fetch(url, { ...options, signal });
      if (!response.ok) throw await httpError(errorMessage, url, response, signal, errorDetailFn);
      return response.json();
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
      if (!response.ok) throw await httpError(errorMessage, url, response, controller.signal, errorDetailFn);
      return await response.json();
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
