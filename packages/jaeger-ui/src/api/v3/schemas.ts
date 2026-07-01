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
import { schemas } from './generated-client';

const {
  jaeger_api_v3_GetServicesResponse,
  jaeger_api_v3_GetOperationsResponse,
  jaeger_api_v3_Operation,
  jaeger_api_v3_TraceSummary,
  jaeger_api_v3_FindTraceSummariesResponse,
} = schemas;

export const ServicesResponseSchema = jaeger_api_v3_GetServicesResponse;
export const OperationsResponseSchema = jaeger_api_v3_GetOperationsResponse;
export const OperationSchema = jaeger_api_v3_Operation;

export const traceIdHex = z.string().regex(/^[0-9a-f]{32}$/i, 'Invalid trace ID: must be 32-char hex string');

export const spanIdHex = z.string().regex(/^[0-9a-f]{16}$/i, 'Invalid span ID: must be 16-char hex string');

// ServiceSummary: name is required (per IDL); counts are optional, nonnegative with 0 fallbacks.
const permissiveServiceSummary = z.object({
  name: z.string(),
  spanCount: z.number().int().min(0).optional(),
  errorSpanCount: z.number().int().min(0).optional(),
  warningSpanCount: z.number().int().min(0).optional(),
});

// Enrich the generated TraceSummary schema with format constraints and wire-name
// normalization. The generated schema already has traceId required and all other
// fields optional (driven by field_behavior annotations in the proto IDL).
//
// Normalize the trace ID field name before validation.
// The spec uses `traceId` (proto3 camelCase) but some older backends send `traceID`
// (uppercase D). Coerce to `traceId` and strip `traceID` so output always has one
// canonical field name regardless of which form (or both) arrived on the wire.
const normalizeTraceId = z.preprocess(
  (raw: unknown) => {
    if (raw && typeof raw === 'object' && 'traceID' in raw) {
      const { traceID, traceId, ...rest } = raw as Record<string, unknown>;
      return { traceId: traceId ?? traceID, ...rest };
    }
    return raw;
  },
  jaeger_api_v3_TraceSummary.extend({
    traceId: traceIdHex,
    // Restrict to decimal digits when present — BigInt() throws SyntaxError on non-decimal strings.
    minStartTimeUnixNano: z.string().regex(/^\d+$/, 'Expected decimal int64 string').optional(),
    maxEndTimeUnixNano: z.string().regex(/^\d+$/, 'Expected decimal int64 string').optional(),
    // Counts must be nonnegative when present; client.ts applies 0 fallbacks.
    spanCount: z.number().int().min(0).optional(),
    errorSpanCount: z.number().int().min(0).optional(),
    warningSpanCount: z.number().int().min(0).optional(),
    orphanSpanCount: z.number().int().min(0).optional(),
    services: z.array(permissiveServiceSummary).optional(),
  })
);

// summaries is optional in the generated schema (.partial()); keep it optional here
// so responses without the field pass validation (client.ts handles the ?? [] fallback).
export const TraceSummariesResponseSchema = jaeger_api_v3_FindTraceSummariesResponse.extend({
  summaries: z.array(normalizeTraceId).optional(),
});
