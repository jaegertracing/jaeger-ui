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
   * Helper to handle Jaeger v3 specific error arrays in 200 OK responses.
   * Graphite Fix: Throws raw message; wrapping happens in public methods.
   */
  private throwIfBodyHasErrors(data: any): void {
    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      const messages = data.errors.map((e: { msg: string }) => e.msg).join(', ');
      throw new Error(messages);
    }
  }

  /**
   * Fetch the list of services from the Jaeger API.
   * @returns Promise<string[]> - Array of service names
   */
  async fetchServices(): Promise<string[]> {
    const context = 'Failed to fetch services';
    try {
      const response = await this.fetchWithTimeout(`${this.apiRoot}/services`);
      const data = await response.json();

      this.throwIfBodyHasErrors(data);

      const validated = ServicesResponseSchema.parse(data);
      return validated.services;
    } catch (error) {
      // Copilot Fix: Preserve original error as cause and avoid undefined messages
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${context}: ${message}`);
    }
  }

  /**
   * Fetch the list of span names (operations) for a given service.
   * @param service - The service name
   * @returns Promise<{ name: string; spanKind: string }[]> - Array of span name objects
   */
  async fetchSpanNames(service: string): Promise<{ name: string; spanKind: string }[]> {
    const context = `Failed to fetch span names for service "${service}"`;
    try {
      const response = await this.fetchWithTimeout(
        `${this.apiRoot}/operations?service=${encodeURIComponent(service)}`
      );
      const data = await response.json();

      this.throwIfBodyHasErrors(data);

      const validated = OperationsResponseSchema.parse(data);
      return validated.operations;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${context}: ${message}`);
    }
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
          const errorBody: any = await response.json();
          if (Array.isArray(errorBody?.errors) && errorBody.errors.length > 0) {
            errorDetail = errorBody.errors.map((e: { msg: string }) => e.msg).join(', ');
          }
        } catch {
          /* Fallback to statusText if body isn't JSON */
        }

        // Copilot Fix: Richer error including URL as requested
        throw new Error(`${response.status} (${url}) ${errorDetail}`);
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
