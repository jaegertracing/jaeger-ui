// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { classifySpan, isGenAISpan, isGenAITrace } from './detect';
import type { IAttribute, IAttributes } from '../../types/otel';
import { makeAttributes } from '../../model/attributes';

function makeSpan(attrs: IAttribute[]): { attributes: IAttributes } {
  return { attributes: makeAttributes(attrs) };
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

  it('classifies rerank as RETRIEVAL', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.operation.name', value: 'rerank' }]))).toBe('RETRIEVAL');
  });

  it('classifies evaluate as AGENT', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.operation.name', value: 'evaluate' }]))).toBe('AGENT');
  });

  it('classifies fine_tuning as LLM_CALL', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.operation.name', value: 'fine_tuning' }]))).toBe('LLM_CALL');
  });

  it('classifies image_generation as LLM_CALL', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.operation.name', value: 'image_generation' }]))).toBe('LLM_CALL');
  });

  it('returns UNKNOWN_GENAI for an unrecognized gen_ai.operation.name', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.operation.name', value: 'some_new_op' }]))).toBe(
      'UNKNOWN_GENAI'
    );
  });

  it('returns UNKNOWN_GENAI for a span with generic gen_ai.* attrs but no operation.name or secondary signals', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.unrecognized_attr', value: 'custom_value' }]))).toBe('UNKNOWN_GENAI');
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

  it('classifies gen_ai.agent.name as AGENT when operation.name is absent', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.agent.name', value: 'research_assistant' }]))).toBe('AGENT');
  });

  it('classifies gen_ai.request.model or gen_ai.response.model as LLM_CALL when operation.name is absent', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.request.model', value: 'gpt-4o' }]))).toBe('LLM_CALL');
    expect(classifySpan(makeSpan([{ key: 'gen_ai.response.model', value: 'gpt-4o' }]))).toBe('LLM_CALL');
  });

  it('classifies gen_ai.retrieval.query as RETRIEVAL when operation.name is absent', () => {
    expect(classifySpan(makeSpan([{ key: 'gen_ai.retrieval.query', value: 'distributed tracing in k8s' }]))).toBe('RETRIEVAL');
  });

  it('lets a recognized operation.name win over secondary signals', () => {
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

  it('still returns UNKNOWN_GENAI when tool.call.id accompanies an unrecognized gen_ai.* key', () => {
    const span = makeSpan([
      { key: 'gen_ai.tool.call.id', value: 'abc-123' },
      { key: 'gen_ai.unrecognized_attr', value: 'val' },
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
