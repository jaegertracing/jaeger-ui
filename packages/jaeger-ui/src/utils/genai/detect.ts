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
// UNKNOWN_GENAI instead of undefined.
export function classifySpan(span: SpanAttrs): GenAISpanKind | undefined {
  let hasGenAI = false;
  for (const { key, value } of span.attributes) {
    if (key === GEN_AI_OPERATION_NAME && typeof value === 'string') {
      return OPERATION_TO_KIND[value] ?? 'UNKNOWN_GENAI';
    }
    if (!hasGenAI && key.startsWith(GEN_AI_NAMESPACE)) {
      hasGenAI = true;
    }
  }
  return hasGenAI ? 'UNKNOWN_GENAI' : undefined;
}

export function isGenAISpan(span: SpanAttrs): boolean {
  return classifySpan(span) !== undefined;
}

export function isGenAITrace(spans: ReadonlyArray<SpanAttrs>): boolean {
  return spans.some(s => classifySpan(s) !== undefined);
}

/**
 * Attribute keys defined by OTel GenAI semconv that carry rich content
 * (structured JSON or human-readable text) and need specialized rendering.
 *
 * 'json'     - render with react-json-view-lite
 * 'markdown' - render as preformatted text (Markdown-like prompts/completions)
 */
export const RICH_MEDIA_ATTRIBUTE_KEYS: Readonly<Record<string, 'json' | 'markdown'>> = {
  'gen_ai.input.messages': 'markdown',
  'gen_ai.output.messages': 'markdown',
  'gen_ai.system_instructions': 'markdown',
  'gen_ai.tool.call.arguments': 'json',
  'gen_ai.tool.call.result': 'json',
  'gen_ai.tool.definitions': 'json',
  'gen_ai.retrieval.documents': 'json',
};
