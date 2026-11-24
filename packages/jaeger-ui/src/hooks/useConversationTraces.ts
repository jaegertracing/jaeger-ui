// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useQuery, skipToken, UseQueryResult } from '@tanstack/react-query';

import { jaegerClient } from '../api/v3/client';
import {
  CONVERSATION_ID_ATTRIBUTES,
  orderTurns,
  type ConversationIdAttribute,
} from '../components/ConversationPage/conversation';
import { lookbackToTimestamp } from '../utils/time-range-options';
import type { TraceSummary } from '../types/trace-summary';

// The most turns one conversation view asks the backend for.
export const CONVERSATION_TURN_LIMIT = 100;

export type ConversationQuery = {
  conversationID: string;
  service?: string;
  lookback: string;
};

export type ConversationTraces = {
  /** The attribute the turns matched on, or undefined when no trace matched either one. */
  attribute?: ConversationIdAttribute;
  /** Traces of the conversation, oldest first. */
  turns: TraceSummary[];
};

/**
 * Finds the traces of one conversation through the existing trace search. It searches on
 * gen_ai.conversation.id first and, only when nothing matches, on session.id, since some
 * frameworks set only the latter.
 */
export async function fetchConversationTraces(
  { conversationID, service, lookback }: ConversationQuery,
  now: Date = new Date()
): Promise<ConversationTraces> {
  const start = String(lookbackToTimestamp(lookback, now));
  const end = String(now.valueOf() * 1000);
  for (const attribute of CONVERSATION_ID_ATTRIBUTES) {
    const results = await jaegerClient.fetchTraceSummaries({
      service,
      start,
      end,
      lookback,
      limit: CONVERSATION_TURN_LIMIT,
      tags: JSON.stringify({ [attribute]: conversationID }),
    });
    if (results.length > 0) return { attribute, turns: orderTurns(results) };
  }
  return { turns: [] };
}

/** Pass null to suppress the fetch, e.g. while a required service is not selected. */
export function useConversationTraces(query: ConversationQuery | null): UseQueryResult<ConversationTraces> {
  return useQuery({
    queryKey: ['conversationTraces', query],
    queryFn: query ? () => fetchConversationTraces(query) : skipToken,
    staleTime: 60 * 1000,
  });
}
