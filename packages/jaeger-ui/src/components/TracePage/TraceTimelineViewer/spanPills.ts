// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useConfig } from '../../../hooks/useConfig';
import { IOtelSpan } from '../../../types/otel';

// PR1: HTTP status is the only pill source. Private — callers never see these keys.
const HTTP_STATUS_ATTR_KEYS = ['http.status_code', 'http.response.status_code'] as const;

export type ISpanPill = { label: string; value: string; isError?: boolean };

function httpStatusPill(span: IOtelSpan): ISpanPill | undefined {
  for (const key of HTTP_STATUS_ATTR_KEYS) {
    const attrValue = span.attributes.getValue(key);
    const value = attrValue == null ? '' : String(attrValue);
    if (value) {
      const code = Number(value.trim());
      const pill: ISpanPill = { label: 'http.status_code', value };
      if (code >= 500 && code < 600) {
        pill.isError = true;
      }
      return pill;
    }
  }
  return undefined;
}

/** Builds pills for a single span. Owns which attributes become pills; callers do not. */
export function getSpanPillsForSpan(span: IOtelSpan): ISpanPill[] {
  const pill = httpStatusPill(span);
  return pill ? [pill] : [];
}

/** Enabled unless explicitly disabled via config (default on). */
export function useSpanPillsEnabled(): boolean {
  return useConfig().traceTimeline?.spanPillsEnabled !== false;
}
