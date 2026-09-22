// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Converts validated OTLP trace data into the enriched IOtelTrace consumed by
 * the UI. Validation belongs to JaegerClient.fetchTrace; this module only
 * enriches data that has already crossed that boundary.
 */

import { makeAttributes } from '../../model/attributes';
import { getTraceEmoji } from '../../model/trace-viewer';
import {
  AttributeValue,
  IAttributes,
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
import { classifySpan } from '../../utils/genai/detect';
import type { TracesDataWire } from './schemas';

type ResourceSpansWire = NonNullable<TracesDataWire['resourceSpans']>;
type ResourceSpanWire = ResourceSpansWire[number];
type ScopeSpansWire = ResourceSpanWire['scopeSpans'][number];
type SpanWire = ScopeSpansWire['spans'][number];
type KeyValueWire = NonNullable<SpanWire['attributes']>[number];
type AnyValueWire = KeyValueWire['value'];

type MutableOtelSpan = IOtelSpan & {
  childSpans: IOtelSpan[];
  inboundLinks: ILink[];
};

const NANOS_PER_MICROSECOND = 1000n;
const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);

function nanoToMicros(nanoseconds: string | undefined): Microseconds {
  if (!nanoseconds) return 0 as Microseconds;
  return Number(BigInt(nanoseconds) / NANOS_PER_MICROSECOND) as Microseconds;
}

function durationMicros(
  startNanoseconds: string | undefined,
  endNanoseconds: string | undefined
): Microseconds {
  if (!startNanoseconds || !endNanoseconds) return 0 as Microseconds;
  const duration = BigInt(endNanoseconds) - BigInt(startNanoseconds);
  return Number((duration > 0n ? duration : 0n) / NANOS_PER_MICROSECOND) as Microseconds;
}

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

function toStatus(status: SpanWire['status']): IStatus {
  switch (status?.code) {
    case 2:
      return { code: StatusCode.ERROR, message: status.message };
    case 1:
      return { code: StatusCode.OK, message: status.message };
    default:
      return { code: StatusCode.UNSET, message: status?.message };
  }
}

function toAttributeValue(value: AnyValueWire): AttributeValue {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.boolValue !== undefined) return value.boolValue;
  if (value.intValue !== undefined) {
    const integer = BigInt(value.intValue);
    return integer > MAX_SAFE_INTEGER || integer < -MAX_SAFE_INTEGER ? value.intValue : Number(integer);
  }
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.bytesValue !== undefined) return value.bytesValue;
  if (value.arrayValue !== undefined) return (value.arrayValue.values ?? []).map(toAttributeValue);
  if (value.kvlistValue !== undefined) {
    const result = Object.create(null) as Record<string, AttributeValue>;
    for (const entry of value.kvlistValue.values ?? []) result[entry.key] = toAttributeValue(entry.value);
    return result;
  }

  // refinedAnyValue rejects this shape at the API boundary.
  return '';
}

function toAttributes(attributes: ReadonlyArray<KeyValueWire> | undefined): IAttributes {
  return makeAttributes(
    (attributes ?? []).map(attribute => ({ key: attribute.key, value: toAttributeValue(attribute.value) }))
  );
}

function serviceNameOf(attributes: IAttributes): string {
  const serviceName = attributes.getValue('service.name');
  return typeof serviceName === 'string' ? serviceName : 'unknown-service';
}

/**
 * Removes one parent edge from every parent cycle. Each span has at most one
 * parent, so following the candidate edges detects every cycle in linear time.
 */
function breakParentCycles(parentBySpan: Map<MutableOtelSpan, MutableOtelSpan | undefined>): void {
  const state = new Map<MutableOtelSpan, 0 | 1 | 2>();

  for (const start of parentBySpan.keys()) {
    if (state.get(start) !== undefined) continue;

    const path: MutableOtelSpan[] = [];
    let current: MutableOtelSpan | undefined = start;
    while (current && state.get(current) === undefined) {
      state.set(current, 1);
      path.push(current);
      current = parentBySpan.get(current);
    }

    if (current && state.get(current) === 1) {
      // Make the first repeated span a root. Its former parent remains a child,
      // preserving every span while producing a traversable tree.
      parentBySpan.set(current, undefined);
    }

    for (const span of path) state.set(span, 2);
  }
}

/**
 * Parses validated OTLP `TracesData` into an enriched trace. Returns null when
 * the payload has no spans that can be placed on the timeline.
 */
