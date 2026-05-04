// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { classifySpan, hasGenAIAttributes, isGenAISpan, isGenAITrace, RICH_MEDIA_ATTRIBUTE_KEYS } from './detect';
import type { IAttribute, IOtelSpan, IOtelTrace } from '../../types/otel';

function makeSpan(attrs: Record<string, string>): IOtelSpan {
  const attributes: IAttribute[] = Object.entries(attrs).map(([key, value]) => ({ key, value }));
  return { attributes } as unknown as IOtelSpan;
}

function makeTrace(spans: IOtelSpan[]): IOtelTrace {
  return { spans } as unknown as IOtelTrace;
}

describe('hasGenAIAttributes', () => {
  it('returns true when any attribute key starts with gen_ai.', () => {
    expect(hasGenAIAttributes([{ key: 'gen_ai.operation.name', value: 'chat' }])).toBe(true);
  });

  it('returns false when no attribute key starts with gen_ai.', () => {
    expect(hasGenAIAttributes([{ key: 'http.method', value: 'GET' }])).toBe(false);
  });

  it('returns false for empty attributes array', () => {
    expect(hasGenAIAttributes([])).toBe(false);
  });
});

describe('classifySpan', () => {
  it('returns STANDARD for span with no gen_ai.* attributes', () => {
    expect(classifySpan(makeSpan({ 'http.method': 'GET' }))).toBe('STANDARD');
  });

  it('returns LLM_CALL for gen_ai.operation.name = chat', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'chat' }))).toBe('LLM_CALL');
  });

  it('returns LLM_CALL for gen_ai.operation.name = text_completion', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'text_completion' }))).toBe('LLM_CALL');
  });

  it('returns LLM_CALL for gen_ai.operation.name = generate_content', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'generate_content' }))).toBe('LLM_CALL');
  });

  it('returns LLM_CALL for gen_ai.operation.name = embeddings', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'embeddings' }))).toBe('LLM_CALL');
  });

  it('returns TOOL_CALL for gen_ai.operation.name = execute_tool', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'execute_tool' }))).toBe('TOOL_CALL');
  });

  it('returns AGENT for gen_ai.operation.name = invoke_agent', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'invoke_agent' }))).toBe('AGENT');
  });

  it('returns AGENT for gen_ai.operation.name = create_agent', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'create_agent' }))).toBe('AGENT');
  });

  it('returns AGENT for gen_ai.operation.name = invoke_workflow', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'invoke_workflow' }))).toBe('AGENT');
  });

  it('returns RETRIEVAL for gen_ai.operation.name = retrieval', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'retrieval' }))).toBe('RETRIEVAL');
  });

  it('returns UNKNOWN_GENAI for span with gen_ai.* attrs but no operation.name', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.provider.name': 'openai' }))).toBe('UNKNOWN_GENAI');
  });

  it('returns UNKNOWN_GENAI for unrecognized gen_ai.operation.name value', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'future_unknown_op' }))).toBe('UNKNOWN_GENAI');
  });
});

describe('isGenAISpan', () => {
  it('returns true for a span with a gen_ai.* attribute', () => {
    expect(isGenAISpan(makeSpan({ 'gen_ai.provider.name': 'openai' }))).toBe(true);
  });

  it('returns true for a span with gen_ai.operation.name', () => {
    expect(isGenAISpan(makeSpan({ 'gen_ai.operation.name': 'chat' }))).toBe(true);
  });

  it('returns false for a span with no gen_ai.* attribute', () => {
    expect(isGenAISpan(makeSpan({ 'http.method': 'GET' }))).toBe(false);
  });

  it('returns false for a span with no attributes', () => {
    expect(isGenAISpan(makeSpan({}))).toBe(false);
  });

  it('does not match keys that merely contain "gen_ai" in the middle', () => {
    expect(isGenAISpan(makeSpan({ 'custom.gen_ai.tag': 'x' }))).toBe(false);
  });
});

describe('isGenAITrace', () => {
  it('returns true when at least one span has gen_ai.* attributes', () => {
    const trace = makeTrace([
      makeSpan({ 'http.method': 'GET' }),
      makeSpan({ 'gen_ai.operation.name': 'chat' }),
    ]);
    expect(isGenAITrace(trace)).toBe(true);
  });

  it('returns false when no span has gen_ai.* attributes', () => {
    const trace = makeTrace([makeSpan({ 'http.method': 'GET' }), makeSpan({ 'db.system': 'postgresql' })]);
    expect(isGenAITrace(trace)).toBe(false);
  });

  it('returns false for empty trace', () => {
    expect(isGenAITrace(makeTrace([]))).toBe(false);
  });
});

describe('RICH_MEDIA_ATTRIBUTE_KEYS', () => {
  it('classifies gen_ai.input.messages as markdown', () => {
    expect(RICH_MEDIA_ATTRIBUTE_KEYS['gen_ai.input.messages']).toBe('markdown');
  });

  it('classifies gen_ai.output.messages as markdown', () => {
    expect(RICH_MEDIA_ATTRIBUTE_KEYS['gen_ai.output.messages']).toBe('markdown');
  });

  it('classifies gen_ai.tool.call.arguments as json', () => {
    expect(RICH_MEDIA_ATTRIBUTE_KEYS['gen_ai.tool.call.arguments']).toBe('json');
  });

  it('classifies gen_ai.tool.call.result as json', () => {
    expect(RICH_MEDIA_ATTRIBUTE_KEYS['gen_ai.tool.call.result']).toBe('json');
  });

  it('does not classify gen_ai.operation.name as a rich-media key', () => {
    expect(RICH_MEDIA_ATTRIBUTE_KEYS['gen_ai.operation.name']).toBeUndefined();
  });
});
