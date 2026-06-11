// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getJaegerAGUIUrl } from '../components/App/jaeger-AG-UI';
import { useConfig } from './useConfig';

/**
 * Whether the AI assistant should be visible.
 * Driven entirely by the backend-advertised `backendCapabilities.aiAssistant`
 * flag, which the backend turns on when a live AI sidecar is reachable.
 */
export function useJaegerAssistantEnabled(): boolean {
  const { backendCapabilities } = useConfig();
  return backendCapabilities?.aiAssistant === true;
}

/**
 * Whether Ask Jaeger UI and the AG-UI client should be active.
 * Requires the assistant to be enabled and a non-empty endpoint URL.
 */
export function useJaegerAssistantConfigured(): boolean {
  const enabled = useJaegerAssistantEnabled();
  return enabled && getJaegerAGUIUrl().length > 0;
}
