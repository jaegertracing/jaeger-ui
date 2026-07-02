// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IAttribute, GenAISpanKind } from '../../types/otel';
import { GEN_AI_NAMESPACE, GEN_AI_OPERATION_NAME } from '../../constants/span-attributes';

type SpanAttrs = { attributes: ReadonlyArray<IAttribute> };

const OPERATION_TO_KIND: Partial<Record<string, GenAISpanKind>> = {
  chat: 'LLM_CALL',
  text_completion: 'LLM_CALL',
  generate_content: 'LLM_CALL',
  embeddings: 'LLM_CALL',
  execute_tool: 'TOOL_CALL',
  invoke_agent: 'AGENT',
  create_agent: 'AGENT',
  invoke_workflow: 'AGENT',
  retrieval: 'RETRIEVAL',
};

// Single pass over attributes: looks for gen_ai.operation.name while also
// tracking whether any gen_ai.* attribute was seen, so a span with GenAI
// attributes but an unrecognized (or missing) operation name still maps to
// UNKNOWN_GENAI instead of STANDARD.
export function classifySpan(span: SpanAttrs): GenAISpanKind {
  let hasGenAI = false;
  for (const { key, value } of span.attributes) {
    if (key === GEN_AI_OPERATION_NAME && typeof value === 'string') {
      return OPERATION_TO_KIND[value] ?? 'UNKNOWN_GENAI';
    }
    if (!hasGenAI && key.startsWith(GEN_AI_NAMESPACE)) {
      hasGenAI = true;
    }
  }
  return hasGenAI ? 'UNKNOWN_GENAI' : 'STANDARD';
}

export function isGenAISpan(span: SpanAttrs): boolean {
  return classifySpan(span) !== 'STANDARD';
}

export function isGenAITrace(spans: ReadonlyArray<SpanAttrs>): boolean {
  return spans.some(s => classifySpan(s) !== 'STANDARD');
}
