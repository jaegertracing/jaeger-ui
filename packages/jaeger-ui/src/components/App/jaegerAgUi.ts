// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/** AG-UI `HttpAgent` URL (`VITE_JAEGER_AG_UI_URL`). */
export function getJaegerAgUiUrl(): string {
  const v = import.meta.env.VITE_JAEGER_AG_UI_URL;
  return typeof v === 'string' ? v.trim() : '';
}

export function isJaegerAssistantConfigured(): boolean {
  return getJaegerAgUiUrl().length > 0;
}
