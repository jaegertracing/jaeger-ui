// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { classifySpan, hasGenAIAttributes, isGenAITrace } from './detect';
import type { IOtelSpan, IOtelTrace } from '../../types/otel';

function makeSpan(attrs: Record<string, string>): IOtelSpan {
  return {
    attributes: Object.entries(attrs).map(([key, value]) => ({ key, value })),
  } as unknown as IOtelSpan;
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

  it('returns false for empty attributes', () => {
    expect(hasGenAIAttributes([])).toBe(false);
  });
});

describe('classifySpan', () => {
  it('returns STANDARD for span with no gen_ai.* attributes', () => {
    expect(classifySpan(makeSpan({ 'http.method': 'GET' }))).toBe('STANDARD');
  });

  it('returns LLM_CALL for chat', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'chat' }))).toBe('LLM_CALL');
  });

  it('returns LLM_CALL for text_completion', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'text_completion' }))).toBe('LLM_CALL');
  });

  it('returns LLM_CALL for generate_content', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'generate_content' }))).toBe('LLM_CALL');
  });

  it('returns LLM_CALL for embeddings', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'embeddings' }))).toBe('LLM_CALL');
  });

  it('returns TOOL_CALL for execute_tool', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'execute_tool' }))).toBe('TOOL_CALL');
  });

  it('returns AGENT for invoke_agent', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'invoke_agent' }))).toBe('AGENT');
  });

  it('returns AGENT for create_agent', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'create_agent' }))).toBe('AGENT');
  });

  it('returns AGENT for invoke_workflow', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'invoke_workflow' }))).toBe('AGENT');
  });

  it('returns RETRIEVAL for retrieval', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'retrieval' }))).toBe('RETRIEVAL');
  });

  it('returns UNKNOWN_GENAI when gen_ai.* attrs exist but operation.name is absent', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.provider.name': 'openai' }))).toBe('UNKNOWN_GENAI');
  });

  it('returns UNKNOWN_GENAI for unrecognised gen_ai.operation.name value', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'future_op' }))).toBe('UNKNOWN_GENAI');
  });
});

describe('isGenAITrace', () => {
  it('returns true when at least one span has gen_ai.* attributes', () => {
    const trace = makeTrace([makeSpan({ 'http.method': 'GET' }), makeSpan({ 'gen_ai.operation.name': 'chat' })]);
    expect(isGenAITrace(trace)).toBe(true);
  });

  it('returns false when no span has gen_ai.* attributes', () => {
    const trace = makeTrace([makeSpan({ 'http.method': 'GET' }), makeSpan({ 'db.system': 'postgresql' })]);
    expect(isGenAITrace(trace)).toBe(false);
  });

  it('returns false for an empty trace', () => {
    expect(isGenAITrace(makeTrace([]))).toBe(false);
  });
});
