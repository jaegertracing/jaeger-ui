// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Button } from 'antd';
import { IoEye, IoEyeOff } from 'react-icons/io5';

import Section, { KeepControl } from './Section';

/** What the keep and hide clauses on a property say about one value: a kept-out value is hidden too. */
export function rowState(hidden: ReadonlySet<string>, kept: ReadonlySet<string>, value: string) {
  return {
    isHidden: hidden.has(value) || (kept.size > 0 && !kept.has(value)),
    isOnly: kept.size === 1 && kept.has(value),
  };
}

export type FacetRow = {
  value: string;
  label: string;
  count: number;
  color?: string;
  badge?: string;
  // A locked row cannot be hidden while it is visible; the service list locks the sole root service in remove mode.
  locked?: boolean;
};

type FacetListProps = {
  title: string;
  rows: ReadonlyArray<FacetRow>;
  // The values of the hide clause and of the keep clause on the property.
  hidden: ReadonlySet<string>;
  kept: ReadonlySet<string>;
  // Keep controls are disabled in remove mode, where a keep clause would hide the root.
  keepAllowed: boolean;
  onToggleHidden: (value: string) => void;
  onOnly: (value: string) => void;
  onClear: () => void;
};

/**
 * A list of the values of one span property, each with a bar proportional to its span count and
 * the two verb actions: the crossed-out eye hides a shown value and shows a hidden one, and the
 * eye keeps only that value. A value that the clauses hide is dimmed. The Clear action in the
 * heading removes the property's chips, so it is shown only while there is one.
 */
export default function FacetList({
  title,
  rows,
  hidden,
  kept,
  keepAllowed,
  onToggleHidden,
  onOnly,
  onClear,
}: FacetListProps) {
  const maxCount = rows.reduce((m, r) => Math.max(m, r.count), 0);
  return (
    <Section
      title={title}
      actions={
        (hidden.size > 0 || kept.size > 0) && (
          <Button size="small" type="link" onClick={onClear}>
            Clear
          </Button>
        )
      }
    >
      <div className="FacetList" role="group" aria-label={`${title} values`}>
        {rows.map(row => {
          const { isHidden, isOnly } = rowState(hidden, kept, row.value);
          const keepOnlyControl = (
            <button
              type="button"
              className={`FacetList--action is-keep ${isOnly ? 'is-on' : ''} ${keepAllowed ? '' : 'is-disabled'}`}
              aria-label={`Only ${row.label}`}
              aria-pressed={isOnly}
              aria-disabled={!keepAllowed}
              onClick={() => keepAllowed && onOnly(row.value)}
            >
              <IoEye aria-hidden />
            </button>
          );
          return (
            <div key={row.value} className={`FacetList--row ${isHidden ? 'is-hidden' : ''}`}>
              {row.color && (
                <span className="ServiceFilter--colorDot" style={{ backgroundColor: row.color }} />
              )}
              <span className="FacetList--label" title={row.label}>
                {row.label}
              </span>
              {row.badge && <span className="ServiceFilter--rootBadge">{row.badge}</span>}
              <span className="FacetList--bar" aria-hidden>
                <span
                  className="FacetList--barFill"
                  style={{ width: `${maxCount ? (row.count / maxCount) * 100 : 0}%` }}
                />
              </span>
              <span className="FacetList--count">{row.count}</span>
              <KeepControl allowed={keepAllowed}>{keepOnlyControl}</KeepControl>
              <button
                type="button"
                className={`FacetList--action is-hide ${isHidden ? 'is-on' : ''}`}
                aria-label={`${isHidden ? 'Show' : 'Hide'} ${row.label}`}
                disabled={row.locked && !isHidden}
                onClick={() => onToggleHidden(row.value)}
              >
                <IoEyeOff aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
