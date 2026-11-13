// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import cx from 'classnames';

import { IOtelSpan } from '../../../types/otel';
import colorGenerator from '../../../utils/color-generator';

import './SpanTreeOffset.css';

export type TAncestorGuide = {
  spanID: string;
  color: string;
  // True when the ancestor has no more children below this row, so its vertical line ends here.
  isTerminated: boolean;
};

/**
 * Returns one indent guide per ancestor of the span, ordered from the root to the immediate parent.
 */
export function getAncestorGuides(span: IOtelSpan): TAncestorGuide[] {
  const guides: TAncestorGuide[] = [];
  let child = span;
  let current = span.parentSpan;
  while (current) {
    guides.unshift({
      spanID: current.spanID,
      color: colorGenerator.getColorByKey(current.resource.serviceName),
      isTerminated: current.childSpans[current.childSpans.length - 1]?.spanID === child.spanID,
    });
    child = current;
    current = current.parentSpan;
  }
  return guides;
}

type TProps = {
  childrenVisible?: boolean;
  onClick?: () => void;
  showChildrenIcon?: boolean;
  isDetailRow?: boolean;
  hasChildren: boolean;
  childCount: number;
  ancestors: TAncestorGuide[];
  color: string;
};

const SpanTreeOffset: React.FC<TProps> = ({
  childrenVisible = false,
  onClick = undefined,
  showChildrenIcon = true,
  isDetailRow = false,
  hasChildren,
  childCount,
  ancestors,
  color,
}) => {
  const _childrenToggleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const wrapperProps = hasChildren
    ? {
        onClick,
        ...(onClick && {
          onKeyDown: _childrenToggleKeyDown,
          tabIndex: 0,
        }),
        role: 'switch',
        'aria-checked': childrenVisible,
        'aria-label': 'Expand or collapse child spans',
      }
    : null;

  // The immediate parent's guide colors the horizontal line, and its branch ending means this span
  // is the parent's last child.
  const parentGuide = ancestors[ancestors.length - 1];
  const parentColor = parentGuide ? parentGuide.color : color;
  const isLastChild = parentGuide ? parentGuide.isTerminated : false;

  return (
    <span className={`SpanTreeOffset ${hasChildren ? 'is-parent' : ''}`} {...wrapperProps}>
      {ancestors.map((ancestor, index) => {
        const isLastAncestor = index === ancestors.length - 1;

        return (
          <span
            key={ancestor.spanID}
            className={cx('SpanTreeOffset--indentGuide', {
              // In a span bar row: show top-half line to connect to the horizontal bar
              // In a detail row: treat the same case as terminated (no line) since the
              // branch already terminated at the span row above
              'is-last': !isDetailRow && isLastAncestor && isLastChild,
              'is-terminated':
                (!isLastAncestor && ancestor.isTerminated) || (isDetailRow && isLastAncestor && isLastChild),
            })}
            style={{
              color: ancestor.color,
            }}
            data-testid={`indent-guide-${ancestor.spanID}`}
          >
            {isLastAncestor && !isDetailRow && (
              <span
                className="SpanTreeOffset--horizontalLine"
                style={{ '--span-line-color': parentColor } as React.CSSProperties}
              />
            )}
          </span>
        );
      })}
      {isDetailRow && hasChildren && (
        <span className="SpanTreeOffset--indentGuide" style={{ color }} data-testid="detail-row-self-guide" />
      )}
      {showChildrenIcon && (
        <span
          className={cx('SpanTreeOffset--iconWrapper', {
            'is-collapsed': !childrenVisible,
          })}
          data-testid="icon-wrapper"
        >
          {hasChildren ? (
            <span
              className={cx('SpanTreeOffset--box', {
                'is-collapsed': !childrenVisible,
              })}
              style={
                {
                  '--span-box-color': color,
                } as React.CSSProperties
              }
            >
              {childCount}
            </span>
          ) : (
            <span
              className="SpanTreeOffset--dot"
              style={{ '--span-box-color': color } as React.CSSProperties}
            />
          )}
        </span>
      )}
    </span>
  );
};

export default SpanTreeOffset;
