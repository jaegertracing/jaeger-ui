// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useConfig } from '../../../hooks/useConfig';
import { AttributeValue, IOtelSpan } from '../../../types/otel';

export type ISpanPill = { label: string; value: string; isError?: boolean };

type IPillSource = {
  label: string;
  attrKeys: readonly string[];
  isError?: (value: string) => boolean;
};

// PR2: hardcoded OTel semantic-convention pills. User-selectable fields come later.
const HARDCODED_PILL_SOURCES: readonly IPillSource[] = [
  {
    label: 'http.status_code',
    attrKeys: ['http.status_code', 'http.response.status_code'],
    isError: value => {
      const code = Number(value.trim());
      return code >= 500 && code < 600;
    },
  },
  {
    label: 'http.method',
    attrKeys: ['http.method', 'http.request.method'],
  },
  { label: 'db.system', attrKeys: ['db.system'] },
  { label: 'rpc.system', attrKeys: ['rpc.system'] },
  { label: 'span.kind', attrKeys: ['span.kind'] },
];

function safeStringify(value: object): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

function formatAttributeValue(value: AttributeValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Uint8Array) {
    return safeStringify(Array.from(value));
  }
  if (Array.isArray(value)) {
    return safeStringify(value);
  }
  if (typeof value === 'object') {
    return safeStringify(value);
  }
  return String(value);
}

function pillFromSource(span: IOtelSpan, source: IPillSource): ISpanPill | undefined {
  for (const key of source.attrKeys) {
    const attrValue = span.attributes.getValue(key);
    if (attrValue == null) {
      continue;
    }
    const value = formatAttributeValue(attrValue);
    if (!value) {
      continue;
    }
    const pill: ISpanPill = { label: source.label, value };
    if (source.isError?.(value)) {
      pill.isError = true;
    }
    return pill;
  }
  return undefined;
}

/** Builds pills for a single span. Owns which attributes become pills; callers do not. */
export function getSpanPillsForSpan(span: IOtelSpan): ISpanPill[] {
  const pills: ISpanPill[] = [];
  for (const source of HARDCODED_PILL_SOURCES) {
    const pill = pillFromSource(span, source);
    if (pill) {
      pills.push(pill);
    }
  }
  return pills;
}

/** Enabled unless explicitly disabled via config (default on). */
export function useSpanPillsEnabled(): boolean {
  return useConfig().traceTimeline?.spanPillsEnabled !== false;
}
