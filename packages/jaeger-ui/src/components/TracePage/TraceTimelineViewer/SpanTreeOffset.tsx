// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import cx from 'classnames';
import _get from 'lodash/get';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import { actions } from './duck';
import { ReduxState } from '../../../types';

import './SpanTreeOffset.css';

type TDispatchProps = {
  addHoverIndentGuideId: (spanID: string) => void;
  removeHoverIndentGuideId: (spanID: string) => void;
};

type TProps = {
  addHoverIndentGuideId: (spanID: string) => void;
  hoverIndentGuideIds: Set<string>;
  removeHoverIndentGuideId: (spanID: string) => void;
  childrenVisible?: boolean;
  onClick?: () => void;
  showChildrenIcon?: boolean;
  isDetailRow?: boolean;
  spanID: string;
  hasChildren: boolean;
  childCount: number;
  ancestorColors: (string | null)[];
  isLastChild: boolean;
  color: string;
};

export const UnconnectedSpanTreeOffset: React.FC<TProps> = ({
  childrenVisible = false,
  onClick = undefined,
  showChildrenIcon = true,
  isDetailRow = false,
  spanID,
  hasChildren,
  childCount,
  ancestorColors,
  isLastChild,
  addHoverIndentGuideId,
  removeHoverIndentGuideId,
  color,
}) => {
  /**
   * If the mouse leaves to anywhere except another span with the same ancestor id, this span's ancestor id is
   * removed from the set of hoverIndentGuideIds.
   *
   * @param {Object} event - React Synthetic event tied to mouseleave. Includes the related target which is
   *     the element the user is now hovering.
   * @param {string} ancestorId - The span id that the user was hovering over.
   */
  const handleMouseLeave = (event: React.MouseEvent<HTMLSpanElement>, ancestorId: string) => {
    if (
      !(event.relatedTarget instanceof HTMLSpanElement) ||
      _get(event, 'relatedTarget.dataset.ancestorId') !== ancestorId
    ) {
      removeHoverIndentGuideId(ancestorId);
    }
  };

  /**
   * If the mouse entered this span from anywhere except another span with the same ancestor id, this span's
   * ancestorId is added to the set of hoverIndentGuideIds.
   *
   * @param {Object} event - React Synthetic event tied to mouseenter. Includes the related target which is
   *     the last element the user was hovering.
   * @param {string} ancestorId - The span id that the user is now hovering over.
   */
  const handleMouseEnter = (event: React.MouseEvent<HTMLSpanElement>, ancestorId: string) => {
    if (
      !(event.relatedTarget instanceof HTMLSpanElement) ||
      _get(event, 'relatedTarget.dataset.ancestorId') !== ancestorId
    ) {
      addHoverIndentGuideId(ancestorId);
    }
  };

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

  // The immediate parent is the last entry in ancestorColors.
  // Its color is used for the horizontal connector line.
  const parentColor =
    ancestorColors.length > 0 ? (ancestorColors[ancestorColors.length - 1] ?? color) : color;

  return (
    <span className={`SpanTreeOffset ${hasChildren ? 'is-parent' : ''}`} {...wrapperProps}>
      {ancestorColors.map((guideColor, index) => {
        const isLastAncestor = index === ancestorColors.length - 1;

        // Determine whether to terminate (hide) this ancestor's vertical line.
        let shouldTerminate = false;

        if (isLastAncestor) {
          // For immediate parent, terminate if current span is last child
          shouldTerminate = isLastChild;
        } else {
          // For non-immediate ancestors: the next entry in ancestorColors
          // represents the descendant in the chain. If that descendant's
          // color is null, the branch has terminated at that depth.
          const nextColor = ancestorColors[index + 1];
          if (nextColor === null) {
            shouldTerminate = true;
          }
        }

        return (
          <span
            key={index}
            className={cx('SpanTreeOffset--indentGuide', {
              // In a span bar row: show top-half line to connect to the horizontal bar
              // In a detail row: treat the same case as terminated (no line) since the
              // branch already terminated at the span row above
              'is-last': !isDetailRow && isLastAncestor && isLastChild,
              'is-terminated':
                (!isLastAncestor && shouldTerminate) || (isDetailRow && isLastAncestor && isLastChild),
            })}
            style={{
              color: guideColor ?? undefined,
            }}
            data-ancestor-id={index}
            data-testid={`indent-guide-${index}`}
            onMouseEnter={event => handleMouseEnter(event, String(index))}
            onMouseLeave={event => handleMouseLeave(event, String(index))}
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
          onMouseEnter={event => handleMouseEnter(event, spanID)}
          onMouseLeave={event => handleMouseLeave(event, spanID)}
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

export function mapStateToProps(state: ReduxState): { hoverIndentGuideIds: Set<string> } {
  const { hoverIndentGuideIds } = state.traceTimeline;
  return { hoverIndentGuideIds };
}

export function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { addHoverIndentGuideId, removeHoverIndentGuideId } = bindActionCreators(actions, dispatch);
  return { addHoverIndentGuideId, removeHoverIndentGuideId };
}

export default connect(mapStateToProps, mapDispatchToProps)(UnconnectedSpanTreeOffset);
