// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { context, SpanStatusCode, trace, type Span } from '@opentelemetry/api';
import { HttpAgent } from '@ag-ui/client';
import { useAgUiRuntime } from '@assistant-ui/react-ag-ui';
import { AssistantRuntimeProvider } from '@assistant-ui/react';

import { getJaegerAGUIUrl } from './jaeger-AG-UI';
import { useJaegerAssistantConfigured } from '../../hooks/useJaegerAssistant';

interface IJaegerAssistantContextValue {
  panelOpen: boolean;
  setPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  /** When set, opening the panel consumes this and appends a user message to the AG-UI thread. */
  bootstrapUserText: string | null;
  requestAskJaeger: (text: string) => void;
  clearBootstrap: () => void;
}

const JaegerAssistantContext = React.createContext<IJaegerAssistantContextValue | null>(null);

/** Inner provider that creates the long-lived AG-UI runtime (only mounted when the assistant capability is on). */
function JaegerAssistantRuntimeProvider({ children }: { children: React.ReactNode }) {
  const url = getJaegerAGUIUrl();
  const turnSpanRef = React.useRef<Span | null>(null);

  // HttpAgent stores the supplied fetch as `this.fetch` and later invokes it as a method,
  // so the bare global `fetch` would be called with `this === HttpAgent` and throw
  // "Illegal invocation". Wrap it to detach the receiver and attach the existing fetch
  // instrumentation to the active assistant turn.
  const agent = React.useMemo(
    () =>
      new HttpAgent({
        url,
        fetch: (input, init) => {
          const span = turnSpanRef.current;
          const runFetch = () => fetch(input, init);
          return span ? context.with(trace.setSpan(context.active(), span), runFetch) : runFetch();
        },
      }),
    [url]
  );
  const runtime = useAgUiRuntime({
    agent,
    showThinking: true,
    onError: e => {
      const span = turnSpanRef.current;
      if (span) {
        span.recordException(e);
        span.setStatus({ code: SpanStatusCode.ERROR, message: e.message });
      }
      console.error('[jaeger-assistant] AG-UI error', e);
    },
  });

  React.useEffect(() => {
    const thread = runtime.thread;
    if (!thread) return undefined;

    const syncTurnSpan = () => {
      const isRunning = thread.getState().isRunning;
      if (isRunning && !turnSpanRef.current) {
        turnSpanRef.current = trace.getTracer('jaeger-ui').startSpan('assistant.turn');
      } else if (!isRunning && turnSpanRef.current) {
        turnSpanRef.current.end();
        turnSpanRef.current = null;
      }
    };

    syncTurnSpan();
    const unsubscribe = thread.subscribe(syncTurnSpan);
    return () => {
      unsubscribe();
      turnSpanRef.current?.end();
      turnSpanRef.current = null;
    };
  }, [runtime]);

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}

export function JaegerAssistantProvider({ children }: { children: React.ReactNode }) {
  const assistantConfigured = useJaegerAssistantConfigured();
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [bootstrapUserText, setBootstrapUserText] = React.useState<string | null>(null);

  const clearBootstrap = React.useCallback(() => {
    setBootstrapUserText(null);
  }, []);

  const requestAskJaeger = React.useCallback((text: string) => {
    setBootstrapUserText(text);
    setPanelOpen(true);
  }, []);

  const value = React.useMemo<IJaegerAssistantContextValue>(
    () => ({
      panelOpen,
      setPanelOpen,
      bootstrapUserText,
      requestAskJaeger,
      clearBootstrap,
    }),
    [panelOpen, bootstrapUserText, requestAskJaeger, clearBootstrap]
  );

  const inner = <JaegerAssistantContext.Provider value={value}>{children}</JaegerAssistantContext.Provider>;

  // Only wrap with the runtime provider when the feature is configured so the
  // HttpAgent is never instantiated when the assistant capability is off.
  if (assistantConfigured) {
    return <JaegerAssistantRuntimeProvider>{inner}</JaegerAssistantRuntimeProvider>;
  }

  return inner;
}

export function useJaegerAssistantOptional(): IJaegerAssistantContextValue | null {
  return React.useContext(JaegerAssistantContext);
}

export function useJaegerAssistant(): IJaegerAssistantContextValue {
  const ctx = useJaegerAssistantOptional();
  if (!ctx) {
    throw new Error('useJaegerAssistant must be used within JaegerAssistantProvider');
  }
  return ctx;
}
