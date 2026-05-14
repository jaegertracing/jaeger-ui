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
 *
 * For OTLP trace/span wire types, re-export the qualified schemas from
 * generated-client.ts via the schemas bundle so consumers use ergonomic names
 * without reaching into the generated file's internals. This survives codegen
 * renames (e.g. AnyValue → opentelemetry_proto_common_v1_AnyValue) because the
 * bundle key is the stable one.
 */

<<<<<<< HEAD
=======
// Import auto-generated schemas (post-processed for strict validation)
export {
  ServicesResponseSchema,
  OperationsResponseSchema,
  OperationSchema,
  TracesDataSchema,
  ResourceSpansSchema,
  ScopeSpansSchema,
  SpanSchema,
  SpanEventSchema,
  SpanLinkSchema,
  ResourceSchema,
  InstrumentationScopeSchema,
  KeyValueSchema,
  AnyValueSchema,
  ArrayValueSchema,
  KeyValueListSchema,
  StatusSchema,
} from './generated-client';

/**
 * Helper validators for trace and span IDs in hex format
 * These are custom additions not present in the OpenAPI spec
 */
>>>>>>> e493ec99 (feat(api/v3): Expose Zod schemas for OTLP trace/span types)
import { z } from 'zod';
import { schemas } from './generated-client';

const {
  jaeger_api_v3_GetServicesResponse,
  jaeger_api_v3_GetOperationsResponse,
  jaeger_api_v3_Operation,
  jaeger_api_v3_TraceSummary,
  jaeger_api_v3_FindTraceSummariesResponse,
  opentelemetry_proto_trace_v1_TracesData,
  opentelemetry_proto_trace_v1_ResourceSpans,
  opentelemetry_proto_trace_v1_ScopeSpans,
  opentelemetry_proto_trace_v1_Span,
  opentelemetry_proto_trace_v1_Span_Event,
  opentelemetry_proto_trace_v1_Span_Link,
  opentelemetry_proto_resource_v1_Resource,
  opentelemetry_proto_common_v1_InstrumentationScope,
  opentelemetry_proto_common_v1_KeyValue,
  opentelemetry_proto_common_v1_AnyValue,
  opentelemetry_proto_common_v1_ArrayValue,
  opentelemetry_proto_common_v1_KeyValueList,
  opentelemetry_proto_trace_v1_Status,
} = schemas;

export const ServicesResponseSchema = jaeger_api_v3_GetServicesResponse;
export const OperationsResponseSchema = jaeger_api_v3_GetOperationsResponse;
export const OperationSchema = jaeger_api_v3_Operation;
export const TracesDataSchema = opentelemetry_proto_trace_v1_TracesData;
export const ResourceSpansSchema = opentelemetry_proto_trace_v1_ResourceSpans;
export const ScopeSpansSchema = opentelemetry_proto_trace_v1_ScopeSpans;
export const SpanSchema = opentelemetry_proto_trace_v1_Span;
export const SpanEventSchema = opentelemetry_proto_trace_v1_Span_Event;
export const SpanLinkSchema = opentelemetry_proto_trace_v1_Span_Link;
export const ResourceSchema = opentelemetry_proto_resource_v1_Resource;
export const InstrumentationScopeSchema = opentelemetry_proto_common_v1_InstrumentationScope;
export const KeyValueSchema = opentelemetry_proto_common_v1_KeyValue;
export const AnyValueSchema = opentelemetry_proto_common_v1_AnyValue;
export const ArrayValueSchema = opentelemetry_proto_common_v1_ArrayValue;
export const KeyValueListSchema = opentelemetry_proto_common_v1_KeyValueList;
export const StatusSchema = opentelemetry_proto_trace_v1_Status;

export const traceIdHex = z.string().regex(/^[0-9a-f]{32}$/i, 'Invalid trace ID: must be 32-char hex string');

export const spanIdHex = z.string().regex(/^[0-9a-f]{16}$/i, 'Invalid span ID: must be 16-char hex string');

// ServiceSummary: name is required (per IDL); counts are optional, nonnegative with 0 fallbacks.
const permissiveServiceSummary = z.object({
  name: z.string(),
  spanCount: z.number().int().min(0).optional(),
  errorSpanCount: z.number().int().min(0).optional(),
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
    orphanSpanCount: z.number().int().min(0).optional(),
    services: z.array(permissiveServiceSummary).optional(),
  })
);

// summaries is optional in the generated schema (.partial()); keep it optional here
// so responses without the field pass validation (client.ts handles the ?? [] fallback).
export const TraceSummariesResponseSchema = jaeger_api_v3_FindTraceSummariesResponse.extend({
  summaries: z.array(normalizeTraceId).optional(),
});
