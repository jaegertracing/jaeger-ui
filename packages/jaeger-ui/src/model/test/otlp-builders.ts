// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { parseOtelTrace } from '../../api/v3/parser';
import {
  refinedTracesData,
  type KeyValueWire,
  type ResourceSpansWire,
  type ScopeSpansWire,
  type SpanWire,
  type TracesDataWire,
} from '../../api/v3/schemas';
import { IOtelTrace, SpanKind, StatusCode } from '../../types/otel';
import { attributeValue, spanIDForWire } from './materializer-otlp';

type TAttributes = Readonly<Record<string, string | number | boolean>>;

/**
 * A brief span description for unit-test fixtures. IDs are readable names, such as 'root', that
 * become stable hex span IDs. `start` and event `time` are integer microsecond offsets from
 * FIXTURE_BASE_TIME, so 0 is the trace start. Event `time` uses the same clock as `start`; it is
 * not relative to its span. `start` defaults to 0 and `duration` to 1000.
 *
 * This builds wire data for the OTLP parser. For an already-parsed IOtelSpan, use
 * `utils/test/makeOtelSpan` instead.
 */
export interface IOtlpSpanSpec {
  id: string;
  parent?: string;
  name?: string;
  service?: string;
  kind?: SpanKind;
  start?: number;
  duration?: number;
  attributes?: TAttributes;
  events?: ReadonlyArray<{ name?: string; time: number; attributes?: TAttributes }>;
  links?: ReadonlyArray<{ id: string; traceId?: string; attributes?: TAttributes }>;
  status?: { code: StatusCode; message?: string };
  /** Backend diagnostics, sent as the reserved `@jaeger@warnings` attribute. */
  warnings?: ReadonlyArray<string>;
}

export interface IOtlpTraceOptions {
  traceId?: string;
  scope?: ScopeSpansWire['scope'];
  /** Attributes added to every resource after `service.name`. */
  resource?: TAttributes;
  /** Allow parents that are not in the fixture, for orphan-span cases. */
  allowMissingParents?: boolean;
}

/** Absolute start of every fixture trace, in microseconds since the Unix epoch. */
export const FIXTURE_BASE_TIME = 1_700_000_000_000_000;

const DEFAULT_TRACE_ID = 'abcdef0123456789abcdef0123456789';
const DEFAULT_SERVICE = 'service';
const BASE_MICROS = BigInt(FIXTURE_BASE_TIME);
const MAX_MICROS = BigInt(Number.MAX_SAFE_INTEGER);
const TRACE_ID = /^(?!0+$)[0-9a-f]{32}$/i;
const WARNINGS_KEY = '@jaeger@warnings';
const SERVICE_KEY = 'service.name';

const KIND_NUMBERS: Readonly<Record<string, number>> = {
  [SpanKind.UNSPECIFIED]: 0,
  [SpanKind.INTERNAL]: 1,
  [SpanKind.SERVER]: 2,
  [SpanKind.CLIENT]: 3,
  [SpanKind.PRODUCER]: 4,
  [SpanKind.CONSUMER]: 5,
};

const STATUS_NUMBERS: Readonly<Record<string, number>> = {
  [StatusCode.UNSET]: 0,
  [StatusCode.OK]: 1,
  [StatusCode.ERROR]: 2,
};

function invalid(owner: string, message: string): never {
  throw new Error(`Invalid ${owner}: ${message}`);
}

function fail(id: string, message: string): never {
  return invalid(`span ${id}`, message);
}

function offset(value: number, field: string, id: string): bigint {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail(id, `${field} must be a non-negative integer of microseconds`);
  }
  return BigInt(value);
}

/** Convert a microsecond offset from the fixture base to a nanosecond timestamp. */
function timestamp(micros: bigint, field: string, id: string): string {
  const absolute = BASE_MICROS + micros;
  if (absolute > MAX_MICROS) {
    fail(id, `${field} is beyond the safe microsecond range`);
  }
  return (absolute * 1000n).toString();
}

function traceIdFor(value: string, id: string): string {
  if (!TRACE_ID.test(value)) {
    fail(id, `trace ID ${value} must be a 32-character hex string and not all zeros`);
  }
  return value.toLowerCase();
}

function lookup(table: Readonly<Record<string, number>>, value: string, field: string, id: string): number {
  if (!Object.hasOwn(table, value)) {
    fail(id, `unknown ${field} ${String(value)}`);
  }
  return table[value];
}

