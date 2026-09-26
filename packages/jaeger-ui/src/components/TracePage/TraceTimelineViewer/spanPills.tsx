// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Tag, Tooltip } from 'antd';
import cx from 'classnames';

import { useConfig } from '../../../hooks/useConfig';
import type { ISpanPill } from './spanDecorations';

export type { ISpanPill };

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
  const isMethod = pill.label === 'http.method' || pill.label === 'http.request.method';
  const isStatusCode = pill.label === 'http.status_code' || pill.label === 'http.response.status_code';
  let statusClass = '';
  if (isStatusCode) {
    const num = Number(pill.value);
    if (num >= 200 && num < 300) {
      statusClass = 'is-status-2xx';
    } else if (num >= 300 && num < 400) {
      statusClass = 'is-status-3xx';
    } else if (num >= 400 && num < 500) {
      statusClass = 'is-status-4xx';
    }
  }

  return (
    <Tooltip mouseEnterDelay={0} title={`${pill.label}: ${pill.value}`}>
      {/* span keeps Tooltip trigger above .span-name::after hit area */}
      <span className="SpanBarRow--pillWrap">
        <Tag
          aria-label={`${pill.label}: ${pill.value}`}
          className={cx('SpanBarRow--pill', {
            'is-error': pill.isError,
            'is-http-method': isMethod,
            [statusClass]: Boolean(statusClass),
          })}
        >
          {pill.value}
        </Tag>
      </span>
    </Tooltip>
  );
}
