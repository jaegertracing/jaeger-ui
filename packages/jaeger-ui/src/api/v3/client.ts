// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Jaeger API v3 Client
 *
 * This client interacts with the Jaeger backend's /api/v3/ endpoints
 * and returns native OTLP data structures.
 */

import prefixUrl from '../../utils/prefix-url';
import { ServicesResponseSchema, OperationsResponseSchema, TraceSummariesResponseSchema } from './schemas';
import { normalizeId } from '../../model/transform-trace-data';
import type { SearchQuery } from '../../types/search';
import type { TraceSummary, ServiceSummary } from '../../types/trace-summary';
import type { Microseconds } from '../../types/units';

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
   * Search for traces by query parameters.
   * Calls /api/v3/trace-summaries and maps the response to TraceSummary[].
   */
  async fetchTraceSummaries(query: SearchQuery): Promise<TraceSummary[]> {
    const params = new URLSearchParams();
    if (query.service) params.set('query.serviceName', query.service);
    if (query.operation) params.set('query.operationName', String(query.operation));
    // start/end are microsecond epoch integers from the URL; convert to ISO for the v3 API.
    // Guard with Number.isFinite to drop malformed URL params gracefully.
    const startUs = Number(query.start);
    const endUs = Number(query.end);
    if (Number.isFinite(startUs) && startUs > 0)
      params.set('query.startTimeMin', new Date(startUs / 1000).toISOString());
    if (Number.isFinite(endUs) && endUs > 0)
      params.set('query.startTimeMax', new Date(endUs / 1000).toISOString());
    if (query.limit) params.set('query.searchDepth', String(query.limit));
    if (query.minDuration) params.set('query.durationMin', query.minDuration);
    if (query.maxDuration) params.set('query.durationMax', query.maxDuration);
    if (query.tags) params.set('query.attributes', query.tags);

    const url = `${this.apiRoot}/trace-summaries?${params.toString()}`;
    const response = await this.fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch trace summaries: ${response.status} ${response.statusText}`);
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
        spanCount: svc.spanCount ?? 0,
        errorSpanCount: svc.errorSpanCount ?? 0,
      }));
      return {
        traceID: normalizeId(s.traceId ?? ''),
        traceName:
          rootServiceName && rootOperationName
            ? `${rootServiceName}: ${rootOperationName}`
            : rootServiceName || rootOperationName,
        rootServiceName,
        rootOperationName,
        startTime: Number(startNs / 1000n) as Microseconds,
        duration: Number((endNs - startNs) / 1000n) as Microseconds,
        spanCount: s.spanCount ?? 0,
        errorSpanCount: s.errorSpanCount ?? 0,
        orphanSpanCount: s.orphanSpanCount ?? 0,
        services,
      };
    });
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
