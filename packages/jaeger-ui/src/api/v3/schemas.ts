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
 *
 * For the full trace route (/api/v3/traces/{trace_id}), the generated OTLP
 * schemas are too permissive (every field .partial().passthrough()). This module
 * layers a refinement boundary over them: hex IDs, decimal-string int64s via
 * BigInt, optional numeric enums, recursive AnyValue one-of, and the
 * grpc-gateway envelope. See schemas.trace-contract.test.ts for the captured
 * wire cases each refinement pins.
 */

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

// OTLP reserves all-zero IDs as invalid, so the hex patterns below exclude them.
export const traceIdHex = z
  .string()
  .regex(/^(?!0+$)[0-9a-f]{32}$/i, 'Invalid trace ID: must be 32-char hex string and not all zeros');

export const spanIdHex = z
  .string()
  .regex(/^(?!0+$)[0-9a-f]{16}$/i, 'Invalid span ID: must be 16-char hex string and not all zeros');

// Protobuf bounds: timestamps are uint64, AnyValue int64. Syntax alone would let
// out-of-range values cross the boundary, so refine with BigInt after the regex.
const UINT64_MAX = 18446744073709551615n;
const INT64_MIN = -9223372036854775808n;
const INT64_MAX = 9223372036854775807n;

const inUint64 = (s: string): boolean => {
  try {
    const v = BigInt(s);
    return v >= 0n && v <= UINT64_MAX;
  } catch {
    return false;
  }
};

const int64Regex = /^-?\d{1,20}$/;

const inInt64 = (s: string): boolean => {
  // 1. Fail fast without throwing an exception
  if (!int64Regex.test(s)) {
    return false;
  }

  // 2. Safe to parse, guaranteed not to throw a SyntaxError
  const v = BigInt(s);
  return v >= INT64_MIN && v <= INT64_MAX;
};

export const decimalNanoString = z
  .string()
  .regex(/^\d+$/, 'Expected decimal uint64 string (quoted nanoseconds)')
  .refine(inUint64, 'Expected uint64 nanosecond value');

export const decimalInt64String = z
  .string()
  .regex(/^-?\d+$/, 'Expected decimal int64 string')
  .refine(inInt64, 'Expected int64 range value');

// OTLP sends enums as numbers precisely so new values don't break old receivers:
// accept any non-negative int and let the UI map unknown values to its default.
export const spanKindEnum = z.number().int().min(0);

export const statusCodeEnum = z.number().int().min(0);

// --- Recursive AnyValue one-of (OTLP) ---
// The generated AnyValue is .partial().passthrough() so it accepts {} or
// {stringValue:"x", boolValue:false} without complaint. Here we enforce exactly
// one value field and preserve falsy values ('' / false / 0) via !== undefined.
const ANY_VALUE_KEYS = [
  'stringValue',
  'boolValue',
  'intValue',
  'doubleValue',
  'arrayValue',
  'kvlistValue',
  'bytesValue',
] as const;

type AnyValueWire = {
  stringValue?: string;
  boolValue?: boolean;
  intValue?: string;
  doubleValue?: number;
  arrayValue?: { values?: AnyValueWire[] };
  kvlistValue?: { values?: { key: string; value: AnyValueWire }[] };
  bytesValue?: string;
};

// Circular AnyValue: lazy defers evaluation so forward refs are safe.
// oxlint-disable-next-line no-use-before-define
export const refinedAnyValue: z.ZodType<AnyValueWire> = z.lazy(() =>
  z
    .object({
      stringValue: z.string().optional(),
      boolValue: z.boolean().optional(),
      intValue: decimalInt64String.optional(),
      doubleValue: z.number().optional(),
      // oxlint-disable-next-line no-use-before-define
      arrayValue: refinedArrayValue.optional(),
      // oxlint-disable-next-line no-use-before-define
      kvlistValue: refinedKeyValueList.optional(),
      // OTLP/JSON encodes bytes as base64 text: the wire value is always a JSON
      // string and validation never decodes it, so non-UTF8 payloads pass
      // through as opaque strings by design.
      bytesValue: z.string().base64().optional(),
    })
    .passthrough()
    .superRefine((val: Record<string, unknown>, ctx) => {
      // Count without allocating; the name list is built only for the error path below.
      let count = 0;
      for (const k of ANY_VALUE_KEYS) {
        if (val[k] !== undefined) {
          count++;
        }
      }
      if (count === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'AnyValue must have exactly one value field' });
      } else if (count > 1) {
        const present = ANY_VALUE_KEYS.filter(k => val[k] !== undefined);
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `AnyValue must have exactly one value field, got ${present.join(', ')}`,
        });
      }
    })
);

