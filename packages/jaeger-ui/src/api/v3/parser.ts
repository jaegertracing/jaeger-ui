// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Converts validated OTLP trace data into the enriched IOtelTrace consumed by
 * the UI. Validation belongs to JaegerClient.fetchTrace; this module only
 * enriches data that has already crossed that boundary.
 */

import { makeAttributes } from '../../model/attributes';
import { deduplicateAttributes, orderAttributes } from '../../model/trace-attributes';
import { getTraceEmoji } from '../../model/trace-display-helpers';
import getConfig from '../../utils/config/get-config';
import {
  AttributeValue,
  IAttributes,
  IEvent,
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

type ParsedSpanData = {
  spans: MutableOtelSpan[];
  spansWithoutStartTime: Set<MutableOtelSpan>;
  eventsWithoutTimestamp: Map<MutableOtelSpan, IEvent[]>;
};

const NANOS_PER_MICROSECOND = 1000n;
const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);

function toSafeMicroseconds(microseconds: bigint, field: string): Microseconds {
  if (microseconds > MAX_SAFE_INTEGER || microseconds < -MAX_SAFE_INTEGER) {
    throw new RangeError(`OTLP ${field} exceeds the safe integer range in microseconds`);
  }
  return Number(microseconds) as Microseconds;
}

function nanoToMicros(nanoseconds: string | undefined): Microseconds {
  if (!nanoseconds) return 0 as Microseconds;
  // The UI model stores whole microseconds as numbers. Reject values outside
  // the safe integer range after discarding submicrosecond precision.
  return toSafeMicroseconds(BigInt(nanoseconds) / NANOS_PER_MICROSECOND, 'timestamp');
}

function durationMicros(
  startNanoseconds: string | undefined,
  endNanoseconds: string | undefined
): Microseconds {
  if (!startNanoseconds || !endNanoseconds) return 0 as Microseconds;
  const duration = BigInt(endNanoseconds) - BigInt(startNanoseconds);
  // Keep the canonical UI invariant endTime = startTime + duration. Truncating
  // duration can place endTime 1 µs before independently truncating the wire end.
  return toSafeMicroseconds((duration > 0n ? duration : 0n) / NANOS_PER_MICROSECOND, 'duration');
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
    case 1:
      return SpanKind.INTERNAL;
    default:
      return SpanKind.UNSPECIFIED;
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

function decodeBase64Bytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function toAttributeValue(value: AnyValueWire): AttributeValue {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.boolValue !== undefined) return value.boolValue;
  if (value.intValue !== undefined) {
    const integer = BigInt(value.intValue);
    return integer > MAX_SAFE_INTEGER || integer < -MAX_SAFE_INTEGER ? value.intValue : Number(integer);
  }
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.bytesValue !== undefined) return decodeBase64Bytes(value.bytesValue);
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
function breakParentCycles(
  spans: MutableOtelSpan[],
  rootSpans: MutableOtelSpan[],
  onCycleRoot: (span: MutableOtelSpan) => void
): void {
  const state = new Map<MutableOtelSpan, 0 | 1 | 2>();

  for (const start of spans) {
    if (state.get(start) !== undefined) continue;

    const path: MutableOtelSpan[] = [];
    let current: MutableOtelSpan | undefined = start;
    while (current && state.get(current) === undefined) {
      state.set(current, 1);
      path.push(current);
      current = current.parentSpan as MutableOtelSpan | undefined;
    }

    if (current && state.get(current) === 1) {
      const formerParent = current.parentSpan as MutableOtelSpan;
      const childIndex = formerParent.childSpans.indexOf(current);
      if (childIndex >= 0) formerParent.childSpans.splice(childIndex, 1);
      current.parentSpan = undefined;
      current.parentSpanID = undefined;
      current.warnings = [
        ...(current.warnings ?? []),
        `Cyclic parent reference to ${formerParent.spanID} removed`,
      ];
      rootSpans.push(current);
      onCycleRoot(current);
    }

    for (const span of path) state.set(span, 2);
  }
}

/**
 * Converts validated OTLP wire spans into the UI span model. Graph-derived
 * fields are initialized here and populated later by enrichTrace.
 */
