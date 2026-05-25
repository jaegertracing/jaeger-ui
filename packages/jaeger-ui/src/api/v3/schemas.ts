// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Zod schemas for Jaeger v3 API responses.
 *
 * Generated schemas from generated-client.ts are used as-is for services/operations.
 *
 * For TraceSummary, the generated schema already has traceId required and all other
 * fields optional (driven by field_behavior annotations in the proto IDL). This file
 * adds format constraints (hex regex for traceId, decimal-string check for nanosecond
 * timestamps) and normalizes the traceID→traceId wire-name inconsistency.
 *
 * ServiceSummary: name is required per the IDL; span counts are optional with
 * fallbacks applied in client.ts.
 */

import { z } from 'zod';
import { ApiTraceSummarySchema, FindTraceSummariesResponseSchema } from './generated-client';

export { ServicesResponseSchema, OperationsResponseSchema, OperationSchema } from './generated-client';

export const traceIdHex = z.string().regex(/^[0-9a-f]{32}$/i, 'Invalid trace ID: must be 32-char hex string');

export const spanIdHex = z.string().regex(/^[0-9a-f]{16}$/i, 'Invalid span ID: must be 16-char hex string');

// ServiceSummary: name is required (per IDL); counts are optional with 0 fallbacks.
const permissiveServiceSummary = z.object({
  name: z.string(),
  spanCount: z.number().int().optional(),
  errorSpanCount: z.number().int().optional(),
});

// Enrich the generated TraceSummary schema with format constraints and wire-name
// normalization. The generated schema already has traceId required and all other
// fields optional (driven by field_behavior annotations in the proto IDL).
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
  ApiTraceSummarySchema.extend({
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