// `values` stays optional: the backend drops it entirely for empty arrays (`arrayValue: {}` on the wire).
export const refinedArrayValue: z.ZodType<{ values?: AnyValueWire[] }> = z.lazy(() =>
  z.object({ values: z.array(refinedAnyValue).optional() }).passthrough()
);

export const refinedKeyValue: z.ZodType<{ key: string; value: AnyValueWire }> = z.lazy(() =>
  z.object({ key: z.string(), value: refinedAnyValue }).passthrough()
);

export const refinedKeyValueList: z.ZodType<{ values?: { key: string; value: AnyValueWire }[] }> = z.lazy(
  () => z.object({ values: z.array(refinedKeyValue).optional() }).passthrough()
);

export const refinedResource = z
  .object({
    attributes: z.array(refinedKeyValue).optional(),
    droppedAttributesCount: z.number().int().min(0).optional(),
  })
  .passthrough();

export const refinedScope = z
  .object({
    name: z.string().optional(),
    version: z.string().optional(),
    attributes: z.array(refinedKeyValue).optional(),
    droppedAttributesCount: z.number().int().min(0).optional(),
  })
  .passthrough();

export const refinedSpanEvent = z
  .object({
    timeUnixNano: decimalNanoString.optional(),
    name: z.string().optional(),
    attributes: z.array(refinedKeyValue).optional(),
    droppedAttributesCount: z.number().int().min(0).optional(),
  })
  .passthrough();

export const refinedSpanLink = z
  .object({
    traceId: traceIdHex,
    spanId: spanIdHex,
    traceState: z.string().optional(),
    attributes: z.array(refinedKeyValue).optional(),
    droppedAttributesCount: z.number().int().min(0).optional(),
    flags: z.number().int().min(0).optional(),
  })
  .passthrough();

export const refinedStatus = z
  .object({ message: z.string().optional(), code: statusCodeEnum.optional() })
  .passthrough();

export const refinedSpan = z
  .object({
    traceId: traceIdHex,
    spanId: spanIdHex,
    traceState: z.string().optional(),
    parentSpanId: spanIdHex.optional(),
    flags: z.number().int().min(0).optional(),
    name: z.string().optional(),
    kind: spanKindEnum.optional(),
    startTimeUnixNano: decimalNanoString.optional(),
    endTimeUnixNano: decimalNanoString.optional(),
    attributes: z.array(refinedKeyValue).optional(),
    droppedAttributesCount: z.number().int().min(0).optional(),
    events: z.array(refinedSpanEvent).optional(),
    droppedEventsCount: z.number().int().min(0).optional(),
    links: z.array(refinedSpanLink).optional(),
    droppedLinksCount: z.number().int().min(0).optional(),
    status: refinedStatus.optional(),
  })
  .passthrough();

// `spans` / `scopeSpans` are required arrays (empty allowed): without them the rest of
// the envelope is meaningless. This matches the generated base, which declares both required.
export const refinedScopeSpans = z
  .object({
    scope: refinedScope.optional(),
    spans: z.array(refinedSpan),
    schemaUrl: z.string().optional(),
  })
  .passthrough();

export const refinedResourceSpans = z
  .object({
    resource: refinedResource.optional(),
    scopeSpans: z.array(refinedScopeSpans),
    schemaUrl: z.string().optional(),
  })
  .passthrough();

export const refinedTracesData = z
  .object({ resourceSpans: z.array(refinedResourceSpans).optional() })
  .passthrough();

// grpc-gateway envelope: jaeger-query wraps GetTrace in {"result": TracesData}
// (see docs/rfc/0002-otel-native-jaeger-ui.md Backend response shape).
// Keep envelope handling separable so true streaming can be added without
// touching enrichment logic.
export const GetTraceResponseSchema = z.object({ result: refinedTracesData }).passthrough();

export type GetTraceResponse = z.infer<typeof GetTraceResponseSchema>;
export type TracesDataWire = z.infer<typeof refinedTracesData>;

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
    minStartTimeUnixNano: decimalNanoString.optional(),
    maxEndTimeUnixNano: decimalNanoString.optional(),
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
