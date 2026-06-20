// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { classifySpan, isGenAITrace } from './detect';
import type { IOtelSpan } from '../../types/otel';

function makeSpan(attrs: { key: string; value: string }[]): IOtelSpan {
  return { attributes: attrs } as unknown as IOtelSpan;
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

  it('returns STANDARD for a span with no gen_ai.* attrs', () => {
    expect(classifySpan(makeSpan([{ key: 'http.method', value: 'GET' }]))).toBe('STANDARD');
  });

  it('returns STANDARD for a span with empty attributes', () => {
    expect(classifySpan(makeSpan([]))).toBe('STANDARD');
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
