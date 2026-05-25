// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Zod schemas for Jaeger v3 API responses.
 *
 * Schemas for services/operations are re-exported from generated-client.ts as-is
 * (strict validation — required fields enforced).
 *
 * TraceSummary uses a permissive schema: all fields are optional except traceId,
 * minStartTimeUnixNano, and maxEndTimeUnixNano which are required to render a trace
 * entry at all. This follows the OpenAPI spec (no `required` fields on TraceSummary)
 * and makes the client resilient to partial responses from incomplete backend
 * implementations.
 */

import { z } from 'zod';
import { ApiTraceSummarySchema, FindTraceSummariesResponseSchema } from './generated-client';

export { ServicesResponseSchema, OperationsResponseSchema, OperationSchema } from './generated-client';

export const traceIdHex = z.string().regex(/^[0-9a-f]{32}$/i, 'Invalid trace ID: must be 32-char hex string');

export const spanIdHex = z.string().regex(/^[0-9a-f]{16}$/i, 'Invalid span ID: must be 16-char hex string');

// Permissive TraceSummary schema: all fields optional except traceId, which is
// the unique identifier — without it we cannot link to the trace or use it as a
// React key. All other fields have sensible fallbacks in the client mapping:
//   startTime / duration fall back to 0 when timestamps are absent,
//   counts fall back to 0, services falls back to [].
//
// The decimal-digit constraint on the timestamp fields is kept as an
// optional refinement (applied only when the field is present) to prevent a
// runtime SyntaxError in BigInt() if a non-decimal string slips through.
// Normalize the trace ID field name before validation.
// The spec says `traceId` but the current server sends `traceID` (uppercase D).
// Accept either form and coerce to `traceId` so the rest of the schema is stable.
const normalizeTraceId = z.preprocess(
  (raw: unknown) => {
    if (raw && typeof raw === 'object' && !('traceId' in raw) && 'traceID' in raw) {
      const { traceID, ...rest } = raw as Record<string, unknown>;
      return { traceId: traceID, ...rest };
    }
    return raw;
  },
  ApiTraceSummarySchema.partial().extend({
    traceId: traceIdHex,
    // Restrict to decimal digits when present — BigInt() throws SyntaxError on non-decimal strings.
    minStartTimeUnixNano: z.string().regex(/^\d+$/, 'Expected decimal int64 string').optional(),
    maxEndTimeUnixNano: z.string().regex(/^\d+$/, 'Expected decimal int64 string').optional(),
  })
);

export const TraceSummariesResponseSchema = FindTraceSummariesResponseSchema.extend({
  summaries: z.array(normalizeTraceId),
});
