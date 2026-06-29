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
import { useJaegerAssistantConfigured } from '../../hooks/useJaegerAssistant';

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

function formatToolResult(result: unknown): string {
  if (typeof result === 'string') return result;
  try {
    const json = JSON.stringify(result);
    return json ?? String(result);
  } catch {
    return String(result);
  }
}

function JaegerToolCallIndicator({
  toolName,
  argsText,
  result,
  status,
}: {
  toolName: string;
  argsText?: string;
  result?: unknown;
  status?: { type: string };
}) {
  const isRunning = status?.type === 'running' || status?.type === 'requires-action';
  if (isRunning) {
    return (
      <div className="JaegerAssistantPanel-toolCall">
        <span className="JaegerAssistantPanel-toolCallStatus">Calling {toolName}…</span>
      </div>
    );
  }
  return (
    <details className="JaegerAssistantPanel-toolCall">
      <summary className="JaegerAssistantPanel-toolCallName">Called {toolName}</summary>
      <div className="JaegerAssistantPanel-toolCallBody">
        {argsText && (
          <div className="JaegerAssistantPanel-toolCallSection">
            <span className="JaegerAssistantPanel-toolCallLabel">Input</span>
            <pre className="JaegerAssistantPanel-toolCallPre">{argsText}</pre>
          </div>
        )}
        <div className="JaegerAssistantPanel-toolCallSection">
          <span className="JaegerAssistantPanel-toolCallLabel">Output</span>
          <pre className="JaegerAssistantPanel-toolCallPre">{formatToolResult(result)}</pre>
        </div>
      </div>
    </details>
  );
}

function JaegerThreadMessageBody({ variant }: { variant: 'user' | 'assistant' }) {
  return (
    <MessagePrimitive.Root
      className={`JaegerAssistantPanel-message JaegerAssistantPanel-message--${variant}`}
    >
      <MessagePrimitive.Parts>
        {({ part }) => {
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
              <JaegerToolCallIndicator
                toolName={part.toolName}
                argsText={part.argsText}
                result={part.result}
                status={part.status}
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

export { JaegerThreadMessageBody, threadMessageComponents };

function JaegerAssistantThreadView({ focusComposer }: { focusComposer: boolean }) {
  const viewportRef = useThreadViewportAutoScroll({});
  const composerRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (focusComposer) {
      composerRef.current?.focus();
    }
  }, [focusComposer]);

  return (
    <ThreadPrimitive.Root className="JaegerAssistantPanel-thread">
      <ThreadPrimitive.Viewport ref={viewportRef} className="JaegerAssistantPanel-viewport">
        <ThreadPrimitive.Empty>
          <p className="JaegerAssistantPanel-hint">Ask about traces, services, or how to use Jaeger.</p>
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages components={threadMessageComponents} />
      </ThreadPrimitive.Viewport>
      <ComposerPrimitive.Root className="JaegerAssistantPanel-composer">
        <ComposerPrimitive.Input
          placeholder="Message Jaeger…"
          submitMode="enter"
          ref={composerRef}
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
 * across open/close cycles. Visibility is toggled via inline display:none so
 * the thread state is not reset on close.
 */
export function JaegerAssistantDock() {
  const assistant = useJaegerAssistantOptional();
  const assistantConfigured = useJaegerAssistantConfigured();
  if (!assistant || !assistantConfigured) {
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
        <JaegerAssistantThreadView focusComposer={panelOpen} />
      </div>
    </aside>
  );
}
