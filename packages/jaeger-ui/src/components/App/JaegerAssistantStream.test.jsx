// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { JaegerAssistantDock } from './JaegerAssistantPanel';
import { JaegerAssistantProvider, useJaegerAssistantOptional } from './JaegerAssistantContext';

vi.mock('../../hooks/useJaegerAssistant', () => ({
  useJaegerAssistantConfigured: () => true,
  useJaegerAssistantEnabled: () => true,
}));

function AskButton() {
  const assistant = useJaegerAssistantOptional();
  return (
    <button type="button" onClick={() => assistant?.requestAskJaeger('what is this trace?')}>
      ask
    </button>
  );
}

function sseResponse(events) {
  const payload = events.map(event => `data: ${JSON.stringify(event)}\n\n`).join('');
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(payload));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('Jaeger assistant AG-UI streaming', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('concatenates @ag-ui/client 1.x content deltas into the assistant panel', async () => {
    const fetchMock = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}'));
      return sseResponse([
        { type: 'RUN_STARTED', threadId: body.threadId, runId: body.runId },
        { type: 'TEXT_MESSAGE_START', messageId: 'm1', role: 'assistant' },
        { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm1', delta: 'Hello' },
        { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm1', delta: ' from Jaeger' },
        { type: 'TEXT_MESSAGE_END', messageId: 'm1' },
        { type: 'RUN_FINISHED', threadId: body.threadId, runId: body.runId },
      ]);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <JaegerAssistantProvider>
        <JaegerAssistantDock />
        <AskButton />
      </JaegerAssistantProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'ask' }));

    expect(await screen.findByText(/Hello from Jaeger/, {}, { timeout: 5000 })).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalled();
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.headers.Accept).toBe('text/event-stream');
    const request = JSON.parse(init.body);
    expect(request.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('what is this trace?'),
        }),
      ])
    );
  });
});
