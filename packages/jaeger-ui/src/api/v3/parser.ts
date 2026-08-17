// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * OTLP trace parser.
 *
 * Converts the OTLP `TracesData` returned by `/api/v3/traces/{id}` into the
 * enriched `IOtelTrace` the UI consumes — the v3-native equivalent of
 * `transformTraceData` + the facade layer (which it is intended to replace).
 *
 * Enrichment performed here: parent/child wiring, depth, relative timing,
 * inbound links, per-service span counts, roots, orphan count, and the
 * trace-level name/title/emoji.
 */

import { getTraceEmoji } from '../../model/trace-viewer';
import {
  AttributeValue,
  IAttribute,
  ILink,
  IOtelSpan,
  IOtelTrace,
  IResource,
  IScope,
  IStatus,
  SpanKind,
  StatusCode,
} from '../../types/otel';
import { Microseconds } from '../../types/units';

// ---- OTLP wire types (the subset this parser consumes) ----

interface IOtlpAnyValue {
  stringValue?: string;
  boolValue?: boolean;
  intValue?: string;
  doubleValue?: number;
  bytesValue?: string;
  arrayValue?: { values?: IOtlpAnyValue[] };
  kvlistValue?: { values?: IOtlpKeyValue[] };
}

interface IOtlpKeyValue {
  key?: string;
  value?: IOtlpAnyValue;
}

interface IOtlpSpan {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  name?: string;
  kind?: number;
  startTimeUnixNano?: string;
  endTimeUnixNano?: string;
  attributes?: IOtlpKeyValue[];
  events?: { timeUnixNano?: string; name?: string; attributes?: IOtlpKeyValue[] }[];
  links?: { traceId?: string; spanId?: string; attributes?: IOtlpKeyValue[] }[];
  status?: { code?: number; message?: string };
}

interface IOtlpScopeSpans {
  scope?: { name?: string; version?: string; attributes?: IOtlpKeyValue[] };
  spans?: IOtlpSpan[];
}

interface IOtlpResourceSpans {
  resource?: { attributes?: IOtlpKeyValue[] };
  scopeSpans?: IOtlpScopeSpans[];
}

export interface IOtlpTracesData {
  resourceSpans?: IOtlpResourceSpans[];
}

// Mutable view of IOtelSpan used while building the graph; the readonly fields
// of IOtelSpan are populated in place during enrichment.
type MutableOtelSpan = IOtelSpan & {
  childSpans: IOtelSpan[];
  inboundLinks: ILink[];
};

const NANOS_PER_MICRO = 1000n;
// int64 attribute values beyond this magnitude lose precision as JS numbers and are kept as strings.
const MAX_SAFE_BIG = BigInt(Number.MAX_SAFE_INTEGER);

function nanoToMicros(ns: string | undefined): Microseconds {
  if (!ns) return 0 as Microseconds;
  try {
    return Number(BigInt(ns) / NANOS_PER_MICRO) as Microseconds;
  } catch {
    return 0 as Microseconds;
  }
}

// Duration is derived from the nanosecond difference (then truncated to µs), matching
// Jaeger's canonical span model where endTime = startTime + duration. Computing it as
// floor(endNs/1000) - floor(startNs/1000) instead can be 1µs too high.
function durationMicros(startNs: string | undefined, endNs: string | undefined): Microseconds {
  if (!startNs || !endNs) return 0 as Microseconds;
  try {
    const diff = BigInt(endNs) - BigInt(startNs);
    return Number((diff > 0n ? diff : 0n) / NANOS_PER_MICRO) as Microseconds;
  } catch {
    return 0 as Microseconds;
  }
}

// OTLP SpanKind enum: 0 UNSPECIFIED, 1 INTERNAL, 2 SERVER, 3 CLIENT, 4 PRODUCER, 5 CONSUMER.
function toSpanKind(kind: number | undefined): SpanKind {
  switch (kind) {
    case 2:
      return SpanKind.SERVER;
    case 3:
      return SpanKind.CLIENT;
    case 4:
      return SpanKind.PRODUCER;
    case 5:
      return SpanKind.CONSUMER;
    default:
      return SpanKind.INTERNAL;
  }
}

