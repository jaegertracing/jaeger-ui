// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IAttribute, IOtelSpan, IOtelTrace } from '../../types/otel';

/**
 * Span classification based on OTel GenAI semantic conventions.
 * https://opentelemetry.io/docs/specs/semconv/gen-ai/
 */
export type GenAISpanKind = 'LLM_CALL' | 'TOOL_CALL' | 'AGENT' | 'RETRIEVAL' | 'UNKNOWN_GENAI' | 'STANDARD';

const LLM_OPS = new Set(['chat', 'text_completion', 'generate_content', 'embeddings']);
const TOOL_OPS = new Set(['execute_tool']);
const AGENT_OPS = new Set(['invoke_agent', 'create_agent', 'invoke_workflow']);
const RETRIEVAL_OPS = new Set(['retrieval']);

function getStringAttribute(attributes: ReadonlyArray<IAttribute>, key: string): string | undefined {
  const attr = attributes.find(a => a.key === key);
  return attr !== undefined && typeof attr.value === 'string' ? attr.value : undefined;
}

export function hasGenAIAttributes(attributes: ReadonlyArray<IAttribute>): boolean {
  return attributes.some(a => a.key.startsWith('gen_ai.'));
}

/**
 * Classifies a single span by its gen_ai.operation.name attribute.
 * Returns 'STANDARD' for any span with no gen_ai.* attributes.
 */
export function classifySpan(span: IOtelSpan): GenAISpanKind {
  if (!hasGenAIAttributes(span.attributes)) {
    return 'STANDARD';
  }
  const op = getStringAttribute(span.attributes, 'gen_ai.operation.name');
  if (op === undefined) {
    return 'UNKNOWN_GENAI';
  }
  if (LLM_OPS.has(op)) return 'LLM_CALL';
  if (TOOL_OPS.has(op)) return 'TOOL_CALL';
  if (AGENT_OPS.has(op)) return 'AGENT';
  if (RETRIEVAL_OPS.has(op)) return 'RETRIEVAL';
  return 'UNKNOWN_GENAI';
}

/**
 * Returns true if the span carries any gen_ai.* attributes, i.e. it is not
 * classified as 'STANDARD'. Used to decide whether to show GenAI-specific UI
 * (the GenAI detail tab, rich-media attribute rendering) for a given span.
 */
export function isGenAISpan(span: IOtelSpan): boolean {
  return classifySpan(span) !== 'STANDARD';
}

/**
 * Returns true if any span in the trace carries gen_ai.* attributes.
 * Result is O(n*attrs) on first call; callers should cache it.
 */
export function isGenAITrace(trace: IOtelTrace): boolean {
  return trace.spans.some(span => hasGenAIAttributes(span.attributes));
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
