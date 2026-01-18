// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Zod schemas for Jaeger v3 API responses
 *
 * These are imported from generated-client.ts which is auto-generated from OpenAPI spec
 * and post-processed to remove .partial() for strict validation.
 */

// Import auto-generated schemas (post-processed for strict validation)
export { ServicesResponseSchema, OperationsResponseSchema, OperationSchema } from './generated-client';

/**
 * Helper validators for trace and span IDs in hex format
 * These are custom additions not present in the OpenAPI spec
 */
import { z } from 'zod';

export const traceIdHex = z.string().regex(/^[0-9a-f]{32}$/i, 'Invalid trace ID: must be 32-char hex string');

export const spanIdHex = z.string().regex(/^[0-9a-f]{16}$/i, 'Invalid span ID: must be 16-char hex string');