// OTLP StatusCode enum: 0 UNSET, 1 OK, 2 ERROR.
function toStatus(status: IOtlpSpan['status']): IStatus {
  switch (status?.code) {
    case 2:
      return { code: StatusCode.ERROR, message: status.message };
    case 1:
      return { code: StatusCode.OK, message: status.message };
    default:
      return { code: StatusCode.UNSET, message: status?.message };
  }
}

function toAttributeValue(value: IOtlpAnyValue | undefined): AttributeValue {
  if (!value) return '';
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.boolValue !== undefined) return value.boolValue;
  if (value.intValue !== undefined) {
    // intValue is an int64 encoded as a string; keep it as a string when it would
    // lose precision as a JS number, otherwise convert for numeric use downstream.
    try {
      const asBig = BigInt(value.intValue);
      return asBig > MAX_SAFE_BIG || asBig < -MAX_SAFE_BIG ? value.intValue : Number(asBig);
    } catch {
      return value.intValue;
    }
  }
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.bytesValue !== undefined) return value.bytesValue;
  if (value.arrayValue !== undefined) return (value.arrayValue.values ?? []).map(toAttributeValue);
  if (value.kvlistValue !== undefined) {
    const obj = Object.create(null) as Record<string, AttributeValue>;
    for (const kv of value.kvlistValue.values ?? []) {
      if (kv.key && kv.value !== undefined) obj[kv.key] = toAttributeValue(kv.value);
    }
    return obj;
  }
  return '';
}

function toAttributes(kvs: IOtlpKeyValue[] | undefined): IAttribute[] {
  return (kvs ?? [])
    .filter(kv => kv.key !== undefined && kv.value !== undefined)
    .map(kv => ({ key: kv.key as string, value: toAttributeValue(kv.value) }));
}

function serviceNameOf(attributes: IAttribute[]): string {
  const attr = attributes.find(a => a.key === 'service.name');
  return attr && typeof attr.value === 'string' ? attr.value : 'unknown-service';
}

/**
 * Parse an OTLP `TracesData` document into an enriched `IOtelTrace`, or `null`
 * when it contains no valid spans.
 */
