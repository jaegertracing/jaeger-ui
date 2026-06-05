// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getJaegerAgUiUrl } from '../components/App/jaeger-AG-UI';
import { useConfig } from './useConfig';

// Whether the operator enabled AI features via UI config (`ai.enabled`).
export function useJaegerAssistantEnabled(): boolean {
  const { ai } = useConfig();
  return ai?.enabled === true;
}

/**
 * Whether Ask Jaeger UI and the AG-UI client should be active.
 * Strictly opt-in: requires `ai.enabled` in UI config and a non-empty endpoint URL.
 */
export function useJaegerAssistantConfigured(): boolean {
  const enabled = useJaegerAssistantEnabled();
  return enabled && getJaegerAgUiUrl().length > 0;
}
