// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan, IOtelTrace } from '../../../types/otel';

/** Attribute keys consulted for the PR1 HTTP status summary chip (first match wins). */
const HTTP_STATUS_ATTR_KEYS = ['http.status_code', 'http.response.status_code'] as const;

/** Display key used for the single HTTP status chip in span rows. */
export const HTTP_STATUS_SUMMARY_FIELD = 'http.status_code';

export const HTTP_STATUS_SUMMARY_FIELDS = [HTTP_STATUS_SUMMARY_FIELD] as const;

function formatHttpStatusValue(value: IOtelSpan['attributes'][number]['value']): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

function getHttpStatusForSpan(span: IOtelSpan): string | undefined {
  for (const key of HTTP_STATUS_ATTR_KEYS) {
    const attr = span.attributes.find(attribute => attribute.key === key);
    if (attr && attr.value !== null && attr.value !== undefined) {
      const formatted = formatHttpStatusValue(attr.value);
      if (formatted) {
        return formatted;
      }
    }
  }
  return undefined;
}

/**
 * Builds a per-span lookup for the hardcoded HTTP status summary field (PR1).
 * Returns an empty map when the feature is disabled at the call site.
 */
export function buildHttpStatusSummaryLookup(trace: IOtelTrace): Map<string, Record<string, string>> {
  const result = new Map<string, Record<string, string>>();

  for (const span of trace.spans) {
    const status = getHttpStatusForSpan(span);
    if (status !== undefined) {
      const values: Record<string, string> = Object.create(null);
      values[HTTP_STATUS_SUMMARY_FIELD] = status;
      result.set(span.spanID, values);
    }
  }

  return result;
}

export function isHttpStatusCode5xx(key: string, value: string): boolean {
  if (key !== HTTP_STATUS_SUMMARY_FIELD) {
    return false;
  }
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return false;
  }
  const code = Number(trimmed);
  return code >= 500 && code < 600;
}
