// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import getConfig from '../utils/config/get-config';
import { IOtelSpan, IAttribute } from '../types/otel';

type SpanDecoration = {
  icon: string;
  tooltip?: string;
};

type ProcessedEntry = {
  keyRegex: RegExp | null;
  valueRegex: RegExp | null;
};

type ProcessedRule = {
  attributes: ProcessedEntry[];
  icon: string;
  tooltip?: string;
};

let processedRules: ProcessedRule[] | null = null;
let decorationCache = new WeakMap<IOtelSpan, SpanDecoration | null>();

/** @internal */
export function _clearCache() {
  processedRules = null;
  decorationCache = new WeakMap<IOtelSpan, SpanDecoration | null>();
}

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
      if (typeof rule.icon !== 'string' || !rule.icon) {
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsedAttributes = (rule.attributes || [])
        .filter((attr: any) => typeof attr.key === 'string' && attr.key.trim().length > 0)
        .map((attr: any) => ({
          keyRegex: new RegExp(attr.key),
          valueRegex: attr.value ? new RegExp(attr.value) : null,
        }));

      if (parsedAttributes.length === 0) {
        return;
      }

      rules.push({
        icon: rule.icon,
        tooltip: rule.tooltip,
        attributes: parsedAttributes,
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
  if (decorationCache.has(span)) return decorationCache.get(span)!;

  const rules = getProcessedRules();
  if (rules.length === 0) {
    decorationCache.set(span, null);
    return null;
  }

  // Search in both span attributes and resource attributes
  const allAttributes: IAttribute[] = [...(span.attributes || []), ...(span.resource?.attributes || [])];

  if (span.resource?.serviceName) {
    allAttributes.push({ key: 'service.name', value: span.resource.serviceName });
  }

  if (span.name) {
    allAttributes.push({ key: 'span.name', value: span.name });
  }

  for (const rule of rules) {
    const allMatched = rule.attributes.every(attr => {
      if (!attr.keyRegex) return true;
      return allAttributes.some(spanAttr => {
        const keyMatches = attr.keyRegex?.test(spanAttr.key);
        if (!keyMatches) return false;
        if (!attr.valueRegex) return true;
        return attr.valueRegex.test(String(spanAttr.value));
      });
    });

    if (allMatched) {
      const result = {
        icon: rule.icon,
        tooltip: rule.tooltip,
      };
      decorationCache.set(span, result);
      return result;
    }
  }

  decorationCache.set(span, null);
  return null;
}
