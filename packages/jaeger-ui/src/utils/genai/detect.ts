// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IAttribute } from '../../types/otel';
import { SpanAttributeNamespace, GEN_AI_OPERATION_NAME } from '../../constants/span-attributes';

type GenAISpanKind = 'LLM_CALL' | 'TOOL_CALL' | 'AGENT' | 'RETRIEVAL' | 'UNKNOWN_GENAI' | 'STANDARD';

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

export function isGenAISpan(span: SpanAttrs): boolean {
  return span.attributes.some(({ key }) => key.startsWith(SpanAttributeNamespace.GEN_AI));
}

export function classifySpan(span: SpanAttrs): GenAISpanKind {
  const opAttr = span.attributes.find(({ key }) => key === GEN_AI_OPERATION_NAME);
  if (opAttr && typeof opAttr.value === 'string') {
    return OPERATION_TO_KIND[opAttr.value] ?? 'UNKNOWN_GENAI';
  }
  return isGenAISpan(span) ? 'UNKNOWN_GENAI' : 'STANDARD';
}

export function isGenAITrace(spans: ReadonlyArray<SpanAttrs>): boolean {
  return spans.some(s => classifySpan(s) !== 'STANDARD');
}
