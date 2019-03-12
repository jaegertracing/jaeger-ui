// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import cx from 'classnames';
import _get from 'lodash/get';
import React from 'react';
import IoChevronRight from 'react-icons/lib/io/chevron-right';
import IoIosArrowDown from 'react-icons/lib/io/ios-arrow-down';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { actions } from './duck';
import spanAncestorIds from '../../../utils/span-ancestor-ids';

import type { ReduxState } from '../../../types/index';
import type { Span } from '../../../types/trace';

import './SpanTreeOffset.css';

type SpanTreeOffsetPropsType = {
  addHoverIndentGuideId: string => void,
  childrenVisible?: boolean,
  hoverIndentGuideIds: Set<string>,
  onClick?: ?() => void,
  removeHoverIndentGuideId: string => void,
  span: Span,
  showChildrenIcon?: boolean,
};

export class UnconnectedSpanTreeOffset extends React.PureComponent<SpanTreeOffsetPropsType> {
  ancestorIds: string[];
  props: SpanTreeOffsetPropsType;

  static defaultProps = {
    childrenVisible: false,
    onClick: null,
    showChildrenIcon: true,
  };

  constructor(props: SpanTreeOffsetPropsType) {
    super(props);

    this.ancestorIds = spanAncestorIds(props.span);
    // Some traces have multiple root-level spans, this connects them all under one guideline and adds the
    // necessary padding for the collapse icon on root-level spans.
    this.ancestorIds.push('root');

    this.ancestorIds.reverse();
  }

  /**
   * If the mouse leaves to anywhere except another span with the same ancestor id, this span's ancestor id is
   * removed from the set of hoverIndentGuideIds.
   *
   * @param {Object} event - React Synthetic event tied to mouseleave. Includes the related target which is
   *     the element the user is now hovering.
   * @param {string} ancestorId - The span id that the user was hovering over.
   */
  handleMouseLeave = (event: SyntheticMouseEvent<HTMLSpanElement>, ancestorId: string) => {
    if (
      !(event.relatedTarget instanceof HTMLSpanElement) ||
      _get(event, 'relatedTarget.dataset.ancestorId') !== ancestorId
    ) {
      this.props.removeHoverIndentGuideId(ancestorId);
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
  handleMouseEnter = (
    event: SyntheticMouseEvent<HTMLSpanElement> & { relatedTarget?: { getAttribute: string => string } },
    ancestorId: string
  ) => {
    if (
      !(event.relatedTarget instanceof HTMLSpanElement) ||
      _get(event, 'relatedTarget.dataset.ancestorId') !== ancestorId
    ) {
      this.props.addHoverIndentGuideId(ancestorId);
    }
  };

  render() {
    const { childrenVisible, onClick, showChildrenIcon, span } = this.props;
    const { hasChildren, spanID } = span;
    const wrapperProps = hasChildren ? { onClick, role: 'switch', 'aria-checked': childrenVisible } : null;
    const icon =
      showChildrenIcon && hasChildren && (childrenVisible ? <IoIosArrowDown /> : <IoChevronRight />);
    return (
      <span className={`SpanTreeOffset ${hasChildren ? 'is-parent' : ''}`} {...wrapperProps}>
        {this.ancestorIds.map(ancestorId => (
          <span
            key={ancestorId}
            className={cx('SpanTreeOffset--indentGuide', {
              'is-active': this.props.hoverIndentGuideIds.has(ancestorId),
            })}
            data-ancestor-id={ancestorId}
            onMouseEnter={event => this.handleMouseEnter(event, ancestorId)}
            onMouseLeave={event => this.handleMouseLeave(event, ancestorId)}
          />
        ))}
        {icon && (
          <span
            className="SpanTreeOffset--iconWrapper"
            onMouseEnter={event => this.handleMouseEnter(event, spanID)}
            onMouseLeave={event => this.handleMouseLeave(event, spanID)}
          >
            {icon}
          </span>
        )}
      </span>
    );
  }
}

export function mapStateToProps(state: ReduxState): { hoverIndentGuideIds: Set<string> } {
  const hoverIndentGuideIds = state.traceTimeline.hoverIndentGuideIds;
  return { hoverIndentGuideIds };
}

export function mapDispatchToProps(dispatch: Function) {
  const { addHoverIndentGuideId, removeHoverIndentGuideId } = bindActionCreators(actions, dispatch);
  return { addHoverIndentGuideId, removeHoverIndentGuideId };
}

export default connect(mapStateToProps, mapDispatchToProps)(UnconnectedSpanTreeOffset);
