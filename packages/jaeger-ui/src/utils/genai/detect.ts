// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IAttributes, GenAISpanKind } from '../../types/otel';
import { GEN_AI_NAMESPACE, GEN_AI_OPERATION_NAME } from '../../constants/span-attributes';

type SpanAttrs = { attributes: IAttributes };

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

// Looks for gen_ai.operation.name while also tracking whether any gen_ai.*
// attribute was seen, so a span with GenAI attributes but an unrecognized
// (or missing) operation name still maps to UNKNOWN_GENAI instead of undefined.
export function classifySpan(span: SpanAttrs): GenAISpanKind | undefined {
  const operation = span.attributes.getValue(GEN_AI_OPERATION_NAME);
  if (typeof operation === 'string') {
    return OPERATION_TO_KIND[operation] ?? 'UNKNOWN_GENAI';
  }
  const hasGenAI = span.attributes.keys().some(key => key.startsWith(GEN_AI_NAMESPACE));
  return hasGenAI ? 'UNKNOWN_GENAI' : undefined;
}

export function isGenAISpan(span: SpanAttrs): boolean {
  return classifySpan(span) !== undefined;
}

export function isGenAITrace(spans: ReadonlyArray<SpanAttrs>): boolean {
  return spans.some(s => classifySpan(s) !== undefined);
}
