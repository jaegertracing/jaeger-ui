// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

/**
 * API Response Schemas
 *
 * These schemas validate responses from the Jaeger v3 API.
 * They provide both runtime validation (via Zod) and compile-time types (via z.infer).
 */

/**
 * Schema for /api/v3/services response
 */
export const ServicesResponseSchema = z.object({
  services: z.array(z.string()),
});

export type ServicesResponse = z.infer<typeof ServicesResponseSchema>;

/**
 * Schema for individual operation in /api/v3/operations response
 */
export const OperationSchema = z.object({
  name: z.string(),
  spanKind: z.string(),
});

/**
 * Schema for /api/v3/operations response
 */
export const OperationsResponseSchema = z.object({
  operations: z.array(OperationSchema),
});

export type OperationsResponse = z.infer<typeof OperationsResponseSchema>;
export type Operation = z.infer<typeof OperationSchema>;

/**
 * Helper validators for trace and span IDs in hex format
 * (prepared for future use in Milestone 3.2)
 */
export const traceIdHex = z.string().regex(/^[0-9a-f]{32}$/i, 'Invalid trace ID: must be 32-char hex string');

export const spanIdHex = z.string().regex(/^[0-9a-f]{16}$/i, 'Invalid span ID: must be 16-char hex string');
