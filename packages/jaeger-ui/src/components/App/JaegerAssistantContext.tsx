// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { HttpAgent } from '@ag-ui/client';
import { useAgUiRuntime } from '@assistant-ui/react-ag-ui';
import { AssistantRuntimeProvider } from '@assistant-ui/react';

import { getJaegerAgUiUrl, isJaegerAssistantConfigured } from './jaegerAgUi';
import JaegerAssistantToolsRegistrar from './JaegerAssistantToolsRegistrar';

interface IJaegerAssistantContextValue {
  panelOpen: boolean;
  setPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  /** When set, opening the panel consumes this and appends a user message to the AG-UI thread. */
  bootstrapUserText: string | null;
  requestAskJaeger: (text: string) => void;
  clearBootstrap: () => void;
}

const JaegerAssistantContext = React.createContext<IJaegerAssistantContextValue | null>(null);

/** Inner provider that creates the long-lived AG-UI runtime (only mounted when env URL is set). */
function JaegerAssistantRuntimeProvider({ children }: { children: React.ReactNode }) {
  const url = getJaegerAgUiUrl();
  const agent = React.useMemo(() => new HttpAgent({ url }), [url]);
  const runtime = useAgUiRuntime({
    agent,
    showThinking: true,
    onError: (e: unknown) => {
      console.error('[jaeger-assistant] AG-UI error', e);
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <JaegerAssistantToolsRegistrar />
      {children}
    </AssistantRuntimeProvider>
  );
}

export function JaegerAssistantProvider({ children }: { children: React.ReactNode }) {
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
  // HttpAgent is never instantiated in deployments that don't use the assistant.
  if (isJaegerAssistantConfigured()) {
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
