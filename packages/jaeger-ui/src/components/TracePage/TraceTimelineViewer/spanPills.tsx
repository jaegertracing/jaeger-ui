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
