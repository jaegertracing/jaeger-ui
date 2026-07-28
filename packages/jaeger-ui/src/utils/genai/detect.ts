// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IAttributes, GenAISpanKind } from '../../types/otel';
import {
  AGENT_EPISODE_ID,
  DB_SYSTEM,
  DB_SYSTEM_VECTOR,
  GEN_AI_NAMESPACE,
  GEN_AI_OPERATION_NAME,
  GEN_AI_TOOL_CALL_ID,
  GEN_AI_TOOL_NAME,
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
};

/**
 * Signals that identify a span kind when gen_ai.operation.name is absent or
 * carries a value we don't recognize. Deliberately consulted *after* the
 * operation name: that attribute is the spec's own discriminator, so a
 * recognized value always wins over these heuristics.
 *
 * The db.system and agent.episode_id signals also catch spans carrying no
 * gen_ai.* attributes at all, emitted by instrumentation that is not
 * GenAI-aware but is taking part in a GenAI workflow.
 *
 * agent.episode_id is checked last because frameworks stamp it on every span
 * in an episode, not just the agent span — it is only meaningful once the
 * more specific signals have been ruled out.
 */
function classifyBySecondarySignals(attributes: IAttributes): GenAISpanKind | undefined {
  if (attributes.has(GEN_AI_TOOL_NAME)) return 'TOOL_CALL';
  if (attributes.getValue(DB_SYSTEM) === DB_SYSTEM_VECTOR) return 'RETRIEVAL';
  if (attributes.has(AGENT_EPISODE_ID)) return 'AGENT';
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