function parseSpans(data: TracesDataWire): ParsedSpanData {
  const spans: MutableOtelSpan[] = [];
  const spansWithoutStartTime = new Set<MutableOtelSpan>();
  const eventsWithoutTimestamp = new Map<MutableOtelSpan, IEvent[]>();
  const spanIdCounts = new Map<string, number>();
  let traceID: string | undefined;

  for (const resourceSpans of data.resourceSpans ?? []) {
    const resourceAttributes = toAttributes(resourceSpans.resource?.attributes);
    const resource: IResource = {
      attributes: resourceAttributes,
      serviceName: serviceNameOf(resourceAttributes),
    };

    for (const scopeSpans of resourceSpans.scopeSpans ?? []) {
      const scope: IScope = {
        name: scopeSpans.scope?.name || 'unknown',
        version: scopeSpans.scope?.version,
        attributes: scopeSpans.scope?.attributes ? toAttributes(scopeSpans.scope.attributes) : undefined,
      };

      for (const span of scopeSpans.spans ?? []) {
        const spanTraceID = span.traceId.toLowerCase();
        if (traceID !== undefined && spanTraceID !== traceID) {
          throw new Error(`Expected one trace ID, received ${traceID} and ${spanTraceID}`);
        }
        traceID ??= spanTraceID;
        const hasUsableStartTime =
          span.startTimeUnixNano !== undefined && BigInt(span.startTimeUnixNano) > 0n;
        const startTime = hasUsableStartTime ? nanoToMicros(span.startTimeUnixNano) : (0 as Microseconds);
        const duration = durationMicros(span.startTimeUnixNano ?? '0', span.endTimeUnixNano);
        const endTime = toSafeMicroseconds(BigInt(startTime) + BigInt(duration), 'end timestamp');
        const eventTimesToRepair: IEvent[] = [];
        const events = (span.events ?? []).map(event => {
          const hasUsableTimestamp = event.timeUnixNano !== undefined && BigInt(event.timeUnixNano) > 0n;
          const parsedEvent: IEvent = {
            timestamp: hasUsableTimestamp ? nanoToMicros(event.timeUnixNano) : startTime,
            name: event.name || 'log',
            attributes: toAttributes(event.attributes),
          };
          if (!hasUsableStartTime && !hasUsableTimestamp) eventTimesToRepair.push(parsedEvent);
          return parsedEvent;
        });
        if (hasUsableStartTime) events.sort((left, right) => left.timestamp - right.timestamp);
        const decodedAttributes = (span.attributes ?? []).map(attribute => ({
          key: attribute.key,
          value: toAttributeValue(attribute.value),
        }));
        const attributesInfo = deduplicateAttributes(decodedAttributes);
        const attributes = makeAttributes(
          orderAttributes(attributesInfo.attributes, getConfig().topTagPrefixes)
        );
        const wireSpanID = span.spanId.toLowerCase();
        const duplicateCount = spanIdCounts.get(wireSpanID) ?? 0;
        spanIdCounts.set(wireSpanID, duplicateCount + 1);

        // Keep the first wire ID unchanged so parent and link references resolve
        // to it, and give later duplicates stable internal IDs for UI lookups.
        const spanID = duplicateCount === 0 ? wireSpanID : `${wireSpanID}_${duplicateCount}`;
        const parsedSpan: MutableOtelSpan = {
          traceID: spanTraceID,
          spanID,
          parentSpanID: span.parentSpanId?.toLowerCase(),
          name: span.name || 'no-name',
          kind: toSpanKind(span.kind),
          startTime,
          endTime,
          duration,
          attributes,
          events,
          links: (span.links ?? []).map(link => ({
            traceID: link.traceId.toLowerCase(),
            spanID: link.spanId.toLowerCase(),
            attributes: toAttributes(link.attributes),
          })),
          status: toStatus(span.status),
          resource,
          instrumentationScope: scope,
          genAIKind: classifySpan({ attributes }),
          // Initialized here and populated during graph enrichment.
          parentSpan: undefined,
          depth: 0,
          hasChildren: false,
          childSpans: [],
          relativeStartTime: 0 as Microseconds,
          inboundLinks: [],
          warnings: attributesInfo.warnings,
        };
        spans.push(parsedSpan);
        if (!hasUsableStartTime) {
          spansWithoutStartTime.add(parsedSpan);
        }
        if (eventTimesToRepair.length > 0) eventsWithoutTimestamp.set(parsedSpan, eventTimesToRepair);
      }
    }
  }

  return { spans, spansWithoutStartTime, eventsWithoutTimestamp };
}

