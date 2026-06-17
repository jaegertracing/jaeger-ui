// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import memoizeOne from 'memoize-one';

import { AttributeValue, IOtelTrace } from '../../../types/otel';

export const MAX_SUMMARY_FIELDS = 3;

export type AvailableField = {
  key: string;
  coverage: number;
  total: number;
};

function formatAttributeValue(value: AttributeValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Uint8Array) {
    return JSON.stringify(Array.from(value));
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function buildAvailableFieldsImpl(trace: IOtelTrace): AvailableField[] {
  const totalSpans = trace.spans.length;
  const coverageMap = new Map<string, number>();

  for (const span of trace.spans) {
    const seenKeys = new Set<string>();
    for (const attr of span.attributes) {
      if (!seenKeys.has(attr.key)) {
        seenKeys.add(attr.key);
        coverageMap.set(attr.key, (coverageMap.get(attr.key) ?? 0) + 1);
      }
    }
  }

  const fields: AvailableField[] = [];
  for (const [key, coverage] of coverageMap) {
    fields.push({ key, coverage, total: totalSpans });
  }

  return fields.sort((a, b) => {
    if (b.coverage !== a.coverage) {
      return b.coverage - a.coverage;
    }
    return a.key.localeCompare(b.key);
  });
}

function buildSummaryLookupImpl(
  trace: IOtelTrace,
  selectedFields: string[]
): Map<string, Record<string, string>> {
  const result = new Map<string, Record<string, string>>();
  if (selectedFields.length === 0) {
    return result;
  }

  const fieldSet = new Set(selectedFields);

  for (const span of trace.spans) {
    const values: Record<string, string> = {};
    let hasValue = false;
    for (const attr of span.attributes) {
      if (fieldSet.has(attr.key)) {
        values[attr.key] = formatAttributeValue(attr.value);
        hasValue = true;
      }
    }
    if (hasValue) {
      result.set(span.spanID, values);
    }
  }

  return result;
}

export const buildAvailableFields = memoizeOne(buildAvailableFieldsImpl);
export const buildSummaryLookup = memoizeOne(buildSummaryLookupImpl);

const HTTP_STATUS_CODE_KEYS = new Set(['http.status_code', 'http.response.status_code']);

export function isHttpStatusCode5xx(key: string, value: string): boolean {
  if (!HTTP_STATUS_CODE_KEYS.has(key)) {
    return false;
  }
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return false;
  }
  const code = Number(trimmed);
  return code >= 500 && code < 600;
}
