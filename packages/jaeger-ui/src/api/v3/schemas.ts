// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Zod schemas for Jaeger v3 API responses.
 *
 * Some schemas are re-exported from generated-client.ts (auto-generated from OpenAPI spec,
 * post-processed to remove .partial() for strict validation). Others are hand-written where
 * the IDL has not yet been finalized or where the generated output diverges from the actual
 * server wire format.
 */

// Import auto-generated schemas (post-processed for strict validation)
export { ServicesResponseSchema } from './generated-client';

// NOTE: The OpenAPI spec incorrectly lists Operation.spanKind as "span_kind" (snake_case).
// The server uses jsonpb.Marshaler which follows proto3 JSON encoding and emits camelCase.
// We override OperationSchema and OperationsResponseSchema here to match actual server output.
// See https://github.com/jaegertracing/jaeger/issues/8619
export const OperationSchema = z.object({ name: z.string(), spanKind: z.string() }).passthrough();
export const OperationsResponseSchema = z.object({ operations: z.array(OperationSchema) }).passthrough();

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
