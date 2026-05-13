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

/**
 * The semantic role of a span in a GenAI agent trace.
 * Drives icon selection and side-panel renderer choice.
 */
export type GenAISpanKind = 'llm' | 'tool' | 'retrieval' | 'agent';

/**
 * Returns the GenAI kind of a span, or null if the span carries no gen_ai.* attributes
 * and is not a vector-DB retrieval.
 *
 * Precedence (first match wins):
 *   'tool'      — gen_ai.tool.name is present
 *   'retrieval' — db.system === 'vector'
 *   'agent'     — agent.episode_id is present (custom, non-standard)
 *   'llm'       — gen_ai.operation.name is present OR any key has gen_ai. prefix
 *
 * Note: gen_ai.tool.call.id alone (without gen_ai.tool.name) returns null.
 * Note: false-positive retrieval spans in non-GenAI traces are guarded by isGenAITrace
 *       at the trace level; do not add ancestor traversal here.
 *
 * O(k) where k = number of attributes on the span. Safe to call in render cycles
 * when memoized per span.
 */
export function detectGenAISpan(span: IOtelSpan): GenAISpanKind | null {
  if (getAttr(span, GEN_AI_TOOL_NAME) !== undefined) return 'tool';
  if (getAttr(span, DB_SYSTEM) === 'vector') return 'retrieval';
  if (getAttr(span, 'agent.episode_id') !== undefined) return 'agent';
  if (getAttr(span, GEN_AI_OPERATION_NAME) !== undefined) return 'llm';
  // gen_ai.tool.call.id alone (without gen_ai.tool.name) is treated as unknown:
  // it's an opaque cross-span reference that doesn't identify what was called.
  if (span.attributes.some(a => a.key.startsWith(GEN_AI_PREFIX) && a.key !== GEN_AI_TOOL_CALL_ID))
    return 'llm';
  return null;
}

/**
 * Returns true if any span in the trace is recognised by detectGenAISpan.
 * Delegates to detectGenAISpan so the two predicates can never diverge.
 *
 * O(n·k) where n = span count, k = avg attributes per span.
 * Call only in a trace-load effect, not in render paths.
 */
export function isGenAITrace(trace: IOtelTrace): boolean {
  return trace.spans.some(span => detectGenAISpan(span) !== null);
}
