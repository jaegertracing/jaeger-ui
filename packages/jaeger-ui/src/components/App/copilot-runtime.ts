// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/*
  CopilotKit needs a runtime URL (HTTP endpoint) to talk to our assistant.
  Reads VITE_JAEGER_COPILOT_RUNTIME_URL (Vite-native) or REACT_APP_JAEGER_COPILOT_RUNTIME_URL (CRA-style),
  when exposed via envPrefix in vite.config.mts. In dev only, falls back to /jaeger-assistant
  so you can try the UI without setting env vars. If there’s no URL, the assistant is off.
*/
function readRuntimeUrlFromEnv(): string | undefined {
  const raw =
    import.meta.env.VITE_JAEGER_COPILOT_RUNTIME_URL ?? import.meta.env.REACT_APP_JAEGER_COPILOT_RUNTIME_URL;
  if (typeof raw === 'string') {
    const url = raw.trim();
    if (url !== '') {
      return url;
    }
  }
  return undefined;
}

export function getJaegerCopilotRuntimeUrl(): string | undefined {
  const fromEnv = readRuntimeUrlFromEnv();
  if (fromEnv) {
    return fromEnv;
  }
  if (import.meta.env.DEV) {
    return '/jaeger-assistant';
  }
  return undefined;
}
