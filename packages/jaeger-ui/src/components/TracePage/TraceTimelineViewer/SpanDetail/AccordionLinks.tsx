// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import cx from 'classnames';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';
import './AccordionLinks.css';
import { ILink } from '../../../../types/otel';
import ReferenceLink from '../../url/ReferenceLink';

type ReferenceItemProps = {
  data: ReadonlyArray<ILink>;
  focusSpan: (uiFind: string) => void;
};

// export for test
export function References(props: ReferenceItemProps) {
  const { data, focusSpan } = props;

  return (
    <div className="ReferencesList u-simple-scrollbars">
      <ul className="ReferencesList--List">
        {data.map(link => {
          return (
            <li className="ReferencesList--Item" key={`${link.spanID}`}>
              <ReferenceLink link={link} focusSpan={focusSpan}>
                <span className="ReferencesList--itemContent">
                  {link.span ? (
                    <span>
                      <span className="span-svc-name">{link.span.resource.serviceName}</span>
                      <small className="endpoint-name">{link.span.name}</small>
                    </span>
                  ) : (
                    <span className="span-svc-name">&lt; span in another trace &gt;</span>
                  )}
                  <small className="SpanReference--debugInfo">
                    <span className="SpanReference--debugLabel" data-label="SpanID:">
                      {link.spanID}
                    </span>
                  </small>
                </span>
              </ReferenceLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AccordionLinks({
  data,
  highContrast = false,
  interactive = true,
  isOpen,
  onToggle = null,
  focusSpan,
  useOtelTerms,
}: {
  data: ReadonlyArray<ILink>;
  highContrast?: boolean;
  interactive?: boolean;
  isOpen: boolean;
  onToggle?: null | (() => void);
  focusSpan: (uiFind: string) => void;
  useOtelTerms: boolean;
}) {
  const isEmpty = !Array.isArray(data) || !data.length;
  const iconCls = cx('u-align-icon', { 'AccordianKReferences--emptyIcon': isEmpty });
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
    <div className="AccordionLinks">
      <div
        className={cx('AccordionLinks--header', {
          'is-empty': isEmpty,
          'is-high-contrast': highContrast,
          'is-open': isOpen,
        })}
        {...headerProps}
      >
        {arrow}
        <strong>
          <span className="AccordionLinks--label">{useOtelTerms ? 'Links' : 'References'}</span>
        </strong>{' '}
        ({data.length})
      </div>
      {isOpen && <References data={data} focusSpan={focusSpan} />}
    </div>
  );
}

export default React.memo(AccordionLinks);
