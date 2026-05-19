// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
//
// This file is AUTO-GENERATED from the Jaeger OpenAPI spec.
// Do not edit manually. Regenerate using: npm run generate:api-types

// import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core';
import { z } from 'zod';

type AnyValue = Partial<{
  stringValue: string;
  boolValue: boolean;
  intValue: string;
  doubleValue: number;
  arrayValue: ArrayValue;
  kvlistValue: KeyValueList;
  bytesValue: string;
}>;
type ArrayValue = Partial<{
  values: Array<AnyValue>;
}>;
type KeyValue = Partial<{
  key: string;
  value: AnyValue;
}>;
type KeyValueList = Partial<{
  values: Array<KeyValue>;
}>;

const Operation = z.object({ name: z.string(), spanKind: z.string() }).passthrough();
const GetOperationsResponse = z.object({ operations: z.array(Operation) }).passthrough();
const GoogleProtobufAny = z.object({ '@type': z.string() }).passthrough();
const Status = z
  .object({
    code: z.number().int().optional(),
    message: z.string().optional(),
    details: z.array(GoogleProtobufAny).optional(),
  })
  .passthrough();
const GetServicesResponse = z.object({ services: z.array(z.string()) }).passthrough();
const ArrayValue: z.ZodType<ArrayValue> = z.lazy(() =>
  z.object({ values: z.array(AnyValue).optional() }).passthrough()
);
const KeyValueList: z.ZodType<KeyValueList> = z.lazy(() =>
  z.object({ values: z.array(KeyValue).optional() }).passthrough()
);
const AnyValue: z.ZodType<AnyValue> = z.lazy(() =>
  z
    .object({
      stringValue: z.string().optional(),
      boolValue: z.boolean().optional(),
      intValue: z.string().optional(),
      doubleValue: z.number().optional(),
      arrayValue: ArrayValue.optional(),
      kvlistValue: KeyValueList.optional(),
      bytesValue: z.string().optional(),
    })
    .passthrough()
);
const KeyValue: z.ZodType<KeyValue> = z.lazy(() =>
  z.object({ key: z.string().optional(), value: AnyValue.optional() }).passthrough()
);
const Resource = z
  .object({ attributes: z.array(KeyValue).optional(), droppedAttributesCount: z.number().int().optional() })
  .passthrough();
const InstrumentationScope = z
  .object({
    name: z.string().optional(),
    version: z.string().optional(),
    attributes: z.array(KeyValue).optional(),
    droppedAttributesCount: z.number().int().optional(),
  })
  .passthrough();
const Span_Event = z
  .object({
    timeUnixNano: z.string().optional(),
    name: z.string().optional(),
    attributes: z.array(KeyValue).optional(),
    droppedAttributesCount: z.number().int().optional(),
  })
  .passthrough();
const Span_Link = z
  .object({
    traceId: z.string().optional(),
    spanId: z.string().optional(),
    traceState: z.string().optional(),
    attributes: z.array(KeyValue).optional(),
    droppedAttributesCount: z.number().int().optional(),
    flags: z.number().int().optional(),
  })
  .passthrough();
const Span = z
  .object({
    traceId: z.string(),
    spanId: z.string(),
    traceState: z.string().optional(),
    parentSpanId: z.string().optional(),
    flags: z.number().int().optional(),
    name: z.string(),
    kind: z.number().int(),
    startTimeUnixNano: z.string(),
    endTimeUnixNano: z.string(),
    attributes: z.array(KeyValue).optional(),
    droppedAttributesCount: z.number().int().optional(),
    events: z.array(Span_Event).optional(),
    droppedEventsCount: z.number().int().optional(),
    links: z.array(Span_Link).optional(),
    droppedLinksCount: z.number().int().optional(),
    status: Status,
  })
  .passthrough();
const ScopeSpans = z
  .object({ scope: InstrumentationScope.optional(), spans: z.array(Span), schemaUrl: z.string().optional() })
  .passthrough();
const ResourceSpans = z
  .object({
    resource: Resource.optional(),
    scopeSpans: z.array(ScopeSpans),
    schemaUrl: z.string().optional(),
  })
  .passthrough();
const TracesData = z.object({ resourceSpans: z.array(ResourceSpans) }).passthrough();

export const schemas = {
  Operation,
  GetOperationsResponse,
  GoogleProtobufAny,
  Status,
  GetServicesResponse,
  ArrayValue,
  KeyValueList,
  AnyValue,
  KeyValue,
  Resource,
  InstrumentationScope,
  Span_Event,
  Span_Link,
  Span,
  ScopeSpans,
  ResourceSpans,
  TracesData,
};

/*
const endpoints = makeApi([
  {
    method: 'get',
    path: '/api/v3/operations',
    alias: 'QueryService_GetOperations',
    description: `GetOperations returns operation names.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'service',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'spanKind',
        type: 'Query',
        schema: z.string().optional(),
      },
    ],
    response: GetOperationsResponse,
  },
  {
    method: 'get',
    path: '/api/v3/services',
    alias: 'QueryService_GetServices',
    description: `GetServices returns service names.`,
    requestFormat: 'json',
    response: GetServicesResponse,
  },
  {
    method: 'get',
    path: '/api/v3/traces',
    alias: 'QueryService_FindTraces',
    description: `FindTraces searches for traces.
 See GetTrace for JSON unmarshalling.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'query.serviceName',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'query.operationName',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'query.startTimeMin',
        type: 'Query',
        schema: z.string().datetime({ offset: true }).optional(),
      },
      {
        name: 'query.startTimeMax',
        type: 'Query',
        schema: z.string().datetime({ offset: true }).optional(),
      },
      {
        name: 'query.durationMin',
        type: 'Query',
        schema: z
          .string()
          .regex(/^-?(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,9})?s$/)
          .optional(),
      },
      {
        name: 'query.durationMax',
        type: 'Query',
        schema: z
          .string()
          .regex(/^-?(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,9})?s$/)
          .optional(),
      },
      {
        name: 'query.searchDepth',
        type: 'Query',
        schema: z.number().int().optional(),
      },
      {
        name: 'query.rawTraces',
        type: 'Query',
        schema: z.boolean().optional(),
      },
    ],
    response: TracesData,
  },
  {
    method: 'get',
    path: '/api/v3/traces/:traceId',
    alias: 'QueryService_GetTrace',
    description: `GetTrace returns a single trace.
 Note that the JSON response over HTTP is wrapped into result envelope &quot;{&quot;result&quot;: ...}&quot;
 It means that the JSON response cannot be directly unmarshalled using JSONPb.
 This can be fixed by first parsing into user-defined envelope with standard JSON library
 or string manipulation to remove the envelope. Alternatively generate objects using OpenAPI.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'traceId',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'startTime',
        type: 'Query',
        schema: z.string().datetime({ offset: true }).optional(),
      },
      {
        name: 'endTime',
        type: 'Query',
        schema: z.string().datetime({ offset: true }).optional(),
      },
      {
        name: 'rawTraces',
        type: 'Query',
        schema: z.boolean().optional(),
      },
    ],
    response: TracesData,
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
export { GetServicesResponse as ServicesResponseSchema };
export { GetOperationsResponse as OperationsResponseSchema };
export { Operation as OperationSchema };
