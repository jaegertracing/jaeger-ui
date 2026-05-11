// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import cx from 'classnames';
import _get from 'lodash/get';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import { actions } from './duck';
import { ReduxState } from '../../../types';
import type { SpanTreeOffsetAncestor } from './utils';

import './SpanTreeOffset.css';

type TDispatchProps = {
  addHoverIndentGuideId: (spanID: string) => void;
  removeHoverIndentGuideId: (spanID: string) => void;
};

export type { SpanTreeOffsetAncestor };

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
  ancestors: SpanTreeOffsetAncestor[];
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
  ancestors,
  isLastChild,
  color,
  addHoverIndentGuideId,
  removeHoverIndentGuideId,
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

  return (
    <span className={`SpanTreeOffset ${hasChildren ? 'is-parent' : ''}`} {...wrapperProps}>
      {ancestors.map((ancestor, index) => {
        // Determine the color for this indent guide based on the ancestor
        const guideColor = ancestor.color;
        const isLastAncestor = index === ancestors.length - 1;
        const shouldTerminate = ancestor.isTerminated;

        return (
          <span
            key={ancestor.spanID}
            className={cx('SpanTreeOffset--indentGuide', {
              // Half-height connector on the last ancestor guide for non-detail rows.
              // isTerminated only suppresses the *full-height* bar for non-immediate
              // ancestors; the immediate-parent connector is controlled by isLastChild alone.
              'is-last': !isDetailRow && isLastAncestor && isLastChild,
              'is-terminated':
                (!isLastAncestor && shouldTerminate) || (isDetailRow && isLastAncestor && isLastChild),
            })}
            style={{
              color: guideColor,
            }}
            data-ancestor-id={ancestor.spanID}
            data-testid={`indent-guide-${ancestor.spanID}`}
            onMouseEnter={event => handleMouseEnter(event, ancestor.spanID)}
            onMouseLeave={event => handleMouseLeave(event, ancestor.spanID)}
          >
            {isLastAncestor && !isDetailRow && (
              <span
                className="SpanTreeOffset--horizontalLine"
                style={{ backgroundColor: ancestors.at(-1)?.color ?? color }}
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
              style={{
                borderColor: color,
                backgroundColor: !childrenVisible ? color : undefined,
              }}
            >
              {childCount}
            </span>
          ) : (
            <span className="SpanTreeOffset--dot" style={{ backgroundColor: color }} />
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
