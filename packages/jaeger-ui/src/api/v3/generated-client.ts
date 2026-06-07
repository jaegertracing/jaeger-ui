// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
//
// This file is AUTO-GENERATED from the Jaeger OpenAPI spec.
// Do not edit manually. Regenerate using: npm run generate:api-types

import { z } from 'zod';

type opentelemetry_proto_common_v1_AnyValue = Partial<{
  stringValue: string;
  boolValue: boolean;
  intValue: string;
  doubleValue: number;
  arrayValue: opentelemetry_proto_common_v1_ArrayValue;
  kvlistValue: opentelemetry_proto_common_v1_KeyValueList;
  bytesValue: string;
}>;
type opentelemetry_proto_common_v1_ArrayValue = Partial<{
  values: Array<opentelemetry_proto_common_v1_AnyValue>;
}>;
type opentelemetry_proto_common_v1_KeyValue = Partial<{
  key: string;
  value: opentelemetry_proto_common_v1_AnyValue;
}>;
type opentelemetry_proto_common_v1_KeyValueList = Partial<{
  values: Array<opentelemetry_proto_common_v1_KeyValue>;
}>;

const jaeger_api_v3_Dependency = z
  .object({ parent: z.string(), child: z.string(), callCount: z.string() })
  .passthrough();
const jaeger_api_v3_DependenciesResponse = z
  .object({ dependencies: z.array(jaeger_api_v3_Dependency) })
  .passthrough();
const google_protobuf_Any = z.object({ '@type': z.string() }).partial().passthrough();
const google_rpc_Status = z
  .object({
    code: z.number().int(),
    message: z.string(),
    details: z.array(google_protobuf_Any),
  })
  .partial()
  .passthrough();
const jaeger_api_v3_Operation = z.object({ name: z.string(), spanKind: z.string() }).passthrough();
const jaeger_api_v3_GetOperationsResponse = z
  .object({ operations: z.array(jaeger_api_v3_Operation) })
  .passthrough();
const jaeger_api_v3_GetServicesResponse = z.object({ services: z.array(z.string()) }).passthrough();
const jaeger_api_v3_ServiceSummary = z
  .object({
    name: z.string(),
    spanCount: z.number().int().optional(),
    errorSpanCount: z.number().int().optional(),
  })
  .passthrough();
const jaeger_api_v3_TraceSummary = z
  .object({
    traceId: z.string(),
    rootServiceName: z.string().optional(),
    rootOperationName: z.string().optional(),
    minStartTimeUnixNano: z.string().optional(),
    maxEndTimeUnixNano: z.string().optional(),
    spanCount: z.number().int().optional(),
    errorSpanCount: z.number().int().optional(),
    orphanSpanCount: z.number().int().optional(),
    services: z.array(jaeger_api_v3_ServiceSummary).optional(),
  })
  .passthrough();
const jaeger_api_v3_FindTraceSummariesResponse = z
  .object({ summaries: z.array(jaeger_api_v3_TraceSummary) })
  .partial()
  .passthrough();
const jaeger_api_v3_TraceQueryParameters = z
  .object({
    serviceName: z.string(),
    operationName: z.string(),
    attributes: z.string(),
    startTimeMin: z.string().datetime({ offset: true }),
    startTimeMax: z.string().datetime({ offset: true }),
    durationMin: z.string().regex(/^-?(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,9})?s$/),
    durationMax: z.string().regex(/^-?(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,9})?s$/),
    searchDepth: z.number().int(),
    rawTraces: z.boolean(),
  })
  .partial()
  .passthrough();
const jaeger_api_v3_FindTraceSummariesRequest = z
  .object({ query: jaeger_api_v3_TraceQueryParameters })
  .partial()
  .passthrough();
const opentelemetry_proto_common_v1_ArrayValue: z.ZodType<opentelemetry_proto_common_v1_ArrayValue> = z.lazy(
  () =>
    z
      .object({ values: z.array(opentelemetry_proto_common_v1_AnyValue) })
      .partial()
      .passthrough()
);
const opentelemetry_proto_common_v1_KeyValueList: z.ZodType<opentelemetry_proto_common_v1_KeyValueList> =
  z.lazy(() =>
    z
      .object({ values: z.array(opentelemetry_proto_common_v1_KeyValue) })
      .partial()
      .passthrough()
  );
const opentelemetry_proto_common_v1_AnyValue: z.ZodType<opentelemetry_proto_common_v1_AnyValue> = z.lazy(() =>
  z
    .object({
      stringValue: z.string(),
      boolValue: z.boolean(),
      intValue: z.string(),
      doubleValue: z.number(),
      arrayValue: opentelemetry_proto_common_v1_ArrayValue,
      kvlistValue: opentelemetry_proto_common_v1_KeyValueList,
      bytesValue: z.string(),
    })
    .partial()
    .passthrough()
);
const opentelemetry_proto_common_v1_KeyValue: z.ZodType<opentelemetry_proto_common_v1_KeyValue> = z.lazy(() =>
  z
    .object({
      key: z.string(),
      value: opentelemetry_proto_common_v1_AnyValue,
    })
    .partial()
    .passthrough()
);
const opentelemetry_proto_resource_v1_Resource = z
  .object({
    attributes: z.array(opentelemetry_proto_common_v1_KeyValue),
    droppedAttributesCount: z.number().int(),
  })
  .partial()
  .passthrough();
