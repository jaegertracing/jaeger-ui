// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IAttributes, GenAISpanKind } from '../../types/otel';
import {
  GEN_AI_AGENT_ID,
  GEN_AI_AGENT_NAME,
  GEN_AI_NAMESPACE,
  GEN_AI_OPERATION_NAME,
  GEN_AI_PROVIDER_NAME,
  GEN_AI_REQUEST_MODEL,
  GEN_AI_RESPONSE_MODEL,
  GEN_AI_SYSTEM,
  GEN_AI_TOOL_CALL_ID,
  GEN_AI_TOOL_NAME,
  GEN_AI_USAGE_INPUT_TOKENS,
  GEN_AI_USAGE_OUTPUT_TOKENS,
} from '../../constants/span-attributes';

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
  rerank: 'RETRIEVAL',
  evaluate: 'AGENT',
  fine_tuning: 'LLM_CALL',
  speech_to_text: 'LLM_CALL',
  text_to_speech: 'LLM_CALL',
  audio_generation: 'LLM_CALL',
  image_generation: 'LLM_CALL',
};

/**
 * Signals that identify a span kind when gen_ai.operation.name is absent or
 * carries a value we don't recognize. Deliberately consulted *after* the
 * operation name: that attribute is the spec's own discriminator, so a
 * recognized value always wins over these heuristics.
 */
function classifyBySecondarySignals(attributes: IAttributes): GenAISpanKind | undefined {
  if (
    attributes.has(GEN_AI_TOOL_NAME) ||
    attributes.has('gen_ai.tool.call.arguments') ||
    attributes.has('gen_ai.tool.call.result')
  ) {
    return 'TOOL_CALL';
  }
  if (attributes.has(GEN_AI_AGENT_NAME) || attributes.has(GEN_AI_AGENT_ID)) {
    return 'AGENT';
  }
  if (
    attributes.has(GEN_AI_REQUEST_MODEL) ||
    attributes.has(GEN_AI_RESPONSE_MODEL) ||
    attributes.has(GEN_AI_USAGE_INPUT_TOKENS) ||
    attributes.has(GEN_AI_USAGE_OUTPUT_TOKENS) ||
    attributes.has('gen_ai.usage.prompt_tokens') ||
    attributes.has('gen_ai.usage.completion_tokens')
  ) {
    return 'LLM_CALL';
  }
  if (
    attributes.has('gen_ai.retrieval.query') ||
    attributes.has('gen_ai.data_source.id') ||
    attributes.has('gen_ai.data_source.name')
  ) {
    return 'RETRIEVAL';
  }
  return undefined;
}

// Looks for gen_ai.operation.name while also tracking whether any gen_ai.*
// attribute was seen, so a span with GenAI attributes but an unrecognized
// (or missing) operation name still maps to UNKNOWN_GENAI instead of undefined.
export function classifySpan(span: SpanAttrs): GenAISpanKind | undefined {
  const { attributes } = span;
  const operation = attributes.getValue(GEN_AI_OPERATION_NAME);
  if (typeof operation === 'string') {
    return OPERATION_TO_KIND[operation] ?? classifyBySecondarySignals(attributes) ?? 'UNKNOWN_GENAI';
  }

  const secondary = classifyBySecondarySignals(attributes);
  if (secondary) return secondary;

  // gen_ai.tool.call.id is excluded: it is a reference to a tool call made
  // elsewhere, so a span carrying only that key describes someone else's work
  // and is not itself a GenAI span.
  const hasGenAI = attributes
    .keys()
    .some(key => key.startsWith(GEN_AI_NAMESPACE) && key !== GEN_AI_TOOL_CALL_ID);
  return hasGenAI ? 'UNKNOWN_GENAI' : undefined;
}

export function isGenAISpan(span: SpanAttrs): boolean {
  return classifySpan(span) !== undefined;
}

export function isGenAITrace(spans: ReadonlyArray<SpanAttrs>): boolean {
  return spans.some(s => classifySpan(s) !== undefined);
}
