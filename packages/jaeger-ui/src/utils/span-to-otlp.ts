// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan, IAttribute, AttributeValue, SpanKind, StatusCode } from '../types/otel';

// OTLP/JSON proto3 encoding: SpanKind integer values
// https://opentelemetry.io/docs/specs/otlp/#json-payload
const SPAN_KIND_INT: Record<SpanKind, number> = {
  [SpanKind.INTERNAL]: 1,
  [SpanKind.SERVER]: 2,
  [SpanKind.CLIENT]: 3,
  [SpanKind.PRODUCER]: 4,
  [SpanKind.CONSUMER]: 5,
};

// OTLP/JSON proto3 encoding: StatusCode integer values
const STATUS_CODE_INT: Record<StatusCode, number> = {
  [StatusCode.UNSET]: 0,
  [StatusCode.OK]: 1,
  [StatusCode.ERROR]: 2,
};

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Encodes an AttributeValue as an OTLP AnyValue (proto3 JSON one-of).
// Non-finite numbers (NaN, Infinity) are stringified — OTLP has no representation for them.
export function toAnyValue(v: AttributeValue): Record<string, unknown> {
  if (typeof v === 'boolean') return { boolValue: v };
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return { stringValue: String(v) };
    // intValue is proto3 int64, encoded as a decimal string per the JSON mapping spec
    return Number.isInteger(v) ? { intValue: String(v) } : { doubleValue: v };
  }
  if (v instanceof Uint8Array) return { bytesValue: uint8ToBase64(v) };
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(item => toAnyValue(item as AttributeValue)) } };
  }
  if (v !== null && typeof v === 'object') {
    return {
      kvlistValue: {
        values: Object.entries(v).map(([key, val]) => ({
          key,
          value: toAnyValue(val as AttributeValue),
        })),
      },
    };
  }
  return { stringValue: String(v ?? '') };
}

function toOtlpAttrs(attrs: ReadonlyArray<IAttribute>) {
  return attrs.map(({ key, value }) => ({ key, value: toAnyValue(value) }));
}

// Converts microseconds to a nanosecond decimal string.
// OTLP uint64 timestamps must be strings in proto3 JSON to avoid JS precision loss.
// Appending "000" is equivalent to ×1000 and avoids BigInt (ES2016 target).
function usToNanoStr(us: number): string {
  return `${Math.round(us)}000`;
}

/**
 * Converts a Jaeger IOtelSpan to a spec-compliant OTLP/JSON resourceSpans payload.
 * The output is suitable for import into any OpenTelemetry-compatible backend.
 *
 * Spec reference: https://opentelemetry.io/docs/specs/otlp/#json-payload
 */
export function spanToOtlpJson(span: IOtelSpan): Record<string, unknown> {
  return {
    resourceSpans: [
      {
        resource: {
          attributes: toOtlpAttrs(span.resource.attributes),
        },
        scopeSpans: [
          {
            scope: {
              name: span.instrumentationScope.name,
              ...(span.instrumentationScope.version && { version: span.instrumentationScope.version }),
              ...(span.instrumentationScope.attributes?.length && {
                attributes: toOtlpAttrs(span.instrumentationScope.attributes),
              }),
            },
            spans: [
              {
                traceId: span.traceID,
                spanId: span.spanID,
                ...(span.parentSpanID && { parentSpanId: span.parentSpanID }),
                name: span.name,
                kind: SPAN_KIND_INT[span.kind] ?? 0,
                startTimeUnixNano: usToNanoStr(span.startTime),
                endTimeUnixNano: usToNanoStr(span.endTime),
                attributes: toOtlpAttrs(span.attributes),
                events: span.events.map(ev => ({
                  timeUnixNano: usToNanoStr(ev.timestamp),
                  name: ev.name,
                  attributes: toOtlpAttrs(ev.attributes),
                })),
                links: span.links.map(lk => ({
                  traceId: lk.traceID,
                  spanId: lk.spanID,
                  attributes: toOtlpAttrs(lk.attributes),
                })),
                status: {
                  code: STATUS_CODE_INT[span.status.code] ?? 0,
                  ...(span.status.message && { message: span.status.message }),
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Converts a Jaeger IOtelSpan to a flat, human-readable JSON object.
 * Useful for quick sharing, pasting into docs, or debugging without needing
 * an OTel-aware tool to parse the output.
 */
export function spanToFlatJson(span: IOtelSpan): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  for (const { key, value } of span.attributes) attrs[key] = value;

  return {
    traceId: span.traceID,
    spanId: span.spanID,
    ...(span.parentSpanID && { parentSpanId: span.parentSpanID }),
    service: span.resource.serviceName,
    name: span.name,
    kind: span.kind,
    startTimeMs: Math.round(span.startTime / 1000),
    durationMs: span.duration / 1000,
    status: {
      code: span.status.code,
      ...(span.status.message && { message: span.status.message }),
    },
    attributes: attrs,
    events: span.events.map(ev => ({
      name: ev.name,
      timestampMs: Math.round(ev.timestamp / 1000),
      attributes: Object.fromEntries(ev.attributes.map(({ key, value }) => [key, value])),
    })),
  };
}
