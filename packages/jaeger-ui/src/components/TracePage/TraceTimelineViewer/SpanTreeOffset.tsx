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
};

export const UnconnectedSpanTreeOffset: React.FC<TProps> = ({
  childrenVisible = false,
  onClick = undefined,
  showChildrenIcon = true,
  span,
  hoverIndentGuideIds,
  addHoverIndentGuideId,
  removeHoverIndentGuideId,
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

  const { hasChildren, spanID } = span;
  const wrapperProps = hasChildren ? { onClick, role: 'switch', 'aria-checked': childrenVisible } : null;
  const icon =
    showChildrenIcon && hasChildren && (childrenVisible ? <IoChevronDown /> : <IoChevronForward />);
  return (
    <span className={`SpanTreeOffset ${hasChildren ? 'is-parent' : ''}`} {...wrapperProps}>
      {ancestorIds.map((ancestorId: string) => (
        <span
          key={ancestorId}
          className={cx('SpanTreeOffset--indentGuide', {
            'is-active': hoverIndentGuideIds.has(ancestorId),
          })}
          data-ancestor-id={ancestorId}
          data-testid={`indent-guide-${ancestorId}`}
          onMouseEnter={event => handleMouseEnter(event, ancestorId)}
          onMouseLeave={event => handleMouseLeave(event, ancestorId)}
        />
      ))}
      {icon && (
        <span
          className="SpanTreeOffset--iconWrapper"
          data-testid="icon-wrapper"
          onMouseEnter={event => handleMouseEnter(event, spanID)}
          onMouseLeave={event => handleMouseLeave(event, spanID)}
        >
          {icon}
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
