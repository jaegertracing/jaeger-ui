// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { classifySpan, isGenAISpan, isGenAITrace, getServicesWithoutGenAISpans } from './detect';
import type { GenAISpanKind, IAttribute, IAttributes, IOtelSpan } from '../../types/otel';
import { makeAttributes } from '../../model/attributes';

function makeSpan(attrs: IAttribute[]): { attributes: IAttributes } {
  return { attributes: makeAttributes(attrs) };
}

function makeServiceSpan(serviceName: string, genAIKind?: GenAISpanKind): IOtelSpan {
  return { resource: { serviceName, attributes: makeAttributes() }, genAIKind } as unknown as IOtelSpan;
}

describe('classifySpan', () => {
  it('classifies chat as LLM_CALL', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.operation.name', value: 'chat' }]))).toBe('LLM_CALL');
  });

  it('classifies text_completion as LLM_CALL', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.operation.name', value: 'text_completion' }]))).toBe(
      'LLM_CALL'
    );
  });

  it('classifies generate_content as LLM_CALL', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.operation.name', value: 'generate_content' }]))).toBe(
      'LLM_CALL'
    );
  });

  it('classifies embeddings as LLM_CALL', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.operation.name', value: 'embeddings' }]))).toBe('LLM_CALL');
  });

  it('classifies execute_tool as TOOL_CALL', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.operation.name', value: 'execute_tool' }]))).toBe(
      'TOOL_CALL'
    );
  });

  it('classifies invoke_agent as AGENT', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.operation.name', value: 'invoke_agent' }]))).toBe('AGENT');
  });

  it('classifies create_agent as AGENT', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.operation.name', value: 'create_agent' }]))).toBe('AGENT');
  });

  it('classifies invoke_workflow as AGENT', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.operation.name', value: 'invoke_workflow' }]))).toBe(
      'AGENT'
    );
  });

  it('classifies retrieval as RETRIEVAL', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.operation.name', value: 'retrieval' }]))).toBe('RETRIEVAL');
  });

  it('returns UNKNOWN_GENAI for an unrecognized gen_ai.operation.name', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.operation.name', value: 'some_new_op' }]))).toBe(
      'UNKNOWN_GENAI'
    );
  });

  it('returns UNKNOWN_GENAI for a span with gen_ai.* attrs but no operation.name', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.system', value: 'openai' }]))).toBe('UNKNOWN_GENAI');
  });

  it('returns undefined for a span with no gen_ai.* attrs', () => {
    expect(classifySpan(makeSpan([{ key: 'http.method', value: 'GET' }]))).toBeUndefined();
  });

  it('returns undefined for a span with empty attributes', () => {
    expect(classifySpan(makeSpan([]))).toBeUndefined();
  });

  it('classifies gen_ai.tool.name as TOOL_CALL when operation.name is absent', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.tool.name', value: 'get_weather' }]))).toBe('TOOL_CALL');
  });

  it('lets a recognized operation.name win over gen_ai.tool.name', () => {
    const span = makeSpan([
      { key: 'gen_ai.tool.name', value: 'get_weather' },
      { key: 'gen_ai.operation.name', value: 'chat' },
    ]);
    expect(classifySpan(span)).toBe('LLM_CALL');
  });

  it('falls back to a secondary signal for an unrecognized operation.name', () => {
    const span = makeSpan([
      { key: 'gen_ai.operation.name', value: 'some_new_op' },
      { key: 'gen_ai.tool.name', value: 'get_weather' },
    ]);
    expect(classifySpan(span)).toBe('TOOL_CALL');
  });

  it('returns undefined for gen_ai.tool.call.id alone', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.tool.call.id', value: 'abc-123' }]))).toBeUndefined();
  });

  it('returns TOOL_CALL when gen_ai.tool.call.id is paired with gen_ai.tool.name', () => {
    const span = makeSpan([
      { key: 'gen_ai.tool.call.id', value: 'abc-123' },
      { key: 'gen_ai.tool.name', value: 'get_weather' },
    ]);
    expect(classifySpan(span)).toBe('TOOL_CALL');
  });

  it('still returns UNKNOWN_GENAI when tool.call.id accompanies another gen_ai.* key', () => {
    const span = makeSpan([
      { key: 'gen_ai.tool.call.id', value: 'abc-123' },
      { key: 'gen_ai.system', value: 'openai' },
    ]);
    expect(classifySpan(span)).toBe('UNKNOWN_GENAI');
  });
});

