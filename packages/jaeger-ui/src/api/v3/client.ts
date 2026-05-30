// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Jaeger API v3 Client
 *
 * This client interacts with the Jaeger backend's /api/v3/ endpoints
 * and returns native OTLP data structures.
 */

import prefixUrl from '../../utils/prefix-url';
import {
  ServicesResponseSchema,
  OperationsResponseSchema,
  TracesDataSchema,
  FindTraceSummariesResponseSchema,
  type ITracesData,
  type ITraceSummaryResponse,
} from './schemas';
import type { TraceSummary } from '../../types/trace-summary';
import type { SearchQuery } from '../../types/search';

/** Nanoseconds → microseconds (Jaeger UI works in µs). */
function nanosToMicros(ns: string | undefined): number {
  if (!ns || typeof ns !== 'string' || !/^\d+$/.test(ns)) return 0;
  try {
    // ns is a decimal integer string; divide by 1000 and truncate
    const n = BigInt(ns);
    return Number(n / 1000n);
  } catch {
    return 0;
  }
}

/**
 * Convert a UI SearchQuery into the query-string parameters accepted by
 * /api/v3/trace-summaries. The field mapping follows the generated
 * jaeger_api_v3_TraceQueryParameters schema.
 */
function buildTraceSummariesParams(query: SearchQuery): Record<string, string> {
  const params: Record<string, string> = {};

  if (query.service) params['query.serviceName'] = query.service;
  if (query.operation) params['query.operationName'] = query.operation;
  if (query.tags) params['query.attributes'] = query.tags;
  if (query.minDuration) {
    params['query.durationMin'] = /^\d+(?:\.\d+)?$/.test(query.minDuration)
      ? `${query.minDuration}s`
      : query.minDuration;
  }
  if (query.maxDuration) {
    params['query.durationMax'] = /^\d+(?:\.\d+)?$/.test(query.maxDuration)
      ? `${query.maxDuration}s`
      : query.maxDuration;
  }
  if (query.limit) params['query.searchDepth'] = String(query.limit);

  // start / end are unix microseconds from the UI; convert to ISO-8601 for the v3 API
  if (query.start) {
    const startMs = Number(query.start) / 1000;
    if (Number.isFinite(startMs) && startMs > 0) {
      params['query.startTimeMin'] = new Date(startMs).toISOString();
    }
  }
  if (query.end) {
    const endMs = Number(query.end) / 1000;
    if (Number.isFinite(endMs) && endMs > 0) {
      params['query.startTimeMax'] = new Date(endMs).toISOString();
    }
  }

  return params;
}

export class JaegerClient {
  private apiRoot = prefixUrl('/api/v3');

  /**
   * Fetch the list of services from the Jaeger API.
   * @returns Promise<string[]> - Array of service names
   */
  async fetchServices(): Promise<string[]> {
    const response = await this.fetchWithTimeout(`${this.apiRoot}/services`);
    if (!response.ok) {
      throw new Error(`Failed to fetch services: ${response.status} ${response.statusText}`);
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
    const response = await this.fetchWithTimeout(
      `${this.apiRoot}/operations?service=${encodeURIComponent(service)}`
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch span names for service "${service}": ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();

    // Runtime validation with Zod
    const validated = OperationsResponseSchema.parse(data);
    return validated.operations;
  }

  /**
   * Search for traces matching the given query and return UI-shaped TraceSummary objects.
   * Calls /api/v3/trace-summaries.
   * @param query - The search parameters
   * @returns Promise<TraceSummary[]>
   */
  async fetchTraceSummaries(query: SearchQuery): Promise<TraceSummary[]> {
    const params = buildTraceSummariesParams(query);
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `${this.apiRoot}/trace-summaries?${qs}` : `${this.apiRoot}/trace-summaries`;

    const response = await this.fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch trace summaries: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();

    // Runtime validation with Zod (safeParse for resilience)
    const result = FindTraceSummariesResponseSchema.safeParse(data);
    const summaries: ITraceSummaryResponse[] = result.success
      ? result.data.summaries ?? []
      : (data?.summaries ?? []);

    if (!result.success) {
      console.error('[OTLP Validation] Error for trace-summaries response:', result.error.format());
    }

    // Map API TraceSummary → UI TraceSummary
    return summaries.map((s: ITraceSummaryResponse) => {
      const traceID = s.traceId || (s as any).traceID;
      const startNs = s.minStartTimeUnixNano;
      const endNs = s.maxEndTimeUnixNano;
      const startUs = nanosToMicros(startNs);
      const endUs = nanosToMicros(endNs);

      return {
        traceID,
        traceName: s.rootOperationName
          ? `${s.rootServiceName ?? ''}: ${s.rootOperationName}`
          : (s.rootServiceName ?? traceID),
        rootServiceName: s.rootServiceName ?? '',
        rootOperationName: s.rootOperationName ?? '',
        startTime: startUs,
        duration: endUs > startUs ? endUs - startUs : 0,
        spanCount: s.spanCount ?? 0,
        errorSpanCount: s.errorSpanCount ?? 0,
        orphanSpanCount: s.orphanSpanCount ?? 0,
        services: (s.services ?? []).map(svc => ({
          name: svc.name ?? '',
          spanCount: svc.spanCount ?? 0,
          errorSpanCount: svc.errorSpanCount ?? 0,
        })),
      } as TraceSummary;
    });
  }

  /**
   * Fetch a single trace by ID and validate its structure against OTLP Zod schemas.
   * @param traceId - The trace ID in hex format
   * @returns Promise<ITracesData>
   */
  async fetchTrace(traceId: string): Promise<ITracesData> {
    const response = await this.fetchWithTimeout(`${this.apiRoot}/traces/${traceId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch trace "${traceId}": ${response.status} ${response.statusText}`);
    }
    const data = await response.json();

    // Runtime validation with Zod (safeParse for resilience)
    const result = TracesDataSchema.safeParse(data);
    if (!result.success) {
      // Graceful degradation: log error for observability but return data to avoid blank screens
      console.error(`[OTLP Validation] Error for trace ${traceId}:`, result.error.format());
      return data as ITracesData;
    }
    return result.data;
  }

  /**
   * Fetch with timeout support using AbortController.
   * @param url - The URL to fetch
   * @param timeout - Timeout in milliseconds (default: 10 seconds)
   * @returns Promise<Response>
   * @throws Error if request times out or network error occurs
   */
  private async fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`, { cause: error });
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Export a singleton instance
export const jaegerClient = new JaegerClient();
