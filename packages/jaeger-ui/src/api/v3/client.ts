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
  type ITracesData,
} from './schemas';

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