describe('isGenAISpan', () => {
  it('returns true for a span with a gen_ai.* attribute', () => {
    expect(isGenAISpan(makeSpan([{ key: 'gen_ai.system', value: 'openai' }]))).toBe(true);
  });

  it('returns true for a span with gen_ai.operation.name', () => {
    expect(isGenAISpan(makeSpan([{ key: 'gen_ai.operation.name', value: 'chat' }]))).toBe(true);
  });

  it('returns false for a span with no gen_ai.* attribute', () => {
    expect(isGenAISpan(makeSpan([{ key: 'http.method', value: 'GET' }]))).toBe(false);
  });

  it('returns false for a span with empty attributes', () => {
    expect(isGenAISpan(makeSpan([]))).toBe(false);
  });

  it('does not match keys that merely contain "gen_ai" in the middle', () => {
    expect(isGenAISpan(makeSpan([{ key: 'custom.gen_ai.tag', value: 'x' }]))).toBe(false);
  });
});

describe('isGenAITrace', () => {
  it('returns true when at least one span has a gen_ai.* attribute', () => {
    const spans = [
      makeSpan([{ key: 'http.method', value: 'GET' }]),
      makeSpan([{ key: 'gen_ai.operation.name', value: 'chat' }]),
    ];
    expect(isGenAITrace(spans)).toBe(true);
  });

  it('returns false when no span has any gen_ai.* attribute', () => {
    const spans = [
      makeSpan([{ key: 'http.method', value: 'GET' }]),
      makeSpan([{ key: 'db.system', value: 'postgresql' }]),
    ];
    expect(isGenAITrace(spans)).toBe(false);
  });

  it('returns false for an empty span list', () => {
    expect(isGenAITrace([])).toBe(false);
  });
});

describe('getServicesWithoutGenAISpans', () => {
  it('excludes a service that owns at least one GenAI span', () => {
    const spans = [makeServiceSpan('agent-svc', 'AGENT'), makeServiceSpan('agent-svc', undefined)];
    expect(getServicesWithoutGenAISpans(spans)).toEqual(new Set());
  });

  it('includes a service where every span is non-GenAI', () => {
    const spans = [makeServiceSpan('gateway-svc', undefined), makeServiceSpan('db-svc', undefined)];
    expect(getServicesWithoutGenAISpans(spans)).toEqual(new Set(['gateway-svc', 'db-svc']));
  });

  it('splits correctly across a mix of GenAI and non-GenAI services', () => {
    const spans = [
      makeServiceSpan('gateway-svc', undefined),
      makeServiceSpan('agent-svc', 'LLM_CALL'),
      makeServiceSpan('agent-svc', undefined), // same service also has a plain span
      makeServiceSpan('db-svc', undefined),
    ];
    expect(getServicesWithoutGenAISpans(spans)).toEqual(new Set(['gateway-svc', 'db-svc']));
  });

  it('treats UNKNOWN_GENAI as a GenAI span, keeping its service out of the result', () => {
    const spans = [makeServiceSpan('svc', 'UNKNOWN_GENAI')];
    expect(getServicesWithoutGenAISpans(spans)).toEqual(new Set());
  });

  it('returns an empty set for an empty span list', () => {
    expect(getServicesWithoutGenAISpans([])).toEqual(new Set());
  });

  it('returns an empty set when every service has GenAI spans', () => {
    const spans = [makeServiceSpan('agent-svc', 'AGENT'), makeServiceSpan('llm-svc', 'LLM_CALL')];
    expect(getServicesWithoutGenAISpans(spans)).toEqual(new Set());
  });
});
