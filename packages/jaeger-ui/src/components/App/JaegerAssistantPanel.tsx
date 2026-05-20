// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import {
  ComposerPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useThreadViewportAutoScroll,
} from '@assistant-ui/react';
import { IoClose } from 'react-icons/io5';

import { useJaegerAssistant, useJaegerAssistantOptional } from './JaegerAssistantContext';
import { isJaegerAssistantConfigured } from './jaegerAgUi';

import './JaegerAssistantPanel.css';

function JaegerAssistantBootstrap() {
  const { bootstrapUserText, clearBootstrap } = useJaegerAssistant();
  const aui = useAui();

  React.useEffect(() => {
    if (!bootstrapUserText) return;
    const text = bootstrapUserText;
    clearBootstrap();
    aui.thread().append(text);
  }, [bootstrapUserText, aui, clearBootstrap]);

  return null;
}

function JaegerToolCallPart({
  part,
}: {
  part: { type: 'tool-call'; toolName: string; state: string; result?: unknown };
}) {
  const result = part.result as { ok?: boolean; error?: string; matchCount?: number } | undefined;
  if (part.state !== 'result' || result == null) {
    return (
      <div className="JaegerAssistantPanel-toolCall" data-testid="toolcall-pending">
        <span className="JaegerAssistantPanel-toolCall-spinner" aria-hidden="true" />
        Locating span&hellip;
      </div>
    );
  }
  if (!result.ok) {
    return (
      <div
        className="JaegerAssistantPanel-toolCall JaegerAssistantPanel-toolCall--error"
        data-testid="toolcall-error"
      >
        {result.error ?? 'Could not locate span.'}
      </div>
    );
  }
  const label =
    result.matchCount != null
      ? `Highlighted ${result.matchCount} span${result.matchCount !== 1 ? 's' : ''}`
      : 'Navigated to trace';
  return (
    <div
      className="JaegerAssistantPanel-toolCall JaegerAssistantPanel-toolCall--ok"
      data-testid="toolcall-ok"
    >
      {label}
    </div>
  );
}

function JaegerThreadMessageBody({ variant }: { variant: 'user' | 'assistant' }) {
  return (
    <MessagePrimitive.Root
      className={`JaegerAssistantPanel-message JaegerAssistantPanel-message--${variant}`}
    >
      <MessagePrimitive.Parts>
        {({ part }: { part: { type: string; [key: string]: unknown } }) => {
          if (part.type === 'text') {
            return (
              <MessagePartPrimitive.Text
                component="div"
                className="JaegerAssistantPanel-messageText"
                smooth={false}
              />
            );
          }
          if (part.type === 'tool-call') {
            return (
              <JaegerToolCallPart
                part={part as { type: 'tool-call'; toolName: string; state: string; result?: unknown }}
              />
            );
          }
          return null;
        }}
      </MessagePrimitive.Parts>
    </MessagePrimitive.Root>
  );
}

const threadMessageComponents = {
  UserMessage: function JaegerUserMessage() {
    return (
      <div className="JaegerAssistantPanel-row JaegerAssistantPanel-row--user">
        <JaegerThreadMessageBody variant="user" />
      </div>
    );
  },
  AssistantMessage: function JaegerAssistantMessage() {
    return (
      <div className="JaegerAssistantPanel-row JaegerAssistantPanel-row--assistant">
        <JaegerThreadMessageBody variant="assistant" />
      </div>
    );
  },
};

export { JaegerToolCallPart, JaegerThreadMessageBody, threadMessageComponents };

function JaegerAssistantThreadView() {
  const viewportRef = useThreadViewportAutoScroll({});

  return (
    <ThreadPrimitive.Root className="JaegerAssistantPanel-thread">
      <ThreadPrimitive.Viewport ref={viewportRef} className="JaegerAssistantPanel-viewport">
        <ThreadPrimitive.Empty>
          <p className="JaegerAssistantPanel-hint">
            Ask about traces, services, or how to use Jaeger. Submit from the header field to start with your
            question.
          </p>
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages components={threadMessageComponents} />
      </ThreadPrimitive.Viewport>
      <ComposerPrimitive.Root className="JaegerAssistantPanel-composer">
        <ComposerPrimitive.Input
          placeholder="Message Jaeger…"
          submitMode="enter"
          autoFocus
          className="JaegerAssistantPanel-composerInput"
          rows={1}
        />
        <ComposerPrimitive.Send className="JaegerAssistantPanel-send">Send</ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  );
}

/**
 * Right dock for Ask Jaeger.
 *
 * The <aside> stays mounted whenever the feature is configured so that the
 * thread history (held by the runtime in JaegerAssistantContext) is preserved
 * across open/close cycles. Visibility is toggled with CSS only.
 */
export function JaegerAssistantDock() {
  const assistant = useJaegerAssistantOptional();
  if (!assistant || !isJaegerAssistantConfigured()) {
    return null;
  }

  const { panelOpen, setPanelOpen } = assistant;

  return (
    <aside
      className="JaegerAssistantPanel"
      aria-label="Ask Jaeger assistant"
      aria-hidden={!panelOpen}
      style={{ display: panelOpen ? undefined : 'none' }}
    >
      <JaegerAssistantBootstrap />
      <header className="JaegerAssistantPanel-topBar">
        <h2 className="JaegerAssistantPanel-title">Ask Jaeger</h2>
        <button
          type="button"
          className="JaegerAssistantPanel-close"
          aria-label="Close assistant panel"
          onClick={() => setPanelOpen(false)}
        >
          <IoClose size={22} />
        </button>
      </header>
      <div className="JaegerAssistantPanel-body">
        <JaegerAssistantThreadView />
      </div>
    </aside>
  );
}
