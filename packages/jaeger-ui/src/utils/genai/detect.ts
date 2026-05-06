// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan, IOtelTrace } from '../../types/otel';

export type GenAISpanKind = 'LLM_CALL' | 'TOOL_CALL' | 'AGENT' | 'RETRIEVAL' | 'UNKNOWN_GENAI' | 'STANDARD';

const OPERATION_NAME_MAP: Record<string, GenAISpanKind> = {
  chat: 'LLM_CALL',
  text_completion: 'LLM_CALL',
  execute_tool: 'TOOL_CALL',
  invoke_agent: 'AGENT',
  retrieval: 'RETRIEVAL',
};

export function classifySpan(span: IOtelSpan): GenAISpanKind {
  const opAttr = span.attributes.find(a => a.key === 'gen_ai.operation.name');
  if (opAttr) {
    return OPERATION_NAME_MAP[String(opAttr.value)] ?? 'UNKNOWN_GENAI';
  }
  return span.attributes.some(a => a.key.startsWith('gen_ai.')) ? 'UNKNOWN_GENAI' : 'STANDARD';
}

export function isGenAITrace(trace: IOtelTrace): boolean {
  return trace.spans.some(s => classifySpan(s) !== 'STANDARD');
}
