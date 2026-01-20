// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import cx from 'classnames';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';

import * as markers from './AccordianKeyValues.markers';
import KeyValuesTable from './KeyValuesTable';
import { TNil } from '../../../../types';
import { KeyValuePair, Link } from '../../../../types/trace';

import './AccordianKeyValues.css';

// export for tests
export function KeyValuesSummary({ data }: { data: KeyValuePair[] }) {
  if (!Array.isArray(data) || !data.length) {
    return null;
  }
  return (
    <ul className="AccordianKeyValues--summary">
      {data.map((item, i) => (
        // `i` is necessary in the key because item.key can repeat

        <li className="AccordianKeyValues--summaryItem" key={`${item.key}-${i}`}>
          <span className="AccordianKeyValues--summaryLabel">{item.key}</span>
          <span className="AccordianKeyValues--summaryDelim">=</span>
          {String(item.value)}
        </li>
      ))}
    </ul>
  );
}

export default function AccordianKeyValues({
  className = null,
  data,
  highContrast = false,
  interactive = true,
  isOpen,
  label,
  linksGetter,
  onToggle = null,
}: {
  className?: string | TNil;
  data: KeyValuePair[];
  highContrast?: boolean;
  interactive?: boolean;
  isOpen: boolean;
  label: string;
  linksGetter: ((pairs: KeyValuePair[], index: number) => Link[]) | TNil;
  onToggle?: null | (() => void);
}) {
  const isEmpty = !Array.isArray(data) || !data.length;
  const iconCls = cx('u-align-icon', { 'AccordianKeyValues--emptyIcon': isEmpty });
  let arrow: React.ReactNode | null = null;
  let headerProps: object | null = null;
  if (interactive) {
    arrow = isOpen ? <IoChevronDown className={iconCls} /> : <IoChevronForward className={iconCls} />;
    headerProps = {
      'aria-checked': isOpen,
      onClick: isEmpty ? null : onToggle,
      role: 'switch',
    };
  }

  return (
    <div className={cx(className, 'u-tx-ellipsis')}>
      <div
        className={cx('AccordianKeyValues--header', {
          'is-empty': isEmpty,
          'is-high-contrast': highContrast,
        })}
        {...headerProps}
      >
        {arrow}
        <strong data-test={markers.LABEL}>
          {label}
          {isOpen || ':'}
        </strong>
        {!isOpen && <KeyValuesSummary data={data} />}
      </div>
      {isOpen && <KeyValuesTable data={data} linksGetter={linksGetter} />}
    </div>
  );
}
