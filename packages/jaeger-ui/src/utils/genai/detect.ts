// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IOtelSpan, IOtelTrace } from '../../types/otel';

export type GenAISpanKind = 'LLM_CALL' | 'TOOL_CALL' | 'AGENT' | 'RETRIEVAL' | 'UNKNOWN_GENAI' | 'STANDARD';

const LLM_OPS = new Set(['chat', 'text_completion', 'generate_content', 'embeddings']);
const TOOL_OPS = new Set(['execute_tool']);
const AGENT_OPS = new Set(['invoke_agent', 'create_agent', 'invoke_workflow']);
const RETRIEVAL_OPS = new Set(['retrieval']);

export function classifySpan(span: IOtelSpan): GenAISpanKind {
  let foundGenAI = false;
  for (const attr of span.attributes) {
    if (attr.key === 'gen_ai.operation.name' && typeof attr.value === 'string') {
      const op = attr.value;
      if (LLM_OPS.has(op)) return 'LLM_CALL';
      if (TOOL_OPS.has(op)) return 'TOOL_CALL';
      if (AGENT_OPS.has(op)) return 'AGENT';
      if (RETRIEVAL_OPS.has(op)) return 'RETRIEVAL';
      return 'UNKNOWN_GENAI';
    }
    if (attr.key.startsWith('gen_ai.')) {
      foundGenAI = true;
    }
  }
  return foundGenAI ? 'UNKNOWN_GENAI' : 'STANDARD';
}

export function isGenAITrace(trace: Pick<IOtelTrace, 'spans'>): boolean {
  return trace.spans.some(span => classifySpan(span) !== 'STANDARD');
}

export const RICH_MEDIA_ATTRIBUTE_KEYS: Readonly<Record<string, 'markdown' | 'json'>> = {
  'gen_ai.input.messages': 'markdown',
  'gen_ai.output.messages': 'markdown',
  'gen_ai.system_instructions': 'markdown',
  'gen_ai.tool.call.arguments': 'json',
  'gen_ai.tool.call.result': 'json',
  'gen_ai.tool.definitions': 'json',
  'gen_ai.retrieval.documents': 'json',
};
