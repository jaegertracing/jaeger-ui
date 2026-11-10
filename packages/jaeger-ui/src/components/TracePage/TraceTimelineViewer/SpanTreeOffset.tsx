// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useMemo } from 'react';
import cx from 'classnames';

import { SPAN_TREE, VisibleTree } from './generateRowStates';
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
  // The tree the rows draw; it differs from the span tree when the filter lifts children.
  tree?: VisibleTree;
};

const SpanTreeOffset: React.FC<TProps> = ({
  childrenVisible = false,
  onClick = undefined,
  showChildrenIcon = true,
  isDetailRow = false,
  span,
  color,
  tree = SPAN_TREE,
}) => {
  // The visible ancestors, root first.
  const ancestors = useMemo(() => {
    const chain: IOtelSpan[] = [];
    let current = tree.parentOf(span);
    while (current) {
      chain.unshift(current);
      current = tree.parentOf(current);
    }
    return chain;
  }, [span, tree]);

  const childCount = tree.childCount(span);
  const hasChildren = childCount > 0;
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
  const parentSpan = tree.parentOf(span);
  const parentColor = parentSpan ? colorGenerator.getColorByKey(parentSpan.resource.serviceName) : color;

  // Check if this span is the last child of its parent
  const isLastChild = tree.isLastChild(span);

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
          shouldTerminate = descendantInChain ? tree.isLastChild(descendantInChain) : false;
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
