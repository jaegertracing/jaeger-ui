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

import { z } from 'zod';

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

// --- OTLP Core Structures (Recursive & Nested) ---

/**
 * AnyValue represents a value of any type.
 * It is a recursive structure used for attributes.
 */
export const AnyValueSchema: z.ZodType<any> = z.lazy(() =>
  z
    .object({
      stringValue: z.string().optional(),
      boolValue: z.boolean().optional(),
      intValue: z.string().optional(),
      doubleValue: z.number().optional(),
      arrayValue: z.object({ values: z.array(AnyValueSchema) }).optional(),
      kvlistValue: z.object({ values: z.array(z.lazy(() => KeyValueSchema)) }).optional(),
      bytesValue: z.string().optional(),
    })
    .passthrough()
);

/**
 * KeyValue is a key-value pair that is used to store attributes.
 */
export const KeyValueSchema = z
  .object({
    key: z.string(),
    value: AnyValueSchema,
  })
  .passthrough();

/**
 * Resource information.
 */
export const ResourceSchema = z
  .object({
    attributes: z.array(KeyValueSchema),
    droppedAttributesCount: z.number().int().optional(),
  })
  .passthrough();

/**
 * InstrumentationScope information.
 */
export const InstrumentationScopeSchema = z
  .object({
    name: z.string(),
    version: z.string().optional(),
    attributes: z.array(KeyValueSchema).optional(),
    droppedAttributesCount: z.number().int().optional(),
  })
  .passthrough();

/**
 * Status of a span.
 */
export const StatusSchema = z
  .object({
    code: z.number().int(),
    message: z.string().optional(),
  })
  .passthrough();

/**
 * Event recorded during a span's duration.
 */
export const SpanEventSchema = z
  .object({
    timeUnixNano: TimestampSchema,
    name: z.string(),
    attributes: z.array(KeyValueSchema),
    droppedAttributesCount: z.number().int().optional(),
  })
  .passthrough();

/**
 * Link to another span.
 */
export const SpanLinkSchema = z
  .object({
    traceId: TraceIdSchema,
    spanId: SpanIdSchema,
    traceState: z.string().optional(),
    attributes: z.array(KeyValueSchema),
    droppedAttributesCount: z.number().int().optional(),
    flags: z.number().int().optional(),
  })
  .passthrough();

/**
 * A Span represents a single operation within a trace.
 */
export const SpanSchema = z
  .object({
    traceId: TraceIdSchema,
    spanId: SpanIdSchema,
    traceState: z.string().optional(),
    parentSpanId: SpanIdSchema.or(z.string().length(0)).optional(),
    name: z.string(),
    kind: z.number().int(),
    startTimeUnixNano: TimestampSchema,
    endTimeUnixNano: TimestampSchema,
    attributes: z.array(KeyValueSchema),
    droppedAttributesCount: z.number().int().optional(),
    events: z.array(SpanEventSchema).optional(),
    droppedEventsCount: z.number().int().optional(),
    links: z.array(SpanLinkSchema).optional(),
    droppedLinksCount: z.number().int().optional(),
    status: StatusSchema.optional(),
  })
  .passthrough();

/**
 * A collection of Spans produced by an InstrumentationScope.
 */
export const ScopeSpansSchema = z
  .object({
    scope: InstrumentationScopeSchema.optional(),
    spans: z.array(SpanSchema),
    schemaUrl: z.string().optional(),
  })
  .passthrough();

/**
 * A collection of ScopeSpans produced by a Resource.
 */
export const ResourceSpansSchema = z
  .object({
    resource: ResourceSchema.optional(),
    scopeSpans: z.array(ScopeSpansSchema),
    schemaUrl: z.string().optional(),
  })
  .passthrough();

/**
 * Root structure for OTLP trace data.
 */
export const TracesDataSchema = z
  .object({
    resourceSpans: z.array(ResourceSpansSchema),
  })
  .passthrough();

// Type inference for internal logic and testing
export type IAnyValue = z.infer<typeof AnyValueSchema>;
export type IKeyValue = z.infer<typeof KeyValueSchema>;
export type IResource = z.infer<typeof ResourceSchema>;
export type IInstrumentationScope = z.infer<typeof InstrumentationScopeSchema>;
export type ISpan = z.infer<typeof SpanSchema>;
export type ITracesData = z.infer<typeof TracesDataSchema>;
