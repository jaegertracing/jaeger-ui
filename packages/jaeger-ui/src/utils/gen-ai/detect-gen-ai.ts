// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan, IOtelTrace } from '../../types/otel';
import {
  DB_SYSTEM,
  GEN_AI_OPERATION_NAME,
  GEN_AI_PREFIX,
  GEN_AI_TOOL_CALL_ID,
  GEN_AI_TOOL_NAME,
  getAttr,
} from './gen-ai-attrs';

export type GenAISpanKind = 'llm' | 'tool' | 'retrieval' | 'agent';

// Returns the GenAI kind for a span, or null if it carries no relevant attributes.
// gen_ai.tool.call.id alone (without gen_ai.tool.name) returns null — it's a
// cross-span reference that doesn't identify what was called.
export function detectGenAISpan(span: IOtelSpan): GenAISpanKind | null {
  if (getAttr(span, GEN_AI_TOOL_NAME) !== undefined) return 'tool';
  if (getAttr(span, DB_SYSTEM) === 'vector') return 'retrieval';
  if (getAttr(span, 'agent.episode_id') !== undefined) return 'agent';
  if (getAttr(span, GEN_AI_OPERATION_NAME) !== undefined) return 'llm';
  if (span.attributes.some(a => a.key.startsWith(GEN_AI_PREFIX) && a.key !== GEN_AI_TOOL_CALL_ID))
    return 'llm';
  return null;
}

// Delegates to detectGenAISpan so trace-level detection and span rendering stay in sync.
export function isGenAITrace(trace: IOtelTrace): boolean {
  return trace.spans.some(span => detectGenAISpan(span) !== null);
}