export function parseOtelTrace(data: IOtlpTracesData): IOtelTrace | null {
  const flat: MutableOtelSpan[] = [];

  for (const resourceSpans of data.resourceSpans ?? []) {
    const resourceAttributes = toAttributes(resourceSpans.resource?.attributes);
    const resource: IResource = {
      attributes: resourceAttributes,
      serviceName: serviceNameOf(resourceAttributes),
    };

    for (const scopeSpans of resourceSpans.scopeSpans ?? []) {
      const instrumentationScope: IScope = {
        name: scopeSpans.scope?.name || 'unknown',
        version: scopeSpans.scope?.version,
        attributes: scopeSpans.scope?.attributes ? toAttributes(scopeSpans.scope.attributes) : undefined,
      };

      for (const sp of scopeSpans.spans ?? []) {
        // A span without a trace/span id or start time can't be placed in the timeline.
        if (!sp.traceId || !sp.spanId || !sp.startTimeUnixNano) continue;
        const startTime = nanoToMicros(sp.startTimeUnixNano);
        const duration = durationMicros(sp.startTimeUnixNano, sp.endTimeUnixNano);
        const endTime = (startTime + duration) as Microseconds;
        flat.push({
          traceID: sp.traceId.toLowerCase(),
          spanID: sp.spanId.toLowerCase(),
          parentSpanID: sp.parentSpanId ? sp.parentSpanId.toLowerCase() : undefined,
          name: sp.name ?? '',
          kind: toSpanKind(sp.kind),
          startTime,
          endTime,
          duration,
          attributes: toAttributes(sp.attributes),
          events: (sp.events ?? []).map(e => ({
            timestamp: nanoToMicros(e.timeUnixNano),
            name: e.name || 'log',
            attributes: toAttributes(e.attributes),
          })),
          links: (sp.links ?? [])
            .filter(l => l.spanId)
            .map(l => ({
              traceID: (l.traceId ?? sp.traceId).toLowerCase(),
              spanID: (l.spanId as string).toLowerCase(),
              attributes: toAttributes(l.attributes),
            })),
          status: toStatus(sp.status),
          resource,
          instrumentationScope,
          // Enrichment placeholders, populated below.
          parentSpan: undefined,
          depth: 0,
          hasChildren: false,
          childSpans: [],
          relativeStartTime: 0 as Microseconds,
          inboundLinks: [],
          warnings: null,
        });
      }
    }
  }

  if (flat.length === 0) return null;
  const traceID = flat[0].traceID;

  const spanMap = new Map<string, MutableOtelSpan>();
  for (const span of flat) spanMap.set(span.spanID, span);

  let traceStartTime = Number.MAX_SAFE_INTEGER;
  let traceEndTime = 0;
  for (const span of flat) {
    if (span.startTime < traceStartTime) traceStartTime = span.startTime;
    if (span.endTime > traceEndTime) traceEndTime = span.endTime;
  }

  // Link parents/children and identify roots. A span whose parentSpanID is not
  // present in the trace is an orphan and is treated as a root.
  const rootSpans: MutableOtelSpan[] = [];
  let orphanSpanCount = 0;
  for (const span of flat) {
    const parent = span.parentSpanID ? spanMap.get(span.parentSpanID) : undefined;
    if (parent) {
      span.parentSpan = parent;
      parent.childSpans.push(span);
    } else {
      if (span.parentSpanID) orphanSpanCount++;
      rootSpans.push(span);
    }
  }

  // Inverse of outbound span links: each referenced span records who points at it.
  for (const span of flat) {
    for (const link of span.links) {
      const target = spanMap.get(link.spanID);
      if (target) {
        link.span = target;
        target.inboundLinks.push({
          traceID: span.traceID,
          spanID: span.spanID,
          attributes: link.attributes,
          span,
        });
      }
    }
  }

  // Pre-order DFS (iterative, to stay safe on very deeply nested traces) to set
  // depth/relative timing, order siblings by start time, and build the flat list.
  const spans: MutableOtelSpan[] = [];
  const serviceCounts = Object.create(null) as Record<string, number>;
  rootSpans.sort((a, b) => a.startTime - b.startTime);
  const stack: { span: MutableOtelSpan; depth: number }[] = [];
  for (let i = rootSpans.length - 1; i >= 0; i--) stack.push({ span: rootSpans[i], depth: 0 });
  while (stack.length) {
    const { span, depth } = stack.pop()!;
    span.depth = depth;
    span.relativeStartTime = (span.startTime - traceStartTime) as Microseconds;
    span.childSpans.sort((a, b) => a.startTime - b.startTime);
    span.hasChildren = span.childSpans.length > 0;
    serviceCounts[span.resource.serviceName] = (serviceCounts[span.resource.serviceName] || 0) + 1;
    spans.push(span);
    for (let i = span.childSpans.length - 1; i >= 0; i--) {
      stack.push({ span: span.childSpans[i] as MutableOtelSpan, depth: depth + 1 });
    }
  }

  const headerSpan = rootSpans.find(s => !s.parentSpanID) ?? rootSpans[0];
  const traceName = headerSpan ? `${headerSpan.resource.serviceName}: ${headerSpan.name}` : '';
  const tracePageTitle = headerSpan ? `${headerSpan.name} (${headerSpan.resource.serviceName})` : '';
  const services = Object.keys(serviceCounts).map(name => ({ name, numberOfSpans: serviceCounts[name] }));

  return {
    traceID,
    spans,
    duration: Math.max(0, traceEndTime - traceStartTime) as Microseconds,
    startTime: traceStartTime as Microseconds,
    endTime: traceEndTime as Microseconds,
    traceName,
    tracePageTitle,
    // getTraceEmoji only reads spans[0].traceID, which IOtelSpan also exposes.
    traceEmoji: getTraceEmoji(spans as unknown as Parameters<typeof getTraceEmoji>[0]),
    services,
    spanMap,
    rootSpans,
    orphanSpanCount,
    hasErrors(): boolean {
      return spans.some(s => s.status.code === StatusCode.ERROR);
    },
  };
}
