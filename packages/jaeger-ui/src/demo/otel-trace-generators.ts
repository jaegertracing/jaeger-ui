// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type {
  KeyValueWire,
  ResourceSpansWire,
  ScopeSpansWire,
  SpanWire,
  TracesDataWire,
} from '../api/v3/schemas';
import { attributeValue, spanIDForWire } from '../model/test/materializer-otlp';
import { SpanKind, StatusCode } from '../types/otel';

type TAttributes = Readonly<Record<string, string | number | boolean>>;

/**
 * A brief span description. IDs are readable names, such as 'root', that become stable hex span IDs.
 * Times are integer microseconds; the start defaults to 1000 and the duration to 1000.
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
}

interface IOtlpTraceOptions {
  traceId?: string;
  scope?: ScopeSpansWire['scope'];
}

const DEFAULT_TRACE_ID = 'abcdef0123456789abcdef0123456789';
const DEFAULT_SERVICE = 'service';

const KIND_NUMBERS: Record<SpanKind, number> = {
  [SpanKind.UNSPECIFIED]: 0,
  [SpanKind.INTERNAL]: 1,
  [SpanKind.SERVER]: 2,
  [SpanKind.CLIENT]: 3,
  [SpanKind.PRODUCER]: 4,
  [SpanKind.CONSUMER]: 5,
};

const STATUS_NUMBERS: Record<StatusCode, number> = {
  [StatusCode.UNSET]: 0,
  [StatusCode.OK]: 1,
  [StatusCode.ERROR]: 2,
};

function micros(value: number, field: string, id: string): bigint {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid ${field} for span ${id}: expected non-negative integer microseconds`);
  }
  return BigInt(value);
}

function nanos(value: bigint): string {
  return (value * 1000n).toString();
}

function toAttributes(attributes: TAttributes = {}): KeyValueWire[] {
  return Object.entries(attributes).map(([key, value]) => ({ key, value: attributeValue(value) }));
}

/** Build a full OTLP span from a brief description. The same input always yields the same span. */
export function makeOtlpSpan(spec: IOtlpSpanSpec, traceId: string = DEFAULT_TRACE_ID): SpanWire {
  const { id, parent, name = 'operation', kind, start = 1000, duration = 1000, status } = spec;
  const startMicros = micros(start, 'start', id);
  return {
    traceId,
    spanId: spanIDForWire(id),
    ...(parent === undefined ? {} : { parentSpanId: spanIDForWire(parent) }),
    name,
    ...(kind === undefined ? {} : { kind: KIND_NUMBERS[kind] }),
    startTimeUnixNano: nanos(startMicros),
    endTimeUnixNano: nanos(startMicros + micros(duration, 'duration', id)),
    attributes: toAttributes(spec.attributes),
    events: (spec.events ?? []).map(event => ({
      ...(event.name === undefined ? {} : { name: event.name }),
      timeUnixNano: nanos(micros(event.time, 'event time', id)),
      attributes: toAttributes(event.attributes),
    })),
    links: (spec.links ?? []).map(link => ({
      traceId: link.traceId ?? traceId,
      spanId: spanIDForWire(link.id),
      attributes: toAttributes(link.attributes),
    })),
    status:
      status === undefined
        ? {}
        : {
            code: STATUS_NUMBERS[status.code],
            ...(status.message === undefined ? {} : { message: status.message }),
          },
  };
}

/**
 * Build OTLP wire data from brief span descriptions. Spans are grouped into one resource per
 * service, in order of first appearance, and keep their input order within each resource.
 */
export function makeOtlpTrace(
  specs: ReadonlyArray<IOtlpSpanSpec>,
  { traceId = DEFAULT_TRACE_ID, scope }: IOtlpTraceOptions = {}
): TracesDataWire {
  const spanIds = new Set<string>();
  const byService = new Map<string, SpanWire[]>();
  for (const spec of specs) {
    const span = makeOtlpSpan(spec, traceId);
    if (spanIds.has(span.spanId)) {
      throw new Error(`Duplicate span id in trace fixture: ${spec.id}`);
    }
    spanIds.add(span.spanId);
    const service = spec.service ?? DEFAULT_SERVICE;
    const spans = byService.get(service);
    if (spans) {
      spans.push(span);
    } else {
      byService.set(service, [span]);
    }
  }

  const resourceSpans: ResourceSpansWire[] = [...byService].map(([service, spans]) => ({
    resource: { attributes: [{ key: 'service.name', value: { stringValue: service } }] },
    scopeSpans: [{ ...(scope === undefined ? {} : { scope }), spans }],
  }));
  return { resourceSpans };
}
