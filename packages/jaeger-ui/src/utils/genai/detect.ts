// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IAttribute } from '../../types/otel';

export type GenAISpanKind = 'LLM_CALL' | 'TOOL_CALL' | 'AGENT' | 'RETRIEVAL' | 'UNKNOWN_GENAI' | 'STANDARD';

type SpanAttrs = { attributes: ReadonlyArray<IAttribute> };

const OPERATION_TO_KIND: Partial<Record<string, GenAISpanKind>> = {
  chat: 'LLM_CALL',
  text_completion: 'LLM_CALL',
  execute_tool: 'TOOL_CALL',
  invoke_agent: 'AGENT',
  retrieval: 'RETRIEVAL',
};

export function classifySpan(span: SpanAttrs): GenAISpanKind {
  let hasGenAI = false;
  for (const attr of span.attributes) {
    if (attr.key === 'gen_ai.operation.name' && typeof attr.value === 'string') {
      return OPERATION_TO_KIND[attr.value] ?? 'UNKNOWN_GENAI';
    }
    if (!hasGenAI && attr.key.startsWith('gen_ai.')) {
      hasGenAI = true;
    }
  }
  return hasGenAI ? 'UNKNOWN_GENAI' : 'STANDARD';
}

export function isGenAITrace(spans: ReadonlyArray<SpanAttrs>): boolean {
  return spans.some(s => classifySpan(s) !== 'STANDARD');
}