export function parseOtelTrace(data: TracesDataWire): IOtelTrace | null {
  const flat: MutableOtelSpan[] = [];

  for (const resourceSpans of data.resourceSpans ?? []) {
    const resourceAttributes = toAttributes(resourceSpans.resource?.attributes);
    const resource: IResource = {
      attributes: resourceAttributes,
      serviceName: serviceNameOf(resourceAttributes),
    };

    for (const scopeSpans of resourceSpans.scopeSpans) {
      const scope: IScope = {
        name: scopeSpans.scope?.name || 'unknown',
        version: scopeSpans.scope?.version,
        attributes: scopeSpans.scope?.attributes ? toAttributes(scopeSpans.scope.attributes) : undefined,
      };

      for (const span of scopeSpans.spans) {
        if (!span.startTimeUnixNano) continue;

        const startTime = nanoToMicros(span.startTimeUnixNano);
        const duration = durationMicros(span.startTimeUnixNano, span.endTimeUnixNano);
        const attributes = toAttributes(span.attributes);
        const parsedSpan: MutableOtelSpan = {
          traceID: span.traceId.toLowerCase(),
          spanID: span.spanId.toLowerCase(),
          parentSpanID: span.parentSpanId?.toLowerCase(),
          name: span.name ?? '',
          kind: toSpanKind(span.kind),
          startTime,
          endTime: (startTime + duration) as Microseconds,
          duration,
          attributes,
          events: (span.events ?? []).map(event => ({
            timestamp: nanoToMicros(event.timeUnixNano),
            name: event.name || 'log',
            attributes: toAttributes(event.attributes),
          })),
          links: (span.links ?? []).map(link => ({
            traceID: link.traceId.toLowerCase(),
            spanID: link.spanId.toLowerCase(),
            attributes: toAttributes(link.attributes),
          })),
          status: toStatus(span.status),
          resource,
          instrumentationScope: scope,
          parentSpan: undefined,
          depth: 0,
          hasChildren: false,
          childSpans: [],
          relativeStartTime: 0 as Microseconds,
          inboundLinks: [],
          warnings: null,
          genAIKind: classifySpan({ attributes }),
        };
        flat.push(parsedSpan);
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

  const parentBySpan = new Map<MutableOtelSpan, MutableOtelSpan | undefined>();
  let orphanSpanCount = 0;
  for (const span of flat) {
    const parent = span.parentSpanID ? spanMap.get(span.parentSpanID) : undefined;
    if (!parent && span.parentSpanID) orphanSpanCount++;
    parentBySpan.set(span, parent);
  }
  breakParentCycles(parentBySpan);

  const rootSpans: MutableOtelSpan[] = [];
  for (const span of flat) {
    const parent = parentBySpan.get(span);
    if (parent) {
      span.parentSpan = parent;
      parent.childSpans.push(span);
    } else {
      rootSpans.push(span);
    }
  }

  for (const span of flat) {
    for (const link of span.links) {
      const target = spanMap.get(link.spanID);
      if (!target) continue;
      link.span = target;
      target.inboundLinks.push({
        traceID: span.traceID,
        spanID: span.spanID,
        attributes: link.attributes,
        span,
      });
    }
  }

  rootSpans.sort((left, right) => left.startTime - right.startTime);
  const spans: MutableOtelSpan[] = [];
  const serviceCounts = Object.create(null) as Record<string, number>;
  const stack: Array<{ span: MutableOtelSpan; depth: number }> = [];
  for (let index = rootSpans.length - 1; index >= 0; index--) {
    stack.push({ span: rootSpans[index], depth: 0 });
  }

  while (stack.length > 0) {
    const { span, depth } = stack.pop()!;
    span.depth = depth;
    span.relativeStartTime = (span.startTime - traceStartTime) as Microseconds;
    span.childSpans.sort((left, right) => left.startTime - right.startTime);
    span.hasChildren = span.childSpans.length > 0;
    serviceCounts[span.resource.serviceName] = (serviceCounts[span.resource.serviceName] ?? 0) + 1;
    spans.push(span);

    for (let index = span.childSpans.length - 1; index >= 0; index--) {
      stack.push({ span: span.childSpans[index] as MutableOtelSpan, depth: depth + 1 });
    }
  }

  const headerSpan = rootSpans[0];
  const traceName = `${headerSpan.resource.serviceName}: ${headerSpan.name}`;
  const tracePageTitle = `${headerSpan.name} (${headerSpan.resource.serviceName})`;
  const services = Object.keys(serviceCounts).map(name => ({ name, numberOfSpans: serviceCounts[name] }));

  return {
    traceID,
    spans,
    duration: Math.max(0, traceEndTime - traceStartTime) as Microseconds,
    startTime: traceStartTime as Microseconds,
    endTime: traceEndTime as Microseconds,
    traceName,
    tracePageTitle,
    traceEmoji: getTraceEmoji(spans),
    services,
    spanMap,
    rootSpans,
    orphanSpanCount,
    isGenAITrace: flat.some(span => span.genAIKind !== undefined),
    hasErrors(): boolean {
      return spans.some(span => span.status.code === StatusCode.ERROR);
    },
  };
}
