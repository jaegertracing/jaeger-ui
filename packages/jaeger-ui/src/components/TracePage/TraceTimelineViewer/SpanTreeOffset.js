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

import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import IoChevronRight from 'react-icons/lib/io/chevron-right';
import IoIosArrowDown from 'react-icons/lib/io/ios-arrow-down';
import cx from 'classnames';
import _get from 'lodash/get';
import _find from 'lodash/find';

import type { Span } from '../../../types/trace';
import { actions } from './SpanTreeOffsetDuck';
import './SpanTreeOffset.css';

type SpanTreeOffsetProps = {
  addSpanId: string => void,
  hoverSpanIds: Set<string>,
  removeSpanId: string => void,
  hasChildren: boolean,
  childrenVisible: boolean,
  span: Span,
  onClick: ?() => void,
};

export class UnconnectedSpanTreeOffset extends React.PureComponent<SpanTreeOffsetProps> {
  ancestorIds: string[];

  static propTypes = {
    addSpanId: PropTypes.func.isRequired,
    childrenVisible: PropTypes.bool,
    hasChildren: PropTypes.bool,
    hoverSpanIds: PropTypes.instanceOf(Set).isRequired,
    onClick: PropTypes.func,
    removeSpanId: PropTypes.func.isRequired,
    span: PropTypes.shape({
      spanID: PropTypes.string.isRequired,
      references: PropTypes.array.isRequired,
    }).isRequired,
  };

  static defaultProps = {
    childrenVisible: false,
    hasChildren: false,
    onClick: null,
  };

  constructor(props: SpanTreeOffsetProps) {
    super(props);

    const tempAncestorIds: string[] = [];
    let currentSpan: Span = props.span;
    while (currentSpan) {
      currentSpan = _get(_find(currentSpan.references, { refType: 'CHILD_OF' }), 'span');
      if (currentSpan) {
        tempAncestorIds.push(currentSpan.spanID);
      }
    }

    // Some traces have multiple root-level spans, this connects them all under one guideline and adds the
    // necessary padding for the collapse icon on root-level spans.
    tempAncestorIds.push('root');

    this.ancestorIds = tempAncestorIds.reverse();
  }

  /**
   * If the mouse leaves to anywhere except another span with the same ancestor id, this span's ancestor id is
   * removed from the set of hoverSpanIds.
   *
   * @param {Object} event - React Synthetic event tied to mouseleave. Includes the related target which is
   *     the element the user is now hovering.
   * @param {string} ancestorId - The span id that the user was hovering over.
   */
  handleMouseLeave = (event: any, ancestorId: string) => {
    if (
      !event.relatedTarget ||
      !event.relatedTarget.getAttribute ||
      event.relatedTarget.getAttribute('data--ancestor-id') !== ancestorId
    ) {
      this.props.removeSpanId(ancestorId);
    }
  };

  /**
   * If the mouse entered this span from anywhere except another span with the same ancestor id, this span's
   * ancestorId is added to the set of hoverSpanIds.
   *
   * @param {Object} event - React Synthetic event tied to mouseenter. Includes the related target which is
   *     the last element the user was hovering.
   * @param {string} ancestorId - The span id that the user is now hovering over.
   */
  handleMouseEnter = (event: any, ancestorId: string) => {
    if (
      !event.relatedTarget ||
      !event.relatedTarget.getAttribute ||
      event.relatedTarget.getAttribute('data--ancestor-id') !== ancestorId
    ) {
      this.props.addSpanId(ancestorId);
    }
  };

  render() {
    const { hasChildren, childrenVisible, onClick } = this.props;
    const wrapperProps = hasChildren ? { onClick, role: 'switch', 'aria-checked': childrenVisible } : null;
    const icon = hasChildren && (childrenVisible ? <IoIosArrowDown /> : <IoChevronRight />);
    return (
      <span className={`SpanTreeOffset ${hasChildren ? 'is-parent' : ''}`} {...wrapperProps}>
        {this.ancestorIds.map(ancestorId => (
          <span
            key={ancestorId}
            className={cx('SpanTreeOffset--indentGuide', {
              activeMouseover: this.props.hoverSpanIds.has(ancestorId),
            })}
            data--ancestor-id={ancestorId}
            onMouseEnter={event => this.handleMouseEnter(event, ancestorId)}
            onMouseLeave={event => this.handleMouseLeave(event, ancestorId)}
          />
        ))}
        {icon && (
          <span
            className="SpanTreeOffset--iconWrapper"
            onMouseEnter={event => this.handleMouseEnter(event, this.props.span.spanID)}
            onMouseLeave={event => this.handleMouseLeave(event, this.props.span.spanID)}
          >
            {icon}
          </span>
        )}
      </span>
    );
  }
}

function mapStateToProps(state, ownProps) {
  const hoverSpanIds = state.hoverSpanIds.hoverSpanIds;
  return { hoverSpanIds, ...ownProps };
}

function mapDispatchToProps(dispatch) {
  const { addSpanId, removeSpanId } = bindActionCreators(actions, dispatch);
  return { addSpanId, removeSpanId };
}

export default connect(mapStateToProps, mapDispatchToProps)(UnconnectedSpanTreeOffset);
