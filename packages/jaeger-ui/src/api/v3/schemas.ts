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

// TODO: The schemas below are HAND-WRITTEN because the IDL for the /api/v3/trace-summaries
// endpoint (ADR-010) has not been finalized yet. Once the Jaeger protobuf/OpenAPI IDL is
// published, regenerate generated-client.ts (npm run generate:api-types), move these schemas
// there, and re-export them from this file like ServicesResponseSchema above.

const ServiceSummarySchema = z.object({
  name: z.string(),
  spanCount: z.number().int().nonnegative(),
  errorSpanCount: z.number().int().nonnegative(),
});

const ApiTraceSummarySchema = z.object({
  traceID: traceIdHex,
  rootServiceName: z.string(),
  rootOperationName: z.string(),
  // int64 nanosecond timestamps are encoded as decimal strings per proto3 JSON encoding
  // rules, to avoid precision loss when parsed by JavaScript's 53-bit float Number.
  // Restrict to decimal digits so non-decimal values fail Zod validation rather than
  // throwing a runtime SyntaxError in BigInt().
  minStartTimeUnixNano: z.string().regex(/^\d+$/, 'Expected decimal int64 string'),
  maxEndTimeUnixNano: z.string().regex(/^\d+$/, 'Expected decimal int64 string'),
  spanCount: z.number().int().nonnegative(),
  errorSpanCount: z.number().int().nonnegative(),
  orphanSpanCount: z.number().int().nonnegative(),
  services: z.array(ServiceSummarySchema),
});

export const TraceSummariesResponseSchema = z.object({
  summaries: z.array(ApiTraceSummarySchema),
});
