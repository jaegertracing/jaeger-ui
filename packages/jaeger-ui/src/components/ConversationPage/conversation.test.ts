// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { makeAttributes } from '../../model/attributes';
import { makeOtelSpan } from '../../utils/test/makeOtelSpan';
import type { AttributeValue } from '../../types/otel';
import type { TraceSummary } from '../../types/trace-summary';
import type { Microseconds } from '../../types/units';
import { findConversationRef, lookbackCovering, orderTurns } from './conversation';

function spanWith(service: string, attrs: Record<string, AttributeValue>) {
  return makeOtelSpan({
    attributes: makeAttributes(Object.entries(attrs).map(([key, value]) => ({ key, value }))),
    resource: { attributes: makeAttributes(), serviceName: service },
  });
}

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

describe('findConversationRef', () => {
  it('returns undefined when no span records a conversation', () => {
    expect(findConversationRef([spanWith('a', { 'gen_ai.operation.name': 'chat' })])).toBeUndefined();
  });

  it('reads gen_ai.conversation.id with the service of the span that carries it', () => {
    const spans = [spanWith('gateway', {}), spanWith('agent', { 'gen_ai.conversation.id': 'conv-1' })];
    expect(findConversationRef(spans)).toEqual({
      id: 'conv-1',
      attribute: 'gen_ai.conversation.id',
      service: 'agent',
    });
  });

  it('falls back to session.id when no span has gen_ai.conversation.id', () => {
    expect(findConversationRef([spanWith('agent', { 'session.id': 'sess-1' })])).toEqual({
      id: 'sess-1',
      attribute: 'session.id',
      service: 'agent',
    });
  });

  it('prefers gen_ai.conversation.id on a later span over session.id on an earlier one', () => {
    const spans = [
      spanWith('web', { 'session.id': 'sess-1' }),
      spanWith('agent', { 'gen_ai.conversation.id': 'conv-1' }),
    ];
    expect(findConversationRef(spans)?.attribute).toBe('gen_ai.conversation.id');
  });

  it('accepts numeric IDs and skips blank or non-scalar values', () => {
    expect(findConversationRef([spanWith('a', { 'session.id': 42 })])?.id).toBe('42');
    expect(findConversationRef([spanWith('a', { 'gen_ai.conversation.id': '  ' })])).toBeUndefined();
    expect(findConversationRef([spanWith('a', { 'gen_ai.conversation.id': true })])).toBeUndefined();
  });
});

describe('orderTurns', () => {
  it('sorts oldest first and breaks ties by trace ID without mutating the input', () => {
    const input = [summary('c', 30), summary('b', 10), summary('a', 10)];
    expect(orderTurns(input).map(s => s.traceID)).toEqual(['a', 'b', 'c']);
    expect(input.map(s => s.traceID)).toEqual(['c', 'b', 'a']);
  });
});

describe('lookbackCovering', () => {
  const DAY_US = 24 * 60 * 60 * 1000 * 1000;
  const now = Date.UTC(2026, 0, 31);
  const daysAgo = (days: number) => (now * 1000 - days * DAY_US) as Microseconds;

  it('uses the default window for a recent trace', () => {
    expect(lookbackCovering(daysAgo(1), now)).toBe('7d');
  });

  it('widens the window so it reaches an older trace', () => {
    expect(lookbackCovering(daysAgo(10), now)).toBe('2w');
  });

  it('caps the window at the widest standard option', () => {
    expect(lookbackCovering(daysAgo(60), now)).toBe('4w');
  });
});
