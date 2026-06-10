// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { classifySpan, isGenAITrace } from './detect';
import type { IOtelSpan, IOtelTrace } from '../../types/otel';

function makeSpan(attrs: Record<string, string> = {}): IOtelSpan {
  return {
    attributes: Object.entries(attrs).map(([key, value]) => ({ key, value })),
  } as unknown as IOtelSpan;
}

describe('classifySpan', () => {
  it('returns STANDARD for span with no gen_ai.* attributes', () => {
    expect(classifySpan(makeSpan({ 'http.method': 'GET' }))).toBe('STANDARD');
  });

  it('returns STANDARD for span with empty attributes', () => {
    expect(classifySpan(makeSpan())).toBe('STANDARD');
  });

  it('returns LLM_CALL for gen_ai.operation.name = chat', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'chat' }))).toBe('LLM_CALL');
  });

  it('returns LLM_CALL for gen_ai.operation.name = text_completion', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'text_completion' }))).toBe('LLM_CALL');
  });

  it('returns LLM_CALL for gen_ai.operation.name = embeddings', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'embeddings' }))).toBe('LLM_CALL');
  });

  it('returns LLM_CALL for gen_ai.operation.name = generate_content', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'generate_content' }))).toBe('LLM_CALL');
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

  it('returns UNKNOWN_GENAI for span with gen_ai.* attrs but no operation name', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.provider.name': 'openai' }))).toBe('UNKNOWN_GENAI');
  });

  it('returns UNKNOWN_GENAI for unknown gen_ai.operation.name value', () => {
    expect(classifySpan(makeSpan({ 'gen_ai.operation.name': 'future_unknown_op' }))).toBe('UNKNOWN_GENAI');
  });
});

describe('isGenAITrace', () => {
  it('returns true when any span has gen_ai.* attributes', () => {
    const trace = {
      spans: [makeSpan({ 'http.method': 'GET' }), makeSpan({ 'gen_ai.operation.name': 'chat' })],
    } as unknown as IOtelTrace;
    expect(isGenAITrace(trace)).toBe(true);
  });

  it('returns false when no span has gen_ai.* attributes', () => {
    const trace = {
      spans: [makeSpan({ 'http.method': 'GET' }), makeSpan({ 'db.system': 'postgresql' })],
    } as unknown as IOtelTrace;
    expect(isGenAITrace(trace)).toBe(false);
  });

  it('returns false for an empty trace', () => {
    const trace = { spans: [] } as unknown as IOtelTrace;
    expect(isGenAITrace(trace)).toBe(false);
  });

  it('returns true when all spans have gen_ai.* attributes', () => {
    const trace = {
      spans: [
        makeSpan({ 'gen_ai.operation.name': 'chat' }),
        makeSpan({ 'gen_ai.operation.name': 'execute_tool' }),
      ],
    } as unknown as IOtelTrace;
    expect(isGenAITrace(trace)).toBe(true);
  });
});
