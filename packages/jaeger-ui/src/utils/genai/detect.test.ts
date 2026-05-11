// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { classifySpan, isGenAITrace, getGenAIServiceNames, GenAISpanKind } from './detect';
import { IOtelSpan, IOtelTrace, SpanKind, StatusCode } from '../../types/otel';

function makeSpan(attrs: Record<string, string> = {}): IOtelSpan {
  return {
    traceID: 'trace-1',
    spanID: 'span-1',
    name: 'test',
    kind: SpanKind.INTERNAL,
    startTime: 0 as IOtelSpan['startTime'],
    endTime: 1 as IOtelSpan['endTime'],
    duration: 1 as IOtelSpan['duration'],
    attributes: Object.entries(attrs).map(([key, value]) => ({ key, value })),
    events: [],
    links: [],
    inboundLinks: [],
    status: { code: StatusCode.OK },
    resource: { attributes: [], serviceName: 'svc' },
    instrumentationScope: { name: 'test' },
    depth: 0,
    hasChildren: false,
    childSpans: [],
    relativeStartTime: 0 as IOtelSpan['relativeStartTime'],
    warnings: null,
  };
}

function makeTrace(spans: IOtelSpan[]): IOtelTrace {
  const trace: Omit<IOtelTrace, 'isGenAITrace'> & { isGenAITrace: boolean } = {
    traceID: 'trace-1',
    spans,
    duration: 1 as IOtelTrace['duration'],
    startTime: 0 as IOtelTrace['startTime'],
    endTime: 1 as IOtelTrace['endTime'],
    traceName: 'test',
    tracePageTitle: 'test',
    traceEmoji: '',
    services: [],
    spanMap: new Map(spans.map(s => [s.spanID, s])),
    rootSpans: spans.slice(0, 1),
    orphanSpanCount: 0,
    isGenAITrace: false,
    hasErrors: () => false,
  };
  return trace;
}

describe('classifySpan', () => {
  it.each<[string, GenAISpanKind]>([
    ['chat', 'LLM_CALL'],
    ['text_completion', 'LLM_CALL'],
    ['execute_tool', 'TOOL_CALL'],
    ['invoke_agent', 'AGENT'],
    ['retrieval', 'RETRIEVAL'],
  ])('classifies gen_ai.operation.name=%s as %s', (opName, expected) => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': opName }))).toBe(expected);
  });

  it('returns UNKNOWN_GENAI for unrecognized gen_ai.operation.name with other gen_ai.* attrs', () => {
    expect(
      classifySpan(makeSpan({ 'gen_ai.operation.name': 'future_op', 'gen_ai.provider.name': 'acme' }))
    ).toBe('UNKNOWN_GENAI');
  });

  it('returns UNKNOWN_GENAI when gen_ai.* attrs exist but no operation.name', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.provider.name': 'acme' }))).toBe('UNKNOWN_GENAI');
  });

  it('returns STANDARD when no gen_ai.* attrs exist', () => {
    expect(classifySpan(makeSpan({ 'http.method': 'GET' }))).toBe('STANDARD');
  });

  it('returns STANDARD for span with no attributes', () => {
    expect(classifySpan(makeSpan())).toBe('STANDARD');
  });
});

describe('isGenAITrace', () => {
  it('returns true when at least one span has gen_ai.* attributes', () => {
    const spans = [makeSpan({ 'http.method': 'GET' }), makeSpan({ 'gen_ai.operation.name': 'chat' })];
    expect(isGenAITrace(makeTrace(spans))).toBe(true);
  });

  it('returns false when all spans are STANDARD', () => {
    const spans = [makeSpan({ 'http.method': 'GET' }), makeSpan({ 'db.system': 'postgresql' })];
    expect(isGenAITrace(makeTrace(spans))).toBe(false);
  });

  it('returns false for an empty trace', () => {
    expect(isGenAITrace(makeTrace([]))).toBe(false);
  });
});

describe('getGenAIServiceNames', () => {
  function makeSpanForService(serviceName: string, attrs: Record<string, string> = {}): IOtelSpan {
    return { ...makeSpan(attrs), resource: { attributes: [], serviceName } };
  }

  it('returns service names of spans with GenAI attributes', () => {
    const spans = [
      makeSpanForService('llm-svc', { 'gen_ai.operation.name': 'chat' }),
      makeSpanForService('api-svc', { 'http.method': 'GET' }),
    ];
    expect(getGenAIServiceNames(makeTrace(spans))).toEqual(new Set(['llm-svc']));
  });

  it('returns empty set when no GenAI spans exist', () => {
    const spans = [
      makeSpanForService('api-svc', { 'http.method': 'GET' }),
      makeSpanForService('db-svc', { 'db.system': 'postgresql' }),
    ];
    expect(getGenAIServiceNames(makeTrace(spans))).toEqual(new Set());
  });

  it('deduplicates services when multiple spans share a GenAI service', () => {
    const spans = [
      makeSpanForService('llm-svc', { 'gen_ai.operation.name': 'chat' }),
      makeSpanForService('llm-svc', { 'gen_ai.operation.name': 'text_completion' }),
      makeSpanForService('tool-svc', { 'gen_ai.operation.name': 'execute_tool' }),
    ];
    expect(getGenAIServiceNames(makeTrace(spans))).toEqual(new Set(['llm-svc', 'tool-svc']));
  });

  it('includes services with any gen_ai.* attribute even without operation.name', () => {
    const spans = [makeSpanForService('inference-svc', { 'gen_ai.provider.name': 'openai' })];
    expect(getGenAIServiceNames(makeTrace(spans))).toEqual(new Set(['inference-svc']));
  });
});
