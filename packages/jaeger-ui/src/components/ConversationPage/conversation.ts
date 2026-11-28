// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { GEN_AI_CONVERSATION_ID, SESSION_ID } from '../../constants/span-attributes';
import { lookbackFromDuration, TIME_RANGE_OPTIONS } from '../../utils/time-range-options';
import type { IOtelSpan } from '../../types/otel';
import type { TraceSummary } from '../../types/trace-summary';
import type { Microseconds } from '../../types/units';
import { DEFAULT_CONVERSATION_LOOKBACK } from './url';

/** Attributes that identify a conversation, in the order they are tried. */
export const CONVERSATION_ID_ATTRIBUTES = [GEN_AI_CONVERSATION_ID, SESSION_ID] as const;

export type ConversationIdAttribute = (typeof CONVERSATION_ID_ATTRIBUTES)[number];

export type ConversationRef = {
  id: string;
  attribute: ConversationIdAttribute;
  /** Service of the span that carries the attribute, so the search can be scoped to it. */
  service: string;
};

function attributeAsId(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() ? value : undefined;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return undefined;
}

/**
 * Finds the conversation a trace belongs to. gen_ai.conversation.id on any span wins over
 * session.id, so a trace that carries both is grouped the way the GenAI conventions intend.
 */
export function findConversationRef(spans: ReadonlyArray<IOtelSpan>): ConversationRef | undefined {
  for (const attribute of CONVERSATION_ID_ATTRIBUTES) {
    for (const span of spans) {
      const id = attributeAsId(span.attributes.getValue(attribute));
      if (id !== undefined) return { id, attribute, service: span.resource.serviceName };
    }
  }
  return undefined;
}

/** Orders the traces of a conversation as turns: oldest first, ties broken by trace ID. */
export function orderTurns(summaries: ReadonlyArray<TraceSummary>): TraceSummary[] {
  return [...summaries].sort((a, b) => a.startTime - b.startTime || a.traceID.localeCompare(b.traceID));
}

/**
 * Picks a lookback that reaches back to a trace started at `startTime`, so a link from an
 * older trace still finds that trace. Never narrower than the default window, and capped
 * at the widest standard option.
 */
export function lookbackCovering(startTime: Microseconds, now: number = Date.now()): string {
  const widest = TIME_RANGE_OPTIONS[TIME_RANGE_OPTIONS.length - 1];
  const defaultOption = TIME_RANGE_OPTIONS.find(o => o.lookback === DEFAULT_CONVERSATION_LOOKBACK);
  const ageUs = now * 1000 - startTime;
  if (!defaultOption || ageUs <= defaultOption.valueMs * 1000) return DEFAULT_CONVERSATION_LOOKBACK;
  const lookback = lookbackFromDuration(ageUs as Microseconds);
  return lookback === 'custom' ? widest.lookback : lookback;
}
