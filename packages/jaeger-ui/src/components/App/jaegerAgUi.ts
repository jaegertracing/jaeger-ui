// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import getConfig from '../../utils/config/get-config';

/**
 * AG-UI `HttpAgent` URL.
 *
 * Reads `VITE_JAEGER_AG_UI_URL` from the environment. When the variable is not
 * set, falls back to the Jaeger backend's own AI endpoint (`/api/ai/chat`),
 * which is proxied to the same host:port as the rest of the Jaeger API.
 * Set `VITE_JAEGER_AG_UI_URL=` (empty string) to omit the endpoint at build time.
 */
export function getJaegerAgUiUrl(): string {
  const v = import.meta.env.VITE_JAEGER_AG_UI_URL;
  if (typeof v === 'string') return v.trim();
  return '/api/ai/chat';
}

/** Whether the operator enabled AI features via UI config (`ai.enabled`). */
export function isJaegerAssistantEnabled(): boolean {
  return getConfig().ai?.enabled === true;
}

/**
 * Whether Ask Jaeger UI and the AG-UI client should be active.
 * Strictly opt-in: requires `ai.enabled` in UI config and a non-empty endpoint URL.
 */
export function isJaegerAssistantConfigured(): boolean {
  return isJaegerAssistantEnabled() && getJaegerAgUiUrl().length > 0;
}
