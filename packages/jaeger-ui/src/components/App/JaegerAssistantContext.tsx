// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

export interface IJaegerAssistantContextValue {
  panelOpen: boolean;
  setPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  /** When set, opening the panel consumes this and appends a user message to the AG-UI thread. */
  bootstrapUserText: string | null;
  requestAskJaeger: (text: string) => void;
  clearBootstrap: () => void;
}

const JaegerAssistantContext = React.createContext<IJaegerAssistantContextValue | null>(null);

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

  return <JaegerAssistantContext.Provider value={value}>{children}</JaegerAssistantContext.Provider>;
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
