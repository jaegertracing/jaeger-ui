// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useMemo } from 'react';
import cx from 'classnames';

import { IOtelSpan } from '../../../types/otel';
import colorGenerator from '../../../utils/color-generator';

import './SpanTreeOffset.css';

type TProps = {
  childrenVisible?: boolean;
  onClick?: () => void;
  showChildrenIcon?: boolean;
  isDetailRow?: boolean;
  span: IOtelSpan;
  color: string;
};

const SpanTreeOffset: React.FC<TProps> = ({
  childrenVisible = false,
  onClick = undefined,
  showChildrenIcon = true,
  isDetailRow = false,
  span,
  color,
}) => {
  // Build ancestor chain directly from span.parentSpan
  const ancestors = useMemo(() => {
    const chain: IOtelSpan[] = [];
    let current = span.parentSpan;
    while (current) {
      chain.unshift(current);
      current = current.parentSpan;
    }
    return chain;
  }, [span]);

  const { hasChildren, spanID, childSpans } = span;
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

  // Get parent color for horizontal line
  const parentSpan = span.parentSpan;
  const parentColor = parentSpan ? colorGenerator.getColorByKey(parentSpan.resource.serviceName) : color;

  // Check if this span is the last child of its parent
  const isLastChild = parentSpan
    ? parentSpan.childSpans[parentSpan.childSpans.length - 1]?.spanID === spanID
    : false;

  return (
    <span className={`SpanTreeOffset ${hasChildren ? 'is-parent' : ''}`} {...wrapperProps}>
      {ancestors.map((ancestor, index) => {
        // Determine the color for this indent guide based on the ancestor
        const guideColor = colorGenerator.getColorByKey(ancestor.resource.serviceName);
        const isLastAncestor = index === ancestors.length - 1;

        // For the immediate parent: check if current span is last child
        // For non-immediate ancestors: check if the ancestor's branch has terminated
        // (i.e., the descendant of this ancestor in the chain is the last child of its parent)
        let shouldTerminate = false;

        if (isLastAncestor) {
          // For immediate parent, check if current span is last child
          shouldTerminate = isLastChild;
        } else {
          // For non-immediate ancestors, check if their descendant in the chain is the last child
          // The descendant of this ancestor in the chain is at index + 1
          const descendantInChain = ancestors[index + 1];
          if (descendantInChain && descendantInChain.parentSpan) {
            const parentChildren = descendantInChain.parentSpan.childSpans;
            shouldTerminate = parentChildren[parentChildren.length - 1]?.spanID === descendantInChain.spanID;
          }
        }

        return (
          <span
            key={ancestor.spanID}
            className={cx('SpanTreeOffset--indentGuide', {
              // In a span bar row: show top-half line to connect to the horizontal bar
              // In a detail row: treat the same case as terminated (no line) since the
              // branch already terminated at the span row above
              'is-last': !isDetailRow && isLastAncestor && isLastChild,
              'is-terminated':
                (!isLastAncestor && shouldTerminate) || (isDetailRow && isLastAncestor && isLastChild),
            })}
            style={{
              color: guideColor,
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
              {childSpans.length}
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
