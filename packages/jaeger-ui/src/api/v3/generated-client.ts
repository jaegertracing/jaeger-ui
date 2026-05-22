// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
//
// This file is AUTO-GENERATED from the Jaeger OpenAPI spec.
// Do not edit manually. Regenerate using: npm run generate:api-types

import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core';
import { z } from 'zod';

type opentelemetry_proto_common_v1_AnyValue = Partial<{
  string_value: string;
  bool_value: boolean;
  int_value: string;
  double_value: number;
  array_value: opentelemetry_proto_common_v1_ArrayValue;
  kvlist_value: opentelemetry_proto_common_v1_KeyValueList;
  bytes_value: string;
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
  .object({ parent: z.string(), child: z.string(), call_count: z.string() })
  .passthrough();
const jaeger_api_v3_DependenciesResponse = z
  .object({ dependencies: z.array(jaeger_api_v3_Dependency) })
  .passthrough();
const google_protobuf_Any = z.object({ '@type': z.string() }).passthrough();
const google_rpc_Status = z
  .object({
    code: z.number().int(),
    message: z.string(),
    details: z.array(google_protobuf_Any),
  })
  .passthrough();
const jaeger_api_v3_Operation = z.object({ name: z.string(), span_kind: z.string() }).passthrough();
const jaeger_api_v3_GetOperationsResponse = z
  .object({ operations: z.array(jaeger_api_v3_Operation) })
  .passthrough();
const jaeger_api_v3_GetServicesResponse = z.object({ services: z.array(z.string()) }).passthrough();
const opentelemetry_proto_common_v1_ArrayValue: z.ZodType<opentelemetry_proto_common_v1_ArrayValue> = z.lazy(
  () => z.object({ values: z.array(opentelemetry_proto_common_v1_AnyValue) }).passthrough()
);
const opentelemetry_proto_common_v1_KeyValueList: z.ZodType<opentelemetry_proto_common_v1_KeyValueList> =
  z.lazy(() => z.object({ values: z.array(opentelemetry_proto_common_v1_KeyValue) }).passthrough());
const opentelemetry_proto_common_v1_AnyValue: z.ZodType<opentelemetry_proto_common_v1_AnyValue> = z.lazy(() =>
  z
    .object({
      string_value: z.string(),
      bool_value: z.boolean(),
      int_value: z.string(),
      double_value: z.number(),
      array_value: opentelemetry_proto_common_v1_ArrayValue,
      kvlist_value: opentelemetry_proto_common_v1_KeyValueList,
      bytes_value: z.string(),
    })
    .passthrough()
);
const opentelemetry_proto_common_v1_KeyValue: z.ZodType<opentelemetry_proto_common_v1_KeyValue> = z.lazy(() =>
  z
    .object({
      key: z.string(),
      value: opentelemetry_proto_common_v1_AnyValue,
    })
    .passthrough()
);
const opentelemetry_proto_resource_v1_Resource = z
  .object({
    attributes: z.array(opentelemetry_proto_common_v1_KeyValue),
    dropped_attributes_count: z.number().int(),
  })
  .passthrough();
const opentelemetry_proto_common_v1_InstrumentationScope = z
  .object({
    name: z.string(),
    version: z.string(),
    attributes: z.array(opentelemetry_proto_common_v1_KeyValue),
    dropped_attributes_count: z.number().int(),
  })
  .passthrough();
const opentelemetry_proto_trace_v1_Span_Event = z
  .object({
    time_unix_nano: z.string(),
    name: z.string(),
    attributes: z.array(opentelemetry_proto_common_v1_KeyValue),
    dropped_attributes_count: z.number().int(),
  })
  .passthrough();
const opentelemetry_proto_trace_v1_Span_Link = z
  .object({
    trace_id: z.string(),
    span_id: z.string(),
    trace_state: z.string(),
    attributes: z.array(opentelemetry_proto_common_v1_KeyValue),
    dropped_attributes_count: z.number().int(),
    flags: z.number().int(),
  })
  .passthrough();
const opentelemetry_proto_trace_v1_Status = z
  .object({ message: z.string(), code: z.number().int() })
  .passthrough();
const opentelemetry_proto_trace_v1_Span = z
  .object({
    trace_id: z.string(),
    span_id: z.string(),
    trace_state: z.string(),
    parent_span_id: z.string(),
    flags: z.number().int(),
    name: z.string(),
    kind: z.number().int(),
    start_time_unix_nano: z.string(),
    end_time_unix_nano: z.string(),
    attributes: z.array(opentelemetry_proto_common_v1_KeyValue),
    dropped_attributes_count: z.number().int(),
    events: z.array(opentelemetry_proto_trace_v1_Span_Event),
    dropped_events_count: z.number().int(),
    links: z.array(opentelemetry_proto_trace_v1_Span_Link),
    dropped_links_count: z.number().int(),
    status: opentelemetry_proto_trace_v1_Status,
  })
  .passthrough();
const opentelemetry_proto_trace_v1_ScopeSpans = z
  .object({
    scope: opentelemetry_proto_common_v1_InstrumentationScope,
    spans: z.array(opentelemetry_proto_trace_v1_Span),
    schema_url: z.string(),
  })
  .passthrough();
const opentelemetry_proto_trace_v1_ResourceSpans = z
  .object({
    resource: opentelemetry_proto_resource_v1_Resource,
    scope_spans: z.array(opentelemetry_proto_trace_v1_ScopeSpans),
    schema_url: z.string(),
  })
  .passthrough();
const opentelemetry_proto_trace_v1_TracesData = z
  .object({
    resource_spans: z.array(opentelemetry_proto_trace_v1_ResourceSpans),
  })
  .passthrough();
const jaeger_api_v3_TraceQueryParameters = z
  .object({
    service_name: z.string(),
    operation_name: z.string(),
    attributes: z.string(),
    start_time_min: z.string().datetime({ offset: true }),
    start_time_max: z.string().datetime({ offset: true }),
    duration_min: z.string().regex(/^-?(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,9})?s$/),
    duration_max: z.string().regex(/^-?(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,9})?s$/),
    search_depth: z.number().int(),
    raw_traces: z.boolean(),
  })
  .passthrough();