const opentelemetry_proto_common_v1_InstrumentationScope = z
  .object({
    name: z.string(),
    version: z.string(),
    attributes: z.array(opentelemetry_proto_common_v1_KeyValue),
    droppedAttributesCount: z.number().int(),
  })
  .partial()
  .passthrough();
const opentelemetry_proto_trace_v1_Span_Event = z
  .object({
    timeUnixNano: z.string(),
    name: z.string(),
    attributes: z.array(opentelemetry_proto_common_v1_KeyValue),
    droppedAttributesCount: z.number().int(),
  })
  .partial()
  .passthrough();
const opentelemetry_proto_trace_v1_Span_Link = z
  .object({
    traceId: z.string(),
    spanId: z.string(),
    traceState: z.string(),
    attributes: z.array(opentelemetry_proto_common_v1_KeyValue),
    droppedAttributesCount: z.number().int(),
    flags: z.number().int(),
  })
  .partial()
  .passthrough();
const opentelemetry_proto_trace_v1_Status = z
  .object({ message: z.string(), code: z.number().int() })
  .partial()
  .passthrough();
const opentelemetry_proto_trace_v1_Span = z
  .object({
    traceId: z.string(),
    spanId: z.string(),
    traceState: z.string(),
    parentSpanId: z.string(),
    flags: z.number().int(),
    name: z.string(),
    kind: z.number().int(),
    startTimeUnixNano: z.string(),
    endTimeUnixNano: z.string(),
    attributes: z.array(opentelemetry_proto_common_v1_KeyValue),
    droppedAttributesCount: z.number().int(),
    events: z.array(opentelemetry_proto_trace_v1_Span_Event),
    droppedEventsCount: z.number().int(),
    links: z.array(opentelemetry_proto_trace_v1_Span_Link),
    droppedLinksCount: z.number().int(),
    status: opentelemetry_proto_trace_v1_Status,
  })
  .partial()
  .passthrough();
const opentelemetry_proto_trace_v1_ScopeSpans = z
  .object({
    scope: opentelemetry_proto_common_v1_InstrumentationScope,
    spans: z.array(opentelemetry_proto_trace_v1_Span),
    schemaUrl: z.string(),
  })
  .partial()
  .passthrough();
const opentelemetry_proto_trace_v1_ResourceSpans = z
  .object({
    resource: opentelemetry_proto_resource_v1_Resource,
    scopeSpans: z.array(opentelemetry_proto_trace_v1_ScopeSpans),
    schemaUrl: z.string(),
  })
  .partial()
  .passthrough();
const opentelemetry_proto_trace_v1_TracesData = z
  .object({
    resourceSpans: z.array(opentelemetry_proto_trace_v1_ResourceSpans),
  })
  .partial()
  .passthrough();
const jaeger_api_v3_FindTracesRequest = z
  .object({ query: jaeger_api_v3_TraceQueryParameters })
  .partial()
  .passthrough();

export const schemas = {
  jaeger_api_v3_Dependency,
  jaeger_api_v3_DependenciesResponse,
  google_protobuf_Any,
  google_rpc_Status,
  jaeger_api_v3_Operation,
  jaeger_api_v3_GetOperationsResponse,
  jaeger_api_v3_GetServicesResponse,
  jaeger_api_v3_ServiceSummary,
  jaeger_api_v3_TraceSummary,
  jaeger_api_v3_FindTraceSummariesResponse,
  jaeger_api_v3_TraceQueryParameters,
  jaeger_api_v3_FindTraceSummariesRequest,
  opentelemetry_proto_common_v1_ArrayValue,
  opentelemetry_proto_common_v1_KeyValueList,
  opentelemetry_proto_common_v1_AnyValue,
  opentelemetry_proto_common_v1_KeyValue,
  opentelemetry_proto_resource_v1_Resource,
  opentelemetry_proto_common_v1_InstrumentationScope,
  opentelemetry_proto_trace_v1_Span_Event,
  opentelemetry_proto_trace_v1_Span_Link,
  opentelemetry_proto_trace_v1_Status,
  opentelemetry_proto_trace_v1_Span,
  opentelemetry_proto_trace_v1_ScopeSpans,
  opentelemetry_proto_trace_v1_ResourceSpans,
  opentelemetry_proto_trace_v1_TracesData,
  jaeger_api_v3_FindTracesRequest,
};
