// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

type TContext = {
  isOpen: boolean;
  pendingMessage: string | null;
  bootstrapId: number;
  openWithMessage: (message: string) => void;
  close: () => void;
  consumePending: () => void;
};

const JaegerAssistantContext = React.createContext<TContext | null>(null);

/*
  A small React context holding: is the panel open, any pending first message from the omnibox, 
  a counter bootstrapId so the first message is sent once per submit, and functions openWithMessage, close, consumePending.
*/
export function JaegerAssistantProvider(props: { children: React.ReactNode }) {
  const { children } = props;
  const [isOpen, setIsOpen] = React.useState(false);
  const [pendingMessage, setPendingMessage] = React.useState<string | null>(null);
  const [bootstrapId, setBootstrapId] = React.useState(0);

  const openWithMessage = React.useCallback((message: string) => {
    setPendingMessage(message);
    setBootstrapId(n => n + 1);
    setIsOpen(true);
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
    setPendingMessage(null);
  }, []);

  const consumePending = React.useCallback(() => {
    setPendingMessage(null);
  }, []);

  const value = React.useMemo(
    () => ({
      isOpen,
      pendingMessage,
      bootstrapId,
      openWithMessage,
      close,
      consumePending,
    }),
    [isOpen, pendingMessage, bootstrapId, openWithMessage, close, consumePending]
  );

  return <JaegerAssistantContext.Provider value={value}>{children}</JaegerAssistantContext.Provider>;
}

export function useJaegerAssistant(): TContext {
  const ctx = React.useContext(JaegerAssistantContext);
  if (!ctx) {
    throw new Error('useJaegerAssistant must be used within JaegerAssistantProvider');
  }
  return ctx;
}
