// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { GEN_AI_REQUEST_MODEL_KEY } from '../../../constants/span-attributes';
import { useConfig } from '../../../hooks/useConfig';
import { IOtelSpan } from '../../../types/otel';

export type ISpanPill = { label: string; value: string; isError?: boolean };

type PillDefinition = {
  label: string;
  attrKeys: readonly string[];
  isError?: (value: string) => boolean;
};

const isHttpErrorStatus = (value: string): boolean => {
  const code = Number(value);
  return code >= 500 && code < 600;
};

/** Data-driven pill sources — add an entry here to surface a new attribute as a pill, no new function needed. */
const PILL_DEFINITIONS: readonly PillDefinition[] = [
  {
    label: 'http.status_code',
    attrKeys: ['http.status_code', 'http.response.status_code'],
    isError: isHttpErrorStatus,
  },
  { label: GEN_AI_REQUEST_MODEL_KEY, attrKeys: [GEN_AI_REQUEST_MODEL_KEY] },
];

function extractAttrValue(span: IOtelSpan, attrKeys: readonly string[]): string | undefined {
  for (const key of attrKeys) {
    const attrValue = span.attributes.getValue(key);
    if (attrValue == null) continue;
    const value = (typeof attrValue === 'string' ? attrValue : String(attrValue)).trim();
    if (value) return value;
  }
  return undefined;
}

/** Builds pills for a single span from PILL_DEFINITIONS. Callers see the resulting label/value pairs
 *  (which are intentionally exposed for rendering) but never the source attrKeys or lookup/fallback logic. */
export function getSpanPillsForSpan(span: IOtelSpan): ISpanPill[] {
  const pills: ISpanPill[] = [];
  for (const def of PILL_DEFINITIONS) {
    const value = extractAttrValue(span, def.attrKeys);
    if (value === undefined) continue;
    const pill: ISpanPill = { label: def.label, value };
    if (def.isError?.(value)) pill.isError = true;
    pills.push(pill);
  }
  return pills;
}

/** Enabled unless explicitly disabled via config (default on). */
export function useSpanPillsEnabled(): boolean {
  return useConfig().traceTimeline?.spanPillsEnabled !== false;
}
