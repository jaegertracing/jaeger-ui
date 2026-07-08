// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { classifySpan, isGenAISpan, isGenAITrace, RICH_MEDIA_ATTRIBUTE_KEYS } from './detect';
import type { IAttribute } from '../../types/otel';

function makeSpan(attrs: IAttribute[]): { attributes: IAttribute[] } {
  return { attributes: attrs };
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
