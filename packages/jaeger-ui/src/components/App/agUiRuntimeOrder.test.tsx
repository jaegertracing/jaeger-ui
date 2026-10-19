// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { HttpAgent } from '@ag-ui/client';
import { useAgUiRuntime } from '@assistant-ui/react-ag-ui';
import { AssistantRuntimeProvider, ThreadPrimitive, type AssistantRuntime } from '@assistant-ui/react';

import { attachAgUiEventNormalizer, type IAgUiStreamEvent } from './agUiEventNormalizer';
import { threadMessageComponents } from './JaegerAssistantPanel';

// Speaks the subscriber callbacks HttpAgent actually invokes. useAgUiRuntime
// builds that subscriber and passes it to runAgent; the normalizer only sees
// events if those callbacks still exist and still feed RunAggregator.
function scriptedAgent(events: readonly IAgUiStreamEvent[]) {
  return {
    threadId: 'main',
    messages: [] as unknown[],
    async runAgent(
      _input: unknown,
      subscriber: Record<
        string,
        ((payload?: { event: IAgUiStreamEvent }) => Promise<void> | void) | undefined
      >
    ) {
      const handlers: Record<string, string> = {
        TEXT_MESSAGE_START: 'onTextMessageStartEvent',
        TEXT_MESSAGE_CONTENT: 'onTextMessageContentEvent',
        TEXT_MESSAGE_END: 'onTextMessageEndEvent',
        TOOL_CALL_START: 'onToolCallStartEvent',
        TOOL_CALL_ARGS: 'onToolCallArgsEvent',
        TOOL_CALL_END: 'onToolCallEndEvent',
        TOOL_CALL_RESULT: 'onToolCallResultEvent',
        RUN_FINISHED: 'onRunFinishedEvent',
      };
      for (const event of events) {
        await subscriber.onEvent?.({ event });
        const name = handlers[event.type];
        if (name) await subscriber[name]?.({ event });
      }
      await subscriber.onRunFinalized?.();
    },
  };
}

const jaegerTurn: IAgUiStreamEvent[] = [
  { type: 'TEXT_MESSAGE_START', messageId: 'm' },
  { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: 'critical path.' },
  { type: 'TOOL_CALL_START', toolCallId: 't1', toolCallName: 'mcp__jaeger__search_traces' },
  { type: 'TOOL_CALL_RESULT', toolCallId: 't1', content: 'ok' },
  { type: 'TOOL_CALL_END', toolCallId: 't1' },
  { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: ' runs 12\nRedis' },
  { type: 'TEXT_MESSAGE_END', messageId: 'm' },
  { type: 'RUN_FINISHED', runId: 'run-1', outcome: { type: 'success' } },
];

function Host({ agent, runtimeRef }: { agent: HttpAgent; runtimeRef: { current: AssistantRuntime | null } }) {
  const runtime = useAgUiRuntime({ agent, showThinking: false });
  runtimeRef.current = runtime;
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root>
        <ThreadPrimitive.Viewport>
          <ThreadPrimitive.Messages components={threadMessageComponents} />
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}

describe('useAgUiRuntime with the event normalizer', () => {
  beforeAll(() => {
    Element.prototype.scrollTo = () => {};
  });

  it('keeps a tool call between text parts when one message id is reused', async () => {
    const runtimeRef: { current: AssistantRuntime | null } = { current: null };
    const agent = attachAgUiEventNormalizer(scriptedAgent(jaegerTurn) as unknown as HttpAgent);
    render(<Host agent={agent} runtimeRef={runtimeRef} />);

    await act(async () => {
      runtimeRef.current?.thread.append('investigate');
    });

    await waitFor(() => {
      expect(screen.getByText('Called search_traces')).toBeInTheDocument();
    });

    const assistant = runtimeRef.current?.thread
      .getState()
      .messages.find(message => message.role === 'assistant');
    const parts = assistant && 'content' in assistant ? assistant.content : [];
    expect(
      parts.map(part =>
        part.type === 'text' ? part.text : part.type === 'tool-call' ? part.toolName : part.type
      )
    ).toEqual(['critical path.', 'mcp__jaeger__search_traces', ' runs 12\nRedis']);

    const visible = document.body.textContent ?? '';
    expect(visible.indexOf('critical path.')).toBeLessThan(visible.indexOf('Called search_traces'));
    expect(visible.indexOf('Called search_traces')).toBeLessThan(visible.indexOf('Redis'));
    expect(visible).not.toContain('critical path. runs');
  });
});
