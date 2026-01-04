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

type TProps = {
  addHoverIndentGuideId: (spanID: string) => void;
  hoverIndentGuideIds: Set<string>;
  removeHoverIndentGuideId: (spanID: string) => void;
  childrenVisible?: boolean;
  onClick?: () => void;
  showChildrenIcon?: boolean;
  span: IOtelSpan;
  color: string;
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

  // Get parent color for horizontal line
  const parentSpan = span.parentSpan;
  const parentColor = parentSpan ? colorGenerator.getColorByKey(parentSpan.resource.serviceName) : color;

  // Check if this is a root span (no parent)
  const isRootSpan = !parentSpan;

  // Check if this span is the last child of its parent
  const isLastChild = parentSpan
    ? parentSpan.childSpans[parentSpan.childSpans.length - 1]?.spanID === spanID
    : false;

  return (
    <span className={`SpanTreeOffset ${hasChildren ? 'is-parent' : ''}`} {...wrapperProps}>
      {isRootSpan && <span className="SpanTreeOffset--rootPadding" />}
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
              'is-last': isLastAncestor && isLastChild,
              'is-terminated': !isLastAncestor && shouldTerminate,
            })}
            style={{
              color: guideColor,
            }}
            data-ancestor-id={ancestor.spanID}
            data-testid={`indent-guide-${ancestor.spanID}`}
            onMouseEnter={event => handleMouseEnter(event, ancestor.spanID)}
            onMouseLeave={event => handleMouseLeave(event, ancestor.spanID)}
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
