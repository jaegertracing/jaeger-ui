// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Tag, Tooltip } from 'antd';
import cx from 'classnames';

import { useConfig } from '../../../hooks/useConfig';
import { AttributeValue, IOtelSpan } from '../../../types/otel';
import { PILL_SOURCES, type IPillSource } from './spanDecorations';

export type ISpanPill = { label: string; value: string; isError?: boolean };

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

/** Builds pills for a single span from the shared decoration registry. */
export function getSpanPillsForSpan(span: IOtelSpan): ISpanPill[] {
  const pills: ISpanPill[] = [];
  for (const source of PILL_SOURCES) {
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

/** Renders a single span pill with its attribute-key tooltip. */
export function SpanPill({ pill }: { pill: ISpanPill }) {
  return (
    <Tooltip mouseEnterDelay={0} title={pill.label}>
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
