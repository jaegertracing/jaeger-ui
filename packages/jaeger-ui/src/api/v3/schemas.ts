// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Zod schemas for Jaeger v3 API responses.
 *
 * Schemas for services/operations are re-exported from generated-client.ts as-is
 * (strict validation — required fields enforced).
 *
 * TraceSummary uses a permissive schema: only traceId is required (needed to identify
 * and link to the trace). All other fields are optional with sensible fallbacks in
 * client.ts. This follows the OpenAPI spec (no `required` fields on TraceSummary)
 * and makes the client resilient to partial responses from incomplete backend
 * implementations.
 */

import { z } from 'zod';
import { ApiTraceSummarySchema, FindTraceSummariesResponseSchema } from './generated-client';

export { ServicesResponseSchema, OperationsResponseSchema, OperationSchema } from './generated-client';

export const traceIdHex = z.string().regex(/^[0-9a-f]{32}$/i, 'Invalid trace ID: must be 32-char hex string');

export const spanIdHex = z.string().regex(/^[0-9a-f]{16}$/i, 'Invalid span ID: must be 16-char hex string');

// Permissive ServiceSummary: all fields optional; client.ts applies fallbacks.
const permissiveServiceSummary = z.object({
  name: z.string().optional(),
  spanCount: z.number().int().optional(),
  errorSpanCount: z.number().int().optional(),
});

// Permissive TraceSummary schema: only traceId is required. All other fields are
// optional with sensible fallbacks in client.ts (timestamps → 0, counts → 0,
// services → []). ServiceSummary entries are likewise fully optional.
//
// Normalize the trace ID field name before validation.
// The spec defines `traceId` (proto3 camelCase) but the current server sends
// `traceID` (uppercase D). Accept either form and coerce to `traceId`.
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
    services: z.array(permissiveServiceSummary).optional(),
  })
);

export const TraceSummariesResponseSchema = FindTraceSummariesResponseSchema.extend({
  summaries: z.array(normalizeTraceId),
});
