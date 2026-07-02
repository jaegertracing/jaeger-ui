// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IOtelSpan } from '../../types/otel';

import { ATTR_GEN_AI_RESPONSE_FINISH_REASONS } from '@opentelemetry/semantic-conventions/incubating';

export function isGenAISpan(span: IOtelSpan): boolean {
  return span.attributes.some(attr => attr.key.startsWith('gen_ai.'));
}

/**
 * Returns `true` if the span has a GenAI warning.
 *
 * @param  {IOtelSpan} span  The OTEL span to check.
 * @return {boolean}         True if the span has a GenAI warning.
 */
export function hasGenAIWarning(span: IOtelSpan): boolean {
  const attr = span.attributes.find(a => a.key === ATTR_GEN_AI_RESPONSE_FINISH_REASONS);
  if (!attr) return false;

  let val = attr.value;
  if (typeof val === 'string') {
    try {
      val = JSON.parse(val);
    } catch {
      // fallback to scalar string if not valid JSON
    }
  }

  const reasons = Array.isArray(val) ? val : [val];
  return reasons.some(r => r === 'content_filter' || r === 'length');
}
