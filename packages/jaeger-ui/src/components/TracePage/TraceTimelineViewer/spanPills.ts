// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan, IOtelTrace } from '../../../types/otel';

// PR1: HTTP status is the only pill source. Private — callers never see these keys.
const HTTP_STATUS_ATTR_KEYS = ['http.status_code', 'http.response.status_code'] as const;

export type ISpanPill = { label: string; value: string; isError?: boolean };

function httpStatusPill(span: IOtelSpan): ISpanPill | undefined {
  for (const key of HTTP_STATUS_ATTR_KEYS) {
    const attr = span.attributes.find(a => a.key === key);
    const value = attr?.value == null ? '' : String(attr.value);
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

/** Builds per-span pill lists. Owns which attributes become pills; callers do not. */
export function buildSpanPills(trace: IOtelTrace): Map<string, ISpanPill[]> {
  const result = new Map<string, ISpanPill[]>();
  for (const span of trace.spans) {
    const pill = httpStatusPill(span);
    if (pill) {
      result.set(span.spanID, [pill]);
    }
  }
  return result;
}
