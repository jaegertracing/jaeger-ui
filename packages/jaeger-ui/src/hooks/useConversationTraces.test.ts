// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { jaegerClient } from '../api/v3/client';
import type { TraceSummary } from '../types/trace-summary';
import type { Microseconds } from '../types/units';
import {
  CONVERSATION_TURN_LIMIT,
  fetchConversationTraces,
  useConversationTraces,
} from './useConversationTraces';

function summary(traceID: string, startTime: number): TraceSummary {
  return {
    traceID,
    traceName: traceID,
    rootServiceName: 'svc',
    rootOperationName: 'op',
    startTime: startTime as Microseconds,
    duration: 1 as Microseconds,
    services: [],
  };
}

describe('fetchConversationTraces', () => {
  const now = new Date(Date.UTC(2026, 0, 31));
  let fetchSummaries: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSummaries = vi.spyOn(jaegerClient, 'fetchTraceSummaries');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('searches on gen_ai.conversation.id and returns the turns oldest first', async () => {
    fetchSummaries.mockResolvedValue([summary('late', 20), summary('early', 10)]);

    const result = await fetchConversationTraces(
      { conversationID: 'conv-1', service: 'agent', lookback: '1h' },
      now
    );

    expect(result).toEqual({
      attribute: 'gen_ai.conversation.id',
      turns: [summary('early', 10), summary('late', 20)],
    });
    expect(fetchSummaries).toHaveBeenCalledTimes(1);
    expect(fetchSummaries).toHaveBeenCalledWith({
      service: 'agent',
      start: String((now.valueOf() - 60 * 60 * 1000) * 1000),
      end: String(now.valueOf() * 1000),
      lookback: '1h',
      limit: CONVERSATION_TURN_LIMIT,
      tags: JSON.stringify({ 'gen_ai.conversation.id': 'conv-1' }),
    });
  });

  it('falls back to session.id when no trace has gen_ai.conversation.id', async () => {
    fetchSummaries.mockResolvedValueOnce([]).mockResolvedValueOnce([summary('t1', 10)]);

    const result = await fetchConversationTraces({ conversationID: 'sess-1', lookback: '7d' }, now);

    expect(result).toEqual({ attribute: 'session.id', turns: [summary('t1', 10)] });
    expect(fetchSummaries).toHaveBeenLastCalledWith(
      expect.objectContaining({ service: undefined, tags: JSON.stringify({ 'session.id': 'sess-1' }) })
    );
  });

  it('returns no turns when neither attribute matches', async () => {
    fetchSummaries.mockResolvedValue([]);

    expect(await fetchConversationTraces({ conversationID: 'x', lookback: '7d' }, now)).toEqual({
      turns: [],
    });
    expect(fetchSummaries).toHaveBeenCalledTimes(2);
  });
});

describe('useConversationTraces', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  });

  afterEach(() => {
    queryClient.clear();
    vi.restoreAllMocks();
  });

  it('does not fetch when the query is null', () => {
    const spy = vi.spyOn(jaegerClient, 'fetchTraceSummaries');
    const { result } = renderHook(() => useConversationTraces(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(spy).not.toHaveBeenCalled();
  });

  it('loads the turns of the conversation', async () => {
    vi.spyOn(jaegerClient, 'fetchTraceSummaries').mockResolvedValue([summary('t1', 10)]);
    const { result } = renderHook(() => useConversationTraces({ conversationID: 'conv-1', lookback: '7d' }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.turns.map(t => t.traceID)).toEqual(['t1']);
  });
});
