// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * AG-UI `HttpAgent` URL.
 *
 * Reads `VITE_JAEGER_AG_UI_URL` from the environment. When the variable is not
 * set, falls back to the Jaeger backend's own AI endpoint (`/api/ai/chat`),
 * which is proxied to the same host:port as the rest of the Jaeger API.
 * Set `VITE_JAEGER_AG_UI_URL=` (empty string) to explicitly disable the assistant.
 */
export function getJaegerAgUiUrl(): string {
  const v = import.meta.env.VITE_JAEGER_AG_UI_URL;
  if (typeof v === 'string') return v.trim();
  return '/api/ai/chat';
}

export function isJaegerAssistantConfigured(): boolean {
  return getJaegerAgUiUrl().length > 0;
}
