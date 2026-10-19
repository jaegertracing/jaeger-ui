// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { attachAgUiEventNormalizer, normalizeAgUiEvents, type IAgUiStreamEvent } from './agUiEventNormalizer';

// Mirrors @assistant-ui/react-ag-ui 0.0.35 RunAggregator: one text buffer per
// messageId, reused even after a tool call clears the active id. Tool calls
// append in arrival order. Deltas are concatenated with no trimming.
function assembleLikeAgUi035(events: readonly IAgUiStreamEvent[]) {
  const buffers = new Map<string, string>();
  const order: Array<{ kind: 'text'; id: string } | { kind: 'tool'; name: string }> = [];
  let active: string | undefined;

  for (const event of events) {
    if (
      event.type === 'TEXT_MESSAGE_START' ||
      event.type === 'TEXT_MESSAGE_CONTENT' ||
      event.type === 'TEXT_MESSAGE_CHUNK'
    ) {
      const id = event.messageId ?? active ?? 'anon';
      if (!buffers.has(id)) {
        buffers.set(id, '');
        order.push({ kind: 'text', id });
      }
      if (event.delta) buffers.set(id, `${buffers.get(id) ?? ''}${event.delta}`);
      active = id;
    } else if (event.type === 'TEXT_MESSAGE_END') {
      if (event.messageId && active === event.messageId) active = undefined;
    } else if (event.type === 'TOOL_CALL_START') {
      active = undefined;
      order.push({ kind: 'tool', name: event.toolCallName ?? 'tool' });
    }
  }

  return order.map(part =>
    part.kind === 'text'
      ? { type: 'text' as const, text: buffers.get(part.id) ?? '' }
      : { type: 'tool-call' as const, toolName: part.name }
  );
}

describe('normalizeAgUiEvents', () => {
  it('keeps whitespace when joining text deltas, including whitespace-only chunks', () => {
    const events: IAgUiStreamEvent[] = [
      { type: 'TEXT_MESSAGE_START', messageId: 'm' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: 'Hello' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: ' world' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: '\n\n' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: 'Next' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: '  padded  ' },
    ];

    const [text] = assembleLikeAgUi035(normalizeAgUiEvents(events));
    expect(text).toEqual({ type: 'text', text: 'Hello world\n\nNext  padded  ' });
  });

  it('does not concatenate separate text messages that reuse one id', () => {
    const events: IAgUiStreamEvent[] = [
      { type: 'TEXT_MESSAGE_START', messageId: 'm' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: 'critical path.' },
      { type: 'TEXT_MESSAGE_END', messageId: 'm' },
      { type: 'TEXT_MESSAGE_START', messageId: 'm' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: 'MySQL' },
    ];

    const glued = assembleLikeAgUi035(events).filter(part => part.type === 'text');
    expect(glued).toEqual([{ type: 'text', text: 'critical path.MySQL' }]);

    const parts = assembleLikeAgUi035(normalizeAgUiEvents(events));
    expect(parts).toEqual([
      { type: 'text', text: 'critical path.' },
      { type: 'text', text: 'MySQL' },
    ]);
  });

  it('keeps tool-call parts in event order between text segments', () => {
    // Jaeger v2.22 streams one message id for the whole run and emits tool
    // calls between text deltas. 0.0.35 folds every delta back into the first
    // text part, so the tools render as a group around one block.
    const events: IAgUiStreamEvent[] = [
      { type: 'TEXT_MESSAGE_START', messageId: 'm' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: 'critical path.' },
      { type: 'TOOL_CALL_START', toolCallId: 't1', toolCallName: 'mcp__jaeger__search_traces' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: 'MySQL' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: ' runs 12' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: '\n' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: 'Redis' },
      { type: 'TOOL_CALL_START', toolCallId: 't2', toolCallName: 'mcp__jaeger__get_critical_path' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: ' done' },
    ];

    const broken = assembleLikeAgUi035(events);
    expect(broken.filter(part => part.type === 'text')).toHaveLength(1);
    expect(broken[0]).toEqual({
      type: 'text',
      text: 'critical path.MySQL runs 12\nRedis done',
    });

    expect(assembleLikeAgUi035(normalizeAgUiEvents(events))).toEqual([
      { type: 'text', text: 'critical path.' },
      { type: 'tool-call', toolName: 'mcp__jaeger__search_traces' },
      { type: 'text', text: 'MySQL runs 12\nRedis' },
      { type: 'tool-call', toolName: 'mcp__jaeger__get_critical_path' },
      { type: 'text', text: ' done' },
    ]);
  });

  it('preserves a whitespace-only delta instead of dropping it', () => {
    const [event] = normalizeAgUiEvents([{ type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: '\n\n' }]);
    expect(event?.delta).toBe('\n\n');
  });
});

describe('attachAgUiEventNormalizer', () => {
  it('rewrites events on the subscriber passed to runAgent', () => {
    const seen: IAgUiStreamEvent[] = [];
    const agent = {
      runAgent(_input: unknown, subscriber: Record<string, (payload: { event: IAgUiStreamEvent }) => void>) {
        subscriber.onTextMessageContentEvent?.({
          event: { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: 'critical path.' },
        });
        subscriber.onToolCallStartEvent?.({
          event: { type: 'TOOL_CALL_START', toolCallId: 't', toolCallName: 'mcp__jaeger__search_traces' },
        });
        subscriber.onTextMessageContentEvent?.({
          event: { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: 'MySQL' },
        });
      },
    };

    attachAgUiEventNormalizer(agent);
    agent.runAgent(undefined, {
      onTextMessageContentEvent: ({ event }) => seen.push(event),
      onToolCallStartEvent: ({ event }) => seen.push(event),
    });

    expect(seen.map(event => event.messageId)).toEqual(['m', undefined, expect.not.stringMatching(/^m$/)]);
    expect(seen[2]?.messageId).not.toBe('m');
    expect(seen[2]?.delta).toBe('MySQL');
    expect(seen[1]?.toolCallName).toBe('mcp__jaeger__search_traces');
  });
});
