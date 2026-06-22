// Copyright (c) 2026 The Jaeger Authors.
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
  let hasGenAI = false;
  for (const attr of span.attributes) {
    if (attr.key === 'gen_ai.operation.name') {
      return OPERATION_NAME_MAP[String(attr.value)] ?? 'UNKNOWN_GENAI';
    }
    if (!hasGenAI && attr.key.startsWith('gen_ai.')) {
      hasGenAI = true;
    }
  }
  return hasGenAI ? 'UNKNOWN_GENAI' : 'STANDARD';
}

export function isGenAITrace(trace: Pick<IOtelTrace, 'spans'>): boolean {
  return trace.spans.some(s => classifySpan(s) !== 'STANDARD');
}

// Attribute keys that carry structured GenAI content and deserve richer rendering.
export const RICH_MEDIA_ATTRIBUTE_KEYS = {
  'gen_ai.input.messages': 'markdown',
  'gen_ai.output.messages': 'markdown',
  'gen_ai.system_instructions': 'markdown',
  'gen_ai.tool.call.arguments': 'json',
  'gen_ai.tool.call.result': 'json',
  'gen_ai.tool.definitions': 'json',
  'gen_ai.retrieval.documents': 'json',
} as const satisfies Readonly<Record<string, 'markdown' | 'json'>>;

export type RichMediaAttributeKey = keyof typeof RICH_MEDIA_ATTRIBUTE_KEYS;
