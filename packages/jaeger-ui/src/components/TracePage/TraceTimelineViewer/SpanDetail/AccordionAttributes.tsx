// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import cx from 'classnames';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';

import * as markers from './AccordionAttributes.markers';
import AttributesTable from './AttributesTable';
import { TNil } from '../../../../types';
import { Hyperlink } from '../../../../types/hyperlink';
import { IAttribute } from '../../../../types/otel';

import './AccordionAttributes.css';

// export for tests
export function AttributesSummary({ data }: { data: ReadonlyArray<IAttribute> }) {
  if (!Array.isArray(data) || !data.length) {
    return null;
  }
  return (
    <ul className="AccordionAttributes--summary">
      {data.map((item, i) => (
        // `i` is necessary in the key because item.key can repeat

        <li className="AccordionAttributes--summaryItem" key={`${item.key}-${i}`}>
          <span className="AccordionAttributes--summaryLabel">{item.key}</span>
          <span className="AccordionAttributes--summaryDelim">=</span>
          {String(item.value)}
        </li>
      ))}
    </ul>
  );
}

export default function AccordionAttributes({
  className = null,
  data,
  highContrast = false,
  interactive = true,
  isOpen,
  label,
  linksGetter,
  onToggle = null,
  spanID,
}: {
  className?: string | TNil;
  data: ReadonlyArray<IAttribute>;
  highContrast?: boolean;
  interactive?: boolean;
  isOpen: boolean;
  label: string;
  linksGetter: ((pairs: ReadonlyArray<IAttribute>, index: number) => Hyperlink[]) | TNil;
  onToggle?: null | (() => void);
  spanID?: string;
}) {
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
      onClick: onToggle,
      role: 'switch',
    };
  }

  return (
    <div className={cx(className, 'u-tx-ellipsis')}>
      <div
        className={cx('AccordionAttributes--header', {
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
        {!isOpen && <AttributesSummary data={data} />}
      </div>
      {isOpen && (
        <div ref={contentRef}>
          <AttributesTable data={data} linksGetter={linksGetter} />
        </div>
      )}
    </div>
  );
}
