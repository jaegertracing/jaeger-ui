// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * OTLP API v3 Client
 *
 * This client interacts with the Jaeger backend's /api/v3/ endpoints
 * and returns native OTLP data structures.
 */

export class OtlpApiClient {
  private apiRoot = '/api/v3/';

  /**
   * Fetch the list of services from the OTLP API.
   * @returns Promise<string[]> - Array of service names
   */
  async fetchServices(): Promise<string[]> {
    const response = await fetch(`${this.apiRoot}services`);
    if (!response.ok) {
      throw new Error(`Failed to fetch services: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.services || [];
  }

  /**
   * Fetch the list of span names (operations) for a given service.
   * @param service - The service name
   * @returns Promise<string[]> - Array of span names
   */
  async fetchSpanNames(service: string): Promise<string[]> {
    const response = await fetch(`${this.apiRoot}services/${encodeURIComponent(service)}/operations`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch span names for service "${service}": ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();
    return data.spanNames || [];
  }
}

// Export a singleton instance
export const otlpApiClient = new OtlpApiClient();
