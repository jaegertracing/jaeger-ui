// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { HttpAgent } from '@ag-ui/client';
import { useAgUiRuntime } from '@assistant-ui/react-ag-ui';
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useThreadViewportAutoScroll,
} from '@assistant-ui/react';
import { IoClose } from 'react-icons/io5';

import { useJaegerAssistant, useJaegerAssistantOptional } from './JaegerAssistantContext';
import { getJaegerAgUiUrl, isJaegerAssistantConfigured } from './jaegerAgUi';

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

function JaegerThreadMessageBody({ variant }: { variant: 'user' | 'assistant' }) {
  return (
    <MessagePrimitive.Root
      className={`JaegerAssistantPanel-message JaegerAssistantPanel-message--${variant}`}
    >
      <MessagePrimitive.Parts>
        {({ part }) =>
          part.type === 'text' ? (
            <MessagePartPrimitive.Text
              component="div"
              className="JaegerAssistantPanel-messageText"
              smooth={false}
            />
          ) : null
        }
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

function JaegerAssistantRuntimeRoot({ children }: { children: React.ReactNode }) {
  const url = getJaegerAgUiUrl();
  const agent = React.useMemo(() => new HttpAgent({ url }), [url]);
  const runtime = useAgUiRuntime({
    agent,
    showThinking: true,
    onError: e => {
      console.error('[jaeger-assistant] AG-UI error', e);
    },
  });

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}

/** Right dock for Ask Jaeger when `VITE_JAEGER_AG_UI_URL` is set and the panel is open. */
export function JaegerAssistantDock() {
  const assistant = useJaegerAssistantOptional();
  if (!assistant) {
    return null;
  }
  const { panelOpen, setPanelOpen } = assistant;

  if (!isJaegerAssistantConfigured() || !panelOpen) {
    return null;
  }

  return (
    <aside className="JaegerAssistantPanel" aria-label="Ask Jaeger assistant">
      <JaegerAssistantRuntimeRoot>
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
      </JaegerAssistantRuntimeRoot>
    </aside>
  );
}