function toAttributes(attributes: TAttributes = {}, owner: string, reserved?: string): KeyValueWire[] {
  return Object.entries(attributes).map(([key, value]) => {
    if (key === reserved) {
      invalid(owner, `attribute ${key} is reserved`);
    }
    if (!['string', 'number', 'boolean'].includes(typeof value)) {
      invalid(owner, `attribute ${key} must be a string, number or boolean`);
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
      invalid(owner, `attribute ${key} must be a finite number`);
    }
    return { key, value: attributeValue(value) };
  });
}

/** Build a full OTLP span from a brief description. The same input always yields the same span. */
export function makeOtlpSpan(spec: IOtlpSpanSpec, traceId: string = DEFAULT_TRACE_ID): SpanWire {
  const { id, parent, name = 'operation', kind, start = 0, duration = 1000, status } = spec;
  const wireTraceId = traceIdFor(traceId, id);
  const startMicros = offset(start, 'start', id);
  const spanId = spanIDForWire(id);
  if (parent !== undefined && spanIDForWire(parent) === spanId) {
    fail(id, 'a span cannot be its own parent');
  }
  return {
    traceId: wireTraceId,
    spanId,
    ...(parent === undefined ? {} : { parentSpanId: spanIDForWire(parent) }),
    name,
    ...(kind === undefined ? {} : { kind: lookup(KIND_NUMBERS, kind, 'kind', id) }),
    startTimeUnixNano: timestamp(startMicros, 'start', id),
    endTimeUnixNano: timestamp(startMicros + offset(duration, 'duration', id), 'end', id),
    attributes: [
      ...toAttributes(spec.attributes, `span ${id}`, WARNINGS_KEY),
      ...(spec.warnings === undefined
        ? []
        : [
            {
              key: WARNINGS_KEY,
              value: { arrayValue: { values: spec.warnings.map(warning => ({ stringValue: warning })) } },
            },
          ]),
    ],
    events: (spec.events ?? []).map(event => ({
      ...(event.name === undefined ? {} : { name: event.name }),
      timeUnixNano: timestamp(offset(event.time, 'event time', id), 'event time', id),
      attributes: toAttributes(event.attributes, `span ${id}`),
    })),
    links: (spec.links ?? []).map(link => ({
      traceId: link.traceId === undefined ? wireTraceId : traceIdFor(link.traceId, id),
      spanId: spanIDForWire(link.id),
      attributes: toAttributes(link.attributes, `span ${id}`),
    })),
    status:
      status === undefined
        ? {}
        : {
            code: lookup(STATUS_NUMBERS, status.code, 'status code', id),
            ...(status.message === undefined ? {} : { message: status.message }),
          },
  };
}

/**
 * Build OTLP wire data from brief span descriptions, in input order. Consecutive spans of the
 * same service share a resource, so the wire order, and the parser's order for spans with equal
 * start times, matches the input.
 */
export function makeOtlpTrace(
  specs: ReadonlyArray<IOtlpSpanSpec>,
  { traceId = DEFAULT_TRACE_ID, scope, resource, allowMissingParents = false }: IOtlpTraceOptions = {}
): TracesDataWire {
  const spans = specs.map(spec => makeOtlpSpan(spec, traceId));
  const spanIds = new Set<string>();
  spans.forEach((span, i) => {
    if (spanIds.has(span.spanId)) {
      fail(specs[i].id, 'duplicate span ID in trace fixture');
    }
    spanIds.add(span.spanId);
  });
  if (!allowMissingParents) {
    specs.forEach(({ id, parent }, i) => {
      if (parent !== undefined && !spanIds.has(spans[i].parentSpanId!)) {
        fail(id, `parent ${parent} is not in the fixture; pass allowMissingParents for an orphan`);
      }
    });
  }

  const resourceAttributes = toAttributes(resource, 'trace resource', SERVICE_KEY);
  const resourceSpans: ResourceSpansWire[] = [];
  let lastService: string | undefined;
  specs.forEach(({ service = DEFAULT_SERVICE }, i) => {
    if (service !== lastService) {
      resourceSpans.push({
        resource: {
          attributes: [{ key: SERVICE_KEY, value: { stringValue: service } }, ...resourceAttributes],
        },
        scopeSpans: [{ ...(scope === undefined ? {} : { scope }), spans: [] }],
      });
      lastService = service;
    }
    resourceSpans[resourceSpans.length - 1].scopeSpans[0].spans.push(spans[i]);
  });
  return { resourceSpans };
}

/** Build an IOtelTrace from brief span descriptions through the production OTLP parser. */
export function makeTrace(specs: ReadonlyArray<IOtlpSpanSpec>, options?: IOtlpTraceOptions): IOtelTrace {
  const trace = parseOtelTrace(refinedTracesData.parse(makeOtlpTrace(specs, options)));
  if (!trace) {
    throw new Error('Trace fixture has no spans');
  }
  return trace;
}
