// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useMemo } from 'react';
import cx from 'classnames';
import _get from 'lodash/get';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import { actions } from './duck';
import { ReduxState } from '../../../types';
import { IOtelSpan } from '../../../types/otel';
import spanAncestorIds from '../../../utils/span-ancestor-ids';
import colorGenerator from '../../../utils/color-generator';

import './SpanTreeOffset.css';

type TDispatchProps = {
  addHoverIndentGuideId: (spanID: string) => void;
  removeHoverIndentGuideId: (spanID: string) => void;
};

type TProps = TDispatchProps & {
  childrenVisible?: boolean;
  hoverIndentGuideIds: Set<string>;
  onClick?: () => void;
  span: IOtelSpan;
  showChildrenIcon?: boolean;
  color: string;
  spanMap: ReadonlyMap<string, IOtelSpan>;
};

export const UnconnectedSpanTreeOffset: React.FC<TProps> = ({
  childrenVisible = false,
  onClick = undefined,
  showChildrenIcon = true,
  span,
  hoverIndentGuideIds,
  addHoverIndentGuideId,
  removeHoverIndentGuideId,
  color,
  spanMap,
}) => {
  const ancestorIds = useMemo(() => {
    const ids = spanAncestorIds(span);
    // Some traces have multiple root-level spans, this connects them all under one guideline and adds the
    // necessary padding for the collapse icon on root-level spans.
    ids.push('root');
    ids.reverse();
    return ids;
  }, [span]);

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

  const { hasChildren, spanID, childSpans } = span;
  const wrapperProps = hasChildren ? { onClick, role: 'switch', 'aria-checked': childrenVisible } : null;

  // Get parent color for horizontal line (last non-root ancestor)
  const nonRootAncestors = ancestorIds.filter(id => id !== 'root');
  const parentId = nonRootAncestors[nonRootAncestors.length - 1];
  const parentSpan = parentId ? spanMap.get(parentId) : null;
  const parentColor = parentSpan ? colorGenerator.getColorByKey(parentSpan.resource.serviceName) : color;

  // Check if this is a root span (no non-root ancestors)
  const isRootSpan = nonRootAncestors.length === 0;

  // Check if this span is the last child of its parent
  const isLastChild = parentSpan
    ? parentSpan.childSpans[parentSpan.childSpans.length - 1]?.spanID === spanID
    : false;

  return (
    <span className={`SpanTreeOffset ${hasChildren ? 'is-parent' : ''}`} {...wrapperProps}>
      {isRootSpan && <span className="SpanTreeOffset--rootPadding" />}
      {ancestorIds
        .filter(ancestorId => ancestorId !== 'root') // Remove root to eliminate whitespace
        .map((ancestorId: string, index: number, filteredArray: string[]) => {
          // Determine the color for this indent guide based on the ancestor
          const ancestorSpan = spanMap.get(ancestorId);
          const guideColor = ancestorSpan
            ? colorGenerator.getColorByKey(ancestorSpan.resource.serviceName)
            : undefined;
          const isLastAncestor = index === filteredArray.length - 1;

          // Check if this ancestor is on a "last child" path
          // For each ancestor, check if all descendants in the chain to this span are last children
          let isLastInChain = isLastChild; // Start with whether current span is last child
          if (isLastInChain && index < filteredArray.length - 1) {
            // For non-immediate ancestors, check if all descendants in the chain are last children
            for (let i = filteredArray.length - 1; i > index; i--) {
              const checkSpanId = filteredArray[i];
              const checkSpan = spanMap.get(checkSpanId);
              if (checkSpan && checkSpan.parentSpan) {
                const parentChildren = checkSpan.parentSpan.childSpans;
                const isLast = parentChildren[parentChildren.length - 1]?.spanID === checkSpanId;
                if (!isLast) {
                  isLastInChain = false;
                  break;
                }
              }
            }
          }

          return (
            <span
              key={ancestorId}
              className={cx('SpanTreeOffset--indentGuide', {
                'is-last': isLastAncestor && isLastChild,
                'is-terminated': !isLastAncestor && isLastInChain,
              })}
              style={{
                color: guideColor,
              }}
              data-ancestor-id={ancestorId}
              data-testid={`indent-guide-${ancestorId}`}
              onMouseEnter={event => handleMouseEnter(event, ancestorId)}
              onMouseLeave={event => handleMouseLeave(event, ancestorId)}
            >
              {isLastAncestor && (
                <span className="SpanTreeOffset--horizontalLine" style={{ backgroundColor: parentColor }} />
              )}
            </span>
          );
        })}
      {showChildrenIcon && (
        <span
          className={cx('SpanTreeOffset--iconWrapper', {
            'is-root': isRootSpan,
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
              {childSpans.length}
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