function repairMissingStartTime(
  span: MutableOtelSpan,
  parent: MutableOtelSpan | undefined,
  parsed: ParsedSpanData
): void {
  if (!parsed.spansWithoutStartTime.has(span)) return;

  const startTime = parent?.startTime ?? (0 as Microseconds);
  // ProtoJSON may omit a zero timestamp. In either representation the wire
  // still encodes duration as end-start. Preserve it when repairing the start,
  // matching the legacy transformer, and recompute the canonical UI end.
  const duration = span.duration;
  span.startTime = startTime;
  span.duration = duration as Microseconds;
  span.endTime = toSafeMicroseconds(BigInt(startTime) + BigInt(duration), 'repaired end timestamp');

  for (const event of parsed.eventsWithoutTimestamp.get(span) ?? []) event.timestamp = startTime;
  span.events.sort((left, right) => left.timestamp - right.timestamp);
}

function enrichTrace(parsed: ParsedSpanData): IOtelTrace {
  const { spans: parsedSpans } = parsed;
  const traceID = parsedSpans[0].traceID;
  const spanMap = new Map(parsedSpans.map(span => [span.spanID, span]));
  const rootSpans: MutableOtelSpan[] = [];
  const serviceCounts = Object.create(null) as Record<string, number>;

  let orphanSpanCount = 0;
  let isGenAITrace = false;

  for (const span of parsedSpans) {
    const parent = span.parentSpanID ? spanMap.get(span.parentSpanID) : undefined;
    if (!parent && span.parentSpanID) orphanSpanCount++;
    if (parent) {
      span.parentSpan = parent;
      parent.childSpans.push(span);
    } else {
      repairMissingStartTime(span, undefined, parsed);
      rootSpans.push(span);
    }
    for (const link of span.links) {
      const target = spanMap.get(link.spanID);
      if (!target || target.traceID !== link.traceID) continue;
      link.span = target;
      target.inboundLinks.push({
        traceID: span.traceID,
        spanID: span.spanID,
        attributes: link.attributes,
        span,
      });
    }
  }

  breakParentCycles(parsedSpans, rootSpans, span => repairMissingStartTime(span, undefined, parsed));
  rootSpans.sort((left, right) => left.startTime - right.startTime);
  const headerSpan = rootSpans[0];
  let traceStartTime = Number.POSITIVE_INFINITY;
  let traceEndTime = Number.NEGATIVE_INFINITY;
  const spans: MutableOtelSpan[] = [];
  const stack: Array<{ span: MutableOtelSpan; depth: number }> = [];
  for (let index = rootSpans.length - 1; index >= 0; index--) {
    stack.push({ span: rootSpans[index], depth: 0 });
  }

  while (stack.length > 0) {
    const { span, depth } = stack.pop()!;
    serviceCounts[span.resource.serviceName] = (serviceCounts[span.resource.serviceName] ?? 0) + 1;
    isGenAITrace ||= span.genAIKind !== undefined;
    span.depth = depth;
    traceStartTime = Math.min(traceStartTime, span.startTime);
    traceEndTime = Math.max(traceEndTime, span.endTime);
    for (const child of span.childSpans) repairMissingStartTime(child as MutableOtelSpan, span, parsed);
    span.childSpans.sort((left, right) => left.startTime - right.startTime);
    span.hasChildren = span.childSpans.length > 0;
    spans.push(span);

    for (let index = span.childSpans.length - 1; index >= 0; index--) {
      stack.push({ span: span.childSpans[index] as MutableOtelSpan, depth: depth + 1 });
    }
  }

  for (const span of spans) span.relativeStartTime = (span.startTime - traceStartTime) as Microseconds;

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
    isGenAITrace,
    hasErrors(): boolean {
      return spans.some(span => span.status.code === StatusCode.ERROR);
    },
  };
}

/**
 * Parses validated OTLP `TracesData` into an enriched trace. Returns null when
 * the payload contains no spans.
 */
export function parseOtelTrace(data: TracesDataWire): IOtelTrace | null {
  const parsed = parseSpans(data);
  return parsed.spans.length > 0 ? enrichTrace(parsed) : null;
}
