// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Jaeger API v3 Client
 *
 * This client interacts with the Jaeger backend's /api/v3/ endpoints
 * and returns native OTLP data structures.
 */

import prefixUrl from '../../utils/prefix-url';
import { ServicesResponseSchema, OperationsResponseSchema } from './schemas';

export class JaegerClient {
  private apiRoot = prefixUrl('/api/v3');

  /**
   * Fetch the list of services from the Jaeger API.
   * @returns Promise<string[]> - Array of service names
   */
  async fetchServices(): Promise<string[]> {
    const response = await this.fetchWithTimeout(`${this.apiRoot}/services`);

    // Parse once. Jaeger v3 may return 200 OK with an errors array in the body.
    const data = await response.json();

    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      // Aggregate all error messages so no detail is lost
      const messages = data.errors.map((e: { msg: string }) => e.msg).join(', ');
      throw new Error(`Failed to fetch services: ${messages}`);
    }

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

    // Jaeger v3 may return HTTP 200 with an 'errors' array in the response body; treat that as a failure.
    const data = await response.json();

    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      // Aggregate all error messages for this specific service
      const messages = data.errors.map((e: { msg: string }) => e.msg).join(', ');
      throw new Error(`Failed to fetch span names for service "${service}": ${messages}`);
    }

    const validated = OperationsResponseSchema.parse(data);
    return validated.operations;
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

      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
          const errorBody = await response.json();
          // Safely check if errors is an array before mapping
          if (errorBody?.errors && Array.isArray(errorBody.errors) && errorBody.errors.length > 0) {
            errorDetail = errorBody.errors.map((e: any) => e.msg).join(', ');
          }
        } catch {
          /* Fallback to statusText if body isn't JSON */
        }

        throw new Error(`${response.status} ${errorDetail}`);
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Export a singleton instance
export const jaegerClient = new JaegerClient();
