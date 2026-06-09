// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { detectGenAISpan, isGenAITrace } from './detect-gen-ai';
import type { IOtelSpan, IOtelTrace } from '../../types/otel';
import { SpanKind, StatusCode } from '../../types/otel';
import type { Microseconds } from '../../types/units';

const T0 = 0 as unknown as Microseconds;
const T1 = 1000 as unknown as Microseconds;

function makeSpan(attrs: Record<string, unknown>): IOtelSpan {
  return {
    traceID: 'trace-1',
    spanID: 'span-1',
    name: 'test-span',
    kind: SpanKind.INTERNAL,
    startTime: T0,
    endTime: T1,
    duration: T1,
    attributes: Object.entries(attrs).map(([key, value]) => ({ key, value: value as any })),
    events: [],
    links: [],
    inboundLinks: [],
    status: { code: StatusCode.UNSET },
    resource: { attributes: [], serviceName: 'test-service' },
    instrumentationScope: { name: 'test' },
    depth: 0,
    hasChildren: false,
    childSpans: [],
    relativeStartTime: T0,
    parentSpanID: undefined,
    parentSpan: undefined,
    warnings: null,
  } as unknown as IOtelSpan;
}

function makeTrace(spans: IOtelSpan[]): IOtelTrace {
  return {
    traceID: 'trace-1',
    spans,
    duration: T1,
    startTime: T0,
    endTime: T1,
    traceName: 'test-trace',
    tracePageTitle: 'test-trace',
    traceEmoji: '',
    services: [],
    spanMap: new Map(spans.map(s => [s.spanID, s])),
    rootSpans: spans.slice(0, 1),
    orphanSpanCount: 0,
    hasErrors: () => false,
  } as unknown as IOtelTrace;
}

describe('detectGenAISpan', () => {
  it('returns "tool" when gen_ai.tool.name and gen_ai.operation.name are both present', () => {
    const span = makeSpan({ 'gen_ai.tool.name': 'get_weather', 'gen_ai.operation.name': 'chat' });
    expect(detectGenAISpan(span)).toBe('tool');
  });

  it('returns "retrieval" for db.system=vector regardless of parent span type', () => {
    const span = makeSpan({ 'db.system': 'vector' });
    expect(detectGenAISpan(span)).toBe('retrieval');
  });

  it('returns null for gen_ai.tool.call.id without gen_ai.tool.name', () => {
    const span = makeSpan({ 'gen_ai.tool.call.id': 'abc-123' });
    expect(detectGenAISpan(span)).toBeNull();
  });

  it('returns "llm" for a non-standard gen_ai.* key with no operation.name', () => {
    const span = makeSpan({ 'gen_ai.custom_field': 'foo' });
    expect(detectGenAISpan(span)).toBe('llm');
  });

  it('returns null for spans with no gen_ai.* attributes', () => {
    const span = makeSpan({ 'http.method': 'GET', 'http.status_code': 200 });
    expect(detectGenAISpan(span)).toBeNull();
  });

  it('returns "llm" for gen_ai.operation.name without gen_ai.tool.name', () => {
    const span = makeSpan({ 'gen_ai.operation.name': 'chat' });
    expect(detectGenAISpan(span)).toBe('llm');
  });

  it('returns "agent" for agent.episode_id without gen_ai.* keys', () => {
    const span = makeSpan({ 'agent.episode_id': 'ep-42' });
    expect(detectGenAISpan(span)).toBe('agent');
  });

  it('tool takes precedence over retrieval when both keys are present', () => {
    const span = makeSpan({ 'gen_ai.tool.name': 'vector_search', 'db.system': 'vector' });
    expect(detectGenAISpan(span)).toBe('tool');
  });
});

describe('isGenAITrace', () => {
  it('returns true when at least one span is recognised by detectGenAISpan', () => {
    const spans = [makeSpan({ 'http.method': 'GET' }), makeSpan({ 'gen_ai.operation.name': 'chat' })];
    expect(isGenAITrace(makeTrace(spans))).toBe(true);
  });

  it('returns false when no span has any gen_ai.* attribute', () => {
    const spans = [makeSpan({ 'http.method': 'GET' }), makeSpan({ 'db.system': 'postgresql' })];
    expect(isGenAITrace(makeTrace(spans))).toBe(false);
  });

  it('returns false for an empty trace', () => {
    expect(isGenAITrace(makeTrace([]))).toBe(false);
  });

  it('returns false when only gen_ai.tool.call.id is present (detectGenAISpan returns null)', () => {
    const spans = [makeSpan({ 'gen_ai.tool.call.id': 'abc-123' })];
    expect(isGenAITrace(makeTrace(spans))).toBe(false);
  });

  it('returns true for a db.system=vector span (retrieval) inside an otherwise plain trace', () => {
    const spans = [makeSpan({ 'http.method': 'GET' }), makeSpan({ 'db.system': 'vector' })];
    expect(isGenAITrace(makeTrace(spans))).toBe(true);
  });
});
