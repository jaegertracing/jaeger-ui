// Copyright (c) 2024 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import getConfig from '../utils/config/get-config';
import { IOtelSpan } from '../types/otel';

export type SpanDecoration = {
  icon: string;
  tooltip?: string;
};

type ProcessedEntry = {
  keyRegex: RegExp | null;
  valueRegex: RegExp | null;
};

type ProcessedRule = {
  entries: ProcessedEntry[];
  icon: string;
  tooltip?: string;
};

let processedRules: ProcessedRule[] | null = null;

function getProcessedRules(): ProcessedRule[] {
  if (processedRules) return processedRules;

  const { spanDecorations } = getConfig();
  if (!spanDecorations || !Array.isArray(spanDecorations)) {
    processedRules = [];
    return processedRules;
  }

  const rules: ProcessedRule[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (spanDecorations as any[]).forEach(rule => {
    try {
      rules.push({
        icon: rule.icon,
        tooltip: rule.tooltip,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        entries: rule.entries.map((entry: any) => ({
          keyRegex: entry.key ? new RegExp(entry.key) : null,
          valueRegex: entry.value ? new RegExp(entry.value) : null,
        })),
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Invalid span decoration rule:', rule, e);
    }
  });

  processedRules = rules;
  return processedRules;
}

export function getSpanDecoration(span: IOtelSpan): SpanDecoration | null {
  const rules = getProcessedRules();
  if (rules.length === 0) return null;

  // Search in both span attributes and resource attributes
  const allAttributes = [...(span.attributes || []), ...(span.resource?.attributes || [])];

  for (const rule of rules) {
    const allMatched = rule.entries.every(entry => {
      if (!entry.keyRegex) return true;
      return allAttributes.some(attr => {
        const keyMatches = entry.keyRegex?.test(attr.key);
        if (!keyMatches) return false;
        if (!entry.valueRegex) return true;
        return entry.valueRegex.test(String(attr.value));
      });
    });

    if (allMatched) {
      return {
        icon: rule.icon,
        tooltip: rule.tooltip,
      };
    }
  }

  return null;
}
