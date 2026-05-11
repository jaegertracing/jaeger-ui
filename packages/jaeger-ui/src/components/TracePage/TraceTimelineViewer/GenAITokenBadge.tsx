// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

import { classifySpan } from '../../../utils/genai/detect';
import { IOtelSpan } from '../../../types/otel';

function formatCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return String(n);
}

function getNumericAttr(span: IOtelSpan, key: string): number | null {
  const attr = span.attributes.find(a => a.key === key);
  if (!attr) return null;
  const n = Number(attr.value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

type Props = { span: IOtelSpan };

export function GenAITokenBadge({ span }: Props): React.ReactElement | null {
  if (classifySpan(span) !== 'LLM_CALL') return null;

  const input = getNumericAttr(span, 'gen_ai.usage.input_tokens');
  const output = getNumericAttr(span, 'gen_ai.usage.output_tokens');

  if (input === null && output === null) return null;

  const parts: string[] = [];
  if (input !== null) parts.push(`↑${formatCount(input)}`);
  if (output !== null) parts.push(`↓${formatCount(output)}`);

  const label = parts.join(' ');
  return (
    <span className="SpanBarRow--tokenBadge" aria-label={`tokens: ${label}`}>
      {label}
    </span>
  );
}
