// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Dropdown, Tag, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import cx from 'classnames';
import { IoEye, IoEyeOff, IoSearch } from 'react-icons/io5';

import { useConfig } from '../../../hooks/useConfig';
import type { ISpanPill } from './spanDecorations';
import type { Verb } from '../spanFilter';
import { SpanPillVerb, useSpanPillActions } from './spanPillActions';

export type { ISpanPill };

const SPAN_PILL_MENU_ENTRIES: ReadonlyArray<{ verb: SpanPillVerb; icon: React.ReactNode; label: string }> = [
  { verb: 'find', icon: <IoSearch />, label: 'Find spans with this attribute' },
  { verb: 'keep', icon: <IoEye />, label: 'Keep spans with this attribute' },
  { verb: 'hide', icon: <IoEyeOff />, label: 'Hide spans with this attribute' },
];

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
  const actions = useSpanPillActions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // The reasons are read when the menu opens and not on every render of the row, and they stay
  // while the menu closes, so that its entries do not change on screen.
  const [disabledReasons, setDisabledReasons] = useState<Record<Verb, string | null> | null>(null);
  const handleMenuOpenChange = (isOpen: boolean) => {
    if (isOpen) setDisabledReasons(actions.disabledReasons(pill));
    setIsMenuOpen(isOpen);
  };
  const menuEntries: MenuProps['items'] = SPAN_PILL_MENU_ENTRIES.map(({ verb, icon, label }) => {
    const disabledReason = verb === 'find' ? null : disabledReasons?.[verb];
    return {
      key: verb,
      icon,
      label: disabledReason ? <Tooltip title={disabledReason}>{label}</Tooltip> : label,
      disabled: Boolean(disabledReason),
      onClick: () => actions.applyVerb(verb, pill),
    };
  });
  const tooltip = (
    <>
      {pill.label}: {pill.value}
      <div className="SpanBarRow--pillHint">Click to find or filter</div>
    </>
  );
  return (
    // The pill and its menu are React children of the link that toggles the span detail on a
    // click and on Enter or Space, so this wrapper keeps those events from reaching the link.
    <span
      onClick={event => event.stopPropagation()}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
      }}
    >
      <Dropdown
        autoFocus
        menu={{ items: disabledReasons ? menuEntries : [] }}
        onOpenChange={handleMenuOpenChange}
        open={isMenuOpen}
        trigger={['click']}
      >
        <Tooltip mouseEnterDelay={0} title={isMenuOpen ? '' : tooltip}>
          {/* span keeps Tooltip trigger above .span-name::after hit area */}
          <span
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            className="SpanBarRow--pillWrap"
            onKeyDown={event => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              handleMenuOpenChange(!isMenuOpen);
            }}
            role="button"
            tabIndex={0}
          >
            <Tag
              aria-label={`${pill.label}: ${pill.value}`}
              className={cx('SpanBarRow--pill', { 'is-error': pill.isError })}
            >
              {pill.value}
            </Tag>
          </span>
        </Tooltip>
      </Dropdown>
    </span>
  );
}
