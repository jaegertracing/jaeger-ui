// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/*
  CopilotKit needs a runtime URL (HTTP endpoint) to talk to our assistant.
  This file reads the env var REACT_APP_JAEGER_COPILOT_RUNTIME_URL,
  and in dev only can fall back to /jaeger-assistant 
  so you can try the UI without setting env vars. 
  If there’s no URL (e.g. production build without the var), the assistant is treated as off
*/
export function getJaegerCopilotRuntimeUrl(): string | undefined {
  const url = import.meta.env.REACT_APP_JAEGER_COPILOT_RUNTIME_URL;
  if (typeof url === 'string' && url.trim() !== '') {
    return url.trim();
  }
  if (import.meta.env.DEV) {
    return '/jaeger-assistant';
  }
  return undefined;
}
