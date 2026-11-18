// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { ScopeSpansWire, SpanWire, TracesDataWire } from '../api/v3/schemas';

interface IOtlpTraceOptions {
  serviceName?: string;
  scope?: ScopeSpansWire['scope'];
}

/**
 * Build a deterministic OTLP span, preserving explicitly supplied fields.
 * Supply distinct spanId values when building a multi-span fixture.
 */
export function makeOtlpSpan(overrides: Partial<SpanWire> = {}): SpanWire {
  return {
    traceId: 'abcdef0123456789abcdef0123456789',
    spanId: '1111111111111111',
    name: 'operation',
    startTimeUnixNano: '1000000',
    endTimeUnixNano: '2000000',
    attributes: [],
    events: [],
    links: [],
    status: {},
    ...overrides,
  };
}

/** Wrap explicit spans in a single OTLP resource and scope for parsing. */
export function makeOtlpTrace(
  spans: ReadonlyArray<SpanWire>,
  { serviceName = 'service', scope }: IOtlpTraceOptions = {}
): TracesDataWire {
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [{ key: 'service.name', value: { stringValue: serviceName } }],
        },
        scopeSpans: [{ ...(scope === undefined ? {} : { scope }), spans: [...spans] }],
      },
    ],
  };
}
