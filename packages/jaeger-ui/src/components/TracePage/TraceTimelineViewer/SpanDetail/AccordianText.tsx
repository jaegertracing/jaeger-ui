// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import cx from 'classnames';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';
import TextList from './TextList';
import { TNil } from '../../../../types';

import './AccordianText.css';

type AccordianTextProps = {
  className?: string | TNil;
  data: ReadonlyArray<string>;
  headerClassName?: string | TNil;
  highContrast?: boolean;
  interactive?: boolean;
  isOpen: boolean;
  label: React.ReactNode;
  onToggle?: null | (() => void);
};

export default function AccordianText({
  className = null,
  data,
  headerClassName,
  highContrast = false,
  interactive = true,
  isOpen,
  label,
  onToggle = null,
}: AccordianTextProps) {
  const isEmpty = !Array.isArray(data) || !data.length;
  const iconCls = cx('u-align-icon', { 'AccordionAttributes--emptyIcon': isEmpty });

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
    <div className={className || ''}>
      <div
        className={cx('AccordianText--header', headerClassName, {
          'is-empty': isEmpty,
          'is-high-contrast': highContrast,
          'is-open': isOpen,
        })}
        {...headerProps}
      >
        {arrow} <strong>{label}</strong> ({data.length})
      </div>
      {isOpen && <TextList data={data} />}
    </div>
  );
}
