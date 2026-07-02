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
import { JsonView, collapseAllNested } from 'react-json-view-lite';
import Markdown from 'markdown-to-jsx/react';

import { useJaegerAssistant, useJaegerAssistantOptional } from './JaegerAssistantContext';
import { useJaegerAssistantConfigured } from '../../hooks/useJaegerAssistant';
import jsonViewStyles from '../../utils/jsonViewStyles';
import { streamingMarkdownOptions } from '../../utils/markdownOptions';

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

function tryParseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : value;
  } catch {
    return value;
  }
}

function formatToolResult(result: unknown): string {
  if (typeof result === 'string') return result;
  try {
    return JSON.stringify(result);
  } catch {
    return String(result);
  }
}

function ToolCallResultValue({ result }: { result: unknown }) {
  const parsed = React.useMemo(() => tryParseJson(result), [result]);

  if (typeof parsed === 'object' && parsed !== null) {
    return (
      <JsonView
        data={parsed as Record<string, unknown> | unknown[]}
        shouldExpandNode={collapseAllNested}
        style={jsonViewStyles}
      />
    );
  }
  return <pre className="JaegerAssistantPanel-toolCallPre">{formatToolResult(result)}</pre>;
}

function JaegerToolCallIndicator({
  toolName,
  argsText,
  result,
  status,
  isError,
}: {
  toolName: string;
  argsText?: string;
  result?: unknown;
  status?: { type: string };
  isError?: boolean;
}) {
  const isRunning = status?.type === 'running' || status?.type === 'requires-action';
  const isFailed = status?.type === 'incomplete' || isError;

  if (isRunning) {
    return (
      <div className="JaegerAssistantPanel-toolCall">
        <span className="JaegerAssistantPanel-toolCallStatus">Calling {toolName}…</span>
      </div>
    );
  }

  const label = isFailed ? `Failed ${toolName}` : `Called ${toolName}`;
  const className = isFailed
    ? 'JaegerAssistantPanel-toolCall JaegerAssistantPanel-toolCall--error'
    : 'JaegerAssistantPanel-toolCall';

  return (
    <details className={className}>
      <summary className="JaegerAssistantPanel-toolCallName">{label}</summary>
      <div className="JaegerAssistantPanel-toolCallBody">
        {argsText && (
          <div className="JaegerAssistantPanel-toolCallSection">
            <span className="JaegerAssistantPanel-toolCallLabel">Input</span>
            <pre className="JaegerAssistantPanel-toolCallPre">{argsText}</pre>
          </div>
        )}
        {result !== undefined && (
          <div className="JaegerAssistantPanel-toolCallSection">
            <span className="JaegerAssistantPanel-toolCallLabel">Output</span>
            <ToolCallResultValue result={result} />
          </div>
        )}
      </div>
    </details>
  );
}

function AssistantMarkdownText({ text }: { text: string }) {
  return (
    <Markdown
      className="JaegerAssistantPanel-messageText JaegerAssistantPanel-md"
      options={streamingMarkdownOptions}
    >
      {text}
    </Markdown>
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
            if (variant === 'assistant') {
              return <AssistantMarkdownText text={part.text ?? ''} />;
            }
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
                isError={part.isError}
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

const PANEL_MIN_WIDTH = 320;
const PANEL_MAX_WIDTH = 800;
const PANEL_DEFAULT_WIDTH = 416; // 26rem at 16px base
const PANEL_KEYBOARD_STEP = 16;

function clampPanelWidth(w: number): number {
  return Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, w));
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
  const [width, setWidthState] = React.useState(PANEL_DEFAULT_WIDTH);
  // Mirrors `width` so onDragStart can read the current value without
  // depending on it — a `[width]` dep would recreate onDragStart on every
  // setWidth call during a drag (up to ~60/sec).
  const widthRef = React.useRef(PANEL_DEFAULT_WIDTH);
  const setWidth = React.useCallback((w: number) => {
    widthRef.current = w;
    setWidthState(w);
  }, []);
  // Holds the teardown for an in-flight drag so unmounting mid-drag does not
  // leave document listeners attached or body cursor/user-select overrides stuck.
  const dragCleanupRef = React.useRef<(() => void) | null>(null);

  const onDragStart = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      // A mouseup released outside the window can be missed; tear down any
      // in-flight drag before starting a new one so listeners never stack.
      dragCleanupRef.current?.();
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = widthRef.current;
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX;
        setWidth(clampPanelWidth(startWidth + delta));
      };

      const stopDragging = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', stopDragging);
        window.removeEventListener('blur', stopDragging);
        dragCleanupRef.current = null;
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', stopDragging);
      // A mouseup outside the window never reaches the document; ending the
      // drag when the window loses focus keeps body styles from getting stuck.
      window.addEventListener('blur', stopDragging);
      dragCleanupRef.current = stopDragging;
    },
    [setWidth]
  );

  const onHandleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      // ArrowLeft grows the panel and ArrowRight shrinks it, matching the
      // mouse drag direction (dragging the left-edge handle left = bigger).
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setWidth(clampPanelWidth(widthRef.current + PANEL_KEYBOARD_STEP));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setWidth(clampPanelWidth(widthRef.current - PANEL_KEYBOARD_STEP));
          break;
        case 'Home':
          e.preventDefault();
          setWidth(PANEL_MIN_WIDTH);
          break;
        case 'End':
          e.preventDefault();
          setWidth(PANEL_MAX_WIDTH);
          break;
        default:
          break;
      }
    },
    [setWidth]
  );

  React.useEffect(() => () => dragCleanupRef.current?.(), []);

  if (!assistant || !assistantConfigured) {
    return null;
  }

  const { panelOpen, setPanelOpen } = assistant;

  return (
    <aside
      className="JaegerAssistantPanel"
      aria-label="Ask Jaeger assistant"
      aria-hidden={!panelOpen}
      style={{ display: panelOpen ? undefined : 'none', width, maxWidth: '100%' }}
    >
      <div
        className="JaegerAssistantPanel-resizeHandle"
        onMouseDown={onDragStart}
        onKeyDown={onHandleKeyDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize assistant panel"
        aria-valuemin={PANEL_MIN_WIDTH}
        aria-valuemax={PANEL_MAX_WIDTH}
        aria-valuenow={width}
        tabIndex={0}
      />
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
