// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Tag, Tooltip } from 'antd';
import cx from 'classnames';

import { GEN_AI_REQUEST_MODEL } from '../../../constants/span-attributes';
import { useConfig } from '../../../hooks/useConfig';
import { AttributeValue, IOtelSpan } from '../../../types/otel';

export type ISpanPill = { label: string; value: string; isError?: boolean };

type IPillSource = {
  label: string;
  attrKeys: readonly string[];
  isError?: (value: string) => boolean;
};

const DEFAULT_PILL_SOURCES: readonly IPillSource[] = [
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
  { label: GEN_AI_REQUEST_MODEL, attrKeys: [GEN_AI_REQUEST_MODEL] },
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
    const value = formatAttributeValue(attrValue).trim();
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
  for (const source of DEFAULT_PILL_SOURCES) {
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

/** Renders a single span pill with a tooltip carrying the full label and value.
 *  The pill's own text is CSS-truncated once it exceeds a fixed max-width
 *  (unlike http.status_code, values like gen_ai.request.model are unbounded-length
 *  strings), so the tooltip is the only place a truncated value is still readable
 *  in full - showing just the label there would leave the value itself hidden. */
export function SpanPill({ pill }: { pill: ISpanPill }) {
  return (
    <Tooltip mouseEnterDelay={0} title={`${pill.label}: ${pill.value}`}>
      {/* span keeps Tooltip trigger above .span-name::after hit area */}
      <span className="SpanBarRow--pillWrap">
        <Tag
          aria-label={`${pill.label}: ${pill.value}`}
          className={cx('SpanBarRow--pill', { 'is-error': pill.isError })}
        >
          {pill.value}
        </Tag>
      </span>
    </Tooltip>
  );
}
