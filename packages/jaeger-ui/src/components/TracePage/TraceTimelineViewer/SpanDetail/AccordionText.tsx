// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import cx from 'classnames';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';
import TextList from './TextList';
import { TNil } from '../../../../types';

import './AccordionText.css';

type AccordionTextProps = {
  className?: string | TNil;
  data: ReadonlyArray<string>;
  headerClassName?: string | TNil;
  highContrast?: boolean;
  interactive?: boolean;
  isOpen: boolean;
  label: React.ReactNode;
  onToggle?: null | (() => void);
  spanID?: string;
};

export default function AccordionText({
  className = null,
  data,
  headerClassName,
  highContrast = false,
  interactive = true,
  isOpen,
  label,
  onToggle = null,
  spanID,
}: AccordionTextProps) {
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const notifyListReflow = React.useCallback(() => {
    if (typeof window === 'undefined') return;

    window.requestAnimationFrame(() => {
      try {
        if (spanID) {
          window.dispatchEvent(new CustomEvent('jaeger:detail-measure', { detail: { spanID } }));
        } else {
          window.dispatchEvent(new Event('jaeger:list-resize'));
        }
      } catch {
        // Ignore dispatch errors
      }
    });
  }, [spanID]);

  // Observe height changes in the content area to notify virtualized list to reflow
  React.useEffect(() => {
    if (!interactive || !isOpen) return;
    const target = contentRef.current;
    if (!target) return;

    let ro: ResizeObserver | null = null;
    const callback = () => notifyListReflow();

    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(callback as ResizeObserverCallback);
      if (ro) ro.observe(target);
    }

    return () => {
      if (ro) {
        try {
          ro.disconnect();
        } catch {
          // Ignore
        }
      }
    };
  }, [interactive, isOpen, notifyListReflow]);

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
        className={cx('AccordionText--header', headerClassName, {
          'is-empty': isEmpty,
          'is-high-contrast': highContrast,
          'is-open': isOpen,
        })}
        {...headerProps}
      >
        {arrow} <strong>{label}</strong> ({data.length})
      </div>
      {isOpen && (
        <div className="AccordionText--content" ref={contentRef}>
          <TextList data={data} />
        </div>
      )}
    </div>
  );
}
