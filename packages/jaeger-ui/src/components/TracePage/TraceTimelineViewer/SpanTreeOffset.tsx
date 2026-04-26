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

export type SpanTreeOffsetAncestor = {
  spanID: string;
  color: string;
  isTerminated: boolean;
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
  ancestors: SpanTreeOffsetAncestor[];
  isLastChild: boolean;
  color: string;
  parentColor: string | null;
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
  parentColor,
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

  const wrapperProps = hasChildren ? { onClick, role: 'switch', 'aria-checked': childrenVisible } : null;

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
            data-ancestor-id={ancestor.spanID}
            data-testid={`indent-guide-${ancestor.spanID}`}
            onMouseEnter={event => handleMouseEnter(event, ancestor.spanID)}
            onMouseLeave={event => handleMouseLeave(event, ancestor.spanID)}
          >
            {isLastAncestor && !isDetailRow && parentColor && (
              <span className="SpanTreeOffset--horizontalLine" style={{ backgroundColor: parentColor }} />
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
