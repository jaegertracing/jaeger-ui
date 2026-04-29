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

/**
 * One entry per ancestor depth, ordered from outermost to immediate parent.
 * - `ancestorId` is the span ID at that depth (used for hover-highlight of vertical guides).
 * - `color` is the service color to draw a vertical bar, or `null` when the ancestor's branch
 *   has terminated (no more siblings below) and the line should be hidden.
 */
export type AncestorEntry = {
  ancestorId: string;
  color: string | null;
};

type TDispatchProps = {
  addHoverIndentGuideId: (spanID: string) => void;
  removeHoverIndentGuideId: (spanID: string) => void;
};

export type TProps = {
  addHoverIndentGuideId: (spanID: string) => void;
  hoverIndentGuideIds: Set<string>;
  removeHoverIndentGuideId: (spanID: string) => void;
  childrenVisible?: boolean;
  onClick?: () => void;
  showChildrenIcon?: boolean;
  isDetailRow?: boolean;
  // --- precomputed data (no span model knowledge) ---
  spanID: string;
  hasChildren: boolean;
  childCount: number;
  /**
   * One entry per ancestor depth, outermost → immediate parent.
   * The last entry's color is used for the horizontal connector line.
   * For terminated branches, `color` is `null` (no vertical bar).
   */
  ancestorEntries: AncestorEntry[];
  /** Whether this span is the last child of its immediate parent. */
  isLastChild: boolean;
  /** Own service color for dot/box. */
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
  ancestorEntries,
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

  const wrapperProps = hasChildren ? { onClick, role: 'switch', 'aria-checked': childrenVisible } : null;

  // The last ancestor entry is the immediate parent; its color is used for the horizontal connector.
  const lastEntry = ancestorEntries.length > 0 ? ancestorEntries[ancestorEntries.length - 1] : null;
  const parentColor = lastEntry ? (lastEntry.color ?? color) : color;

  return (
    <span className={`SpanTreeOffset ${hasChildren ? 'is-parent' : ''}`} {...wrapperProps}>
      {ancestorEntries.map((entry, index) => {
        const isLastAncestor = index === ancestorEntries.length - 1;
        const shouldTerminate = entry.color === null;

        return (
          <span
            key={entry.ancestorId}
            className={cx('SpanTreeOffset--indentGuide', {
              // In a span bar row: show top-half line to connect to the horizontal bar
              // In a detail row: treat the same case as terminated (no line) since the
              // branch already terminated at the span row above
              'is-last': !isDetailRow && isLastAncestor && isLastChild,
              'is-terminated':
                (!isLastAncestor && shouldTerminate) || (isDetailRow && isLastAncestor && isLastChild),
            })}
            style={{
              color: entry.color ?? undefined,
            }}
            data-ancestor-id={entry.ancestorId}
            data-testid={`indent-guide-${entry.ancestorId}`}
            onMouseEnter={event => handleMouseEnter(event, entry.ancestorId)}
            onMouseLeave={event => handleMouseLeave(event, entry.ancestorId)}
          >
            {isLastAncestor && !isDetailRow && (
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
