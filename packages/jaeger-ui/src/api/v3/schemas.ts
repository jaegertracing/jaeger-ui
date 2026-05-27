// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { schemas as generatedSchemas } from './generated-client';

/**
 * Zod schemas for Jaeger v3 API responses
 *
 * This implementation builds on top of the OpenAPI-generated schemas
 * from generated-client.ts, adding refinements for IDs, timestamps,
 * and internal structure validation while preserving the primary
 * source of truth.
 */

// --- Primitives ---

/**
 * Validates a 32-character hex trace ID.
 */
export const TraceIdSchema = z.string().regex(/^[0-9a-f]{32}$/i, 'Invalid trace ID: must be 32-char hex string');

/**
 * Validates a 16-character hex span ID.
 */
export const SpanIdSchema = z.string().regex(/^[0-9a-f]{16}$/i, 'Invalid span ID: must be 16-char hex string');

/**
 * Validates a numeric string representing unix nanoseconds.
 */
export const TimestampSchema = z.string().regex(/^\d+$/, 'Invalid timestamp: must be a numeric string');

// --- OTLP Refinements ---

/**
 * AnyValue remains the base generated version as it is a complex recursive structure.
 */
export const AnyValueSchema = generatedSchemas.opentelemetry_proto_common_v1_AnyValue;

/**
 * KeyValue refined with required key.
 */
export const KeyValueSchema = generatedSchemas.opentelemetry_proto_common_v1_KeyValue.and(
  z.object({
    key: z.string(),
  })
);

/**
 * Resource remains the base generated version.
 */
export const ResourceSchema = generatedSchemas.opentelemetry_proto_resource_v1_Resource;

/**
 * InstrumentationScope remains the base generated version.
 */
export const InstrumentationScopeSchema = generatedSchemas.opentelemetry_proto_common_v1_InstrumentationScope;

/**
 * Status remains the base generated version.
 */
export const StatusSchema = generatedSchemas.opentelemetry_proto_trace_v1_Status;

/**
 * SpanEvent refined with numeric timestamp validation.
 */
export const SpanEventSchema = generatedSchemas.opentelemetry_proto_trace_v1_Span_Event.extend({
  timeUnixNano: TimestampSchema,
});

/**
 * SpanLink refined with hex ID validation.
 */
export const SpanLinkSchema = generatedSchemas.opentelemetry_proto_trace_v1_Span_Link.extend({
  traceId: TraceIdSchema,
  spanId: SpanIdSchema,
});

/**
 * A Span refined with hex ID and numeric timestamp validation.
 */
export const SpanSchema = generatedSchemas.opentelemetry_proto_trace_v1_Span.extend({
  traceId: TraceIdSchema,
  spanId: SpanIdSchema,
  parentSpanId: SpanIdSchema.or(z.string().length(0)).optional(),
  startTimeUnixNano: TimestampSchema,
  endTimeUnixNano: TimestampSchema,
});

/**
 * A collection of Spans produced by an InstrumentationScope.
 */
export const ScopeSpansSchema = generatedSchemas.opentelemetry_proto_trace_v1_ScopeSpans.extend({
  spans: z.array(SpanSchema),
});

/**
 * A collection of ScopeSpans produced by a Resource.
 */
export const ResourceSpansSchema = generatedSchemas.opentelemetry_proto_trace_v1_ResourceSpans.extend({
  scopeSpans: z.array(ScopeSpansSchema),
});

/**
 * Root structure for OTLP trace data.
 */
export const TracesDataSchema = generatedSchemas.opentelemetry_proto_trace_v1_TracesData.extend({
  resourceSpans: z.array(ResourceSpansSchema),
});

// --- API Response Schemas ---

export const ServicesResponseSchema = generatedSchemas.jaeger_api_v3_GetServicesResponse.extend({
  services: z.array(z.string()),
});
export const OperationsResponseSchema = generatedSchemas.jaeger_api_v3_GetOperationsResponse.extend({
  operations: z.array(generatedSchemas.jaeger_api_v3_Operation),
});
export const OperationSchema = generatedSchemas.jaeger_api_v3_Operation.extend({
  name: z.string(),
});

// Type inference for internal logic and testing
export type IAnyValue = z.infer<typeof AnyValueSchema>;
export type IKeyValue = z.infer<typeof KeyValueSchema>;
export type IResource = z.infer<typeof ResourceSchema>;
export type IInstrumentationScope = z.infer<typeof InstrumentationScopeSchema>;
export type ISpan = z.infer<typeof SpanSchema>;
export type ITracesData = z.infer<typeof TracesDataSchema>;