const jaeger_api_v3_FindTracesRequest = z.object({ query: jaeger_api_v3_TraceQueryParameters }).passthrough();

export const schemas = {
  jaeger_api_v3_Dependency,
  jaeger_api_v3_DependenciesResponse,
  google_protobuf_Any,
  google_rpc_Status,
  jaeger_api_v3_Operation,
  jaeger_api_v3_GetOperationsResponse,
  jaeger_api_v3_GetServicesResponse,
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
  jaeger_api_v3_TraceQueryParameters,
  jaeger_api_v3_FindTracesRequest,
};

/*
const endpoints = makeApi([
  {
    method: "get",
    path: "/api/v3/dependencies",
    alias: "QueryService_GetDependencies",
    requestFormat: "json",
    parameters: [
      {
        name: "start_time",
        type: "Query",
        schema: z.string().datetime({ offset: true }).optional(),
      },
      {
        name: "end_time",
        type: "Query",
        schema: z.string().datetime({ offset: true }).optional(),
      },
    ],
    response: jaeger_api_v3_DependenciesResponse,
  },
  {
    method: "get",
    path: "/api/v3/operations",
    alias: "QueryService_GetOperations",
    description: `GetOperations returns operation names.`,
    requestFormat: "json",
    parameters: [
      {
        name: "service",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "span_kind",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: jaeger_api_v3_GetOperationsResponse,
  },
  {
    method: "get",
    path: "/api/v3/services",
    alias: "QueryService_GetServices",
    description: `GetServices returns service names.`,
    requestFormat: "json",
    response: jaeger_api_v3_GetServicesResponse,
  },
  {
    method: "get",
    path: "/api/v3/traces",
    alias: "QueryService_FindTraces",
    description: `FindTraces searches for traces.
 See GetTrace for JSON unmarshalling.`,
    requestFormat: "json",
    parameters: [
      {
        name: "query.service_name",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "query.operation_name",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "query.start_time_min",
        type: "Query",
        schema: z.string().datetime({ offset: true }).optional(),
      },
      {
        name: "query.start_time_max",
        type: "Query",
        schema: z.string().datetime({ offset: true }).optional(),
      },
      {
        name: "query.duration_min",
        type: "Query",
        schema: z
          .string()
          .regex(/^-?(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,9})?s$/)
          .optional(),
      },
      {
        name: "query.duration_max",
        type: "Query",
        schema: z
          .string()
          .regex(/^-?(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,9})?s$/)
          .optional(),
      },
      {
        name: "query.search_depth",
        type: "Query",
        schema: z.number().int().optional(),
      },
      {
        name: "query.raw_traces",
        type: "Query",
        schema: z.boolean().optional(),
      },
    ],
    response: opentelemetry_proto_trace_v1_TracesData,
  },
  {
    method: "post",
    path: "/api/v3/traces",
    alias: "QueryService_FindTracesPost",
    description: `FindTraces searches for traces.
 See GetTrace for JSON unmarshalling.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: jaeger_api_v3_FindTracesRequest,
      },
    ],
    response: opentelemetry_proto_trace_v1_TracesData,
  },
  {
    method: "get",
    path: "/api/v3/traces/:trace_id",
    alias: "QueryService_GetTrace",
    description: `GetTrace returns a single trace.
 Note that the JSON response over HTTP is wrapped into result envelope &quot;{&quot;result&quot;: ...}&quot;
 It means that the JSON response cannot be directly unmarshalled using JSONPb.
 This can be fixed by first parsing into user-defined envelope with standard JSON library
 or string manipulation to remove the envelope. Alternatively generate objects using OpenAPI.`,
    requestFormat: "json",
    parameters: [
      {
        name: "trace_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "start_time",
        type: "Query",
        schema: z.string().datetime({ offset: true }).optional(),
      },
      {
        name: "end_time",
        type: "Query",
        schema: z.string().datetime({ offset: true }).optional(),
      },
      {
        name: "raw_traces",
        type: "Query",
        schema: z.boolean().optional(),
      },
    ],
    response: opentelemetry_proto_trace_v1_TracesData,
  },
]);
*/

// export const api = new Zodios(endpoints);

/*
export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
*/

// Export commonly used schemas individually for convenience
export { jaeger_api_v3_GetServicesResponse as ServicesResponseSchema };
export { jaeger_api_v3_GetOperationsResponse as OperationsResponseSchema };
export { jaeger_api_v3_Operation as OperationSchema };
