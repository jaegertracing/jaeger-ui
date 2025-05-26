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

import * as React from 'react';
import { Button } from 'antd';
import cx from 'classnames';
import { IoChevronDown, IoChevronUp, IoInformationCircle } from 'react-icons/io5';

import SpanBar from './SpanBar';
import SpanTreeOffset from './SpanTreeOffset';
import TimelineRow from './TimelineRow';
import { ViewedBoundsFunctionType } from './utils';
import { TNil } from '../../../types';
import { Span, criticalPathSection } from '../../../types/trace';

import './SpanBarRow.css';

type SpanBarRowProps = {
  className?: string;
  childrenVisible?: boolean;
  criticalPath: criticalPathSection[];
  getViewedBounds: ViewedBoundsFunctionType;
  isChildrenExpanded: boolean;
  isDetailExpanded: boolean;
  isMatchingFilter: boolean;
  numTicks: number;
  onDetailToggled: (spanID: string) => void;
  onChildrenToggled: (spanID: string) => void;
  onRerootClicked?: (spanId: string) => void;
  rpc?: { viewStart: number; viewEnd: number; color: string } | TNil;
  showChildrenIcon?: boolean | TNil;
  showErrorIcon: boolean;
  span: Span;
  spanID: string;
  traceStartTime: number;
};

/**
 * This was originally a stateless function, but changing to a PureComponent
 * reduced the render time of expanding a span row detail by ~50%. This is
 * even true when the stateless function has the same prop types as this
 * class and is wrapped with React.memo().
 */
export default class SpanBarRow extends React.PureComponent<SpanBarRowProps> {
  static defaultProps = {
    className: '',
    childrenVisible: false,
    showChildrenIcon: false,
  };

  _detailToggle = () => {
    this.props.onDetailToggled(this.props.spanID);
  };

  _childrenToggle = () => {
    this.props.onChildrenToggled(this.props.spanID);
  };

  _handleRerootClick = () => {
    const { onRerootClicked, spanID } = this.props;
    if (onRerootClicked) {
      onRerootClicked(spanID);
    }
  };

  render() {
    const {
      className,
      childrenVisible,
      criticalPath,
      getViewedBounds,
      isChildrenExpanded,
      isDetailExpanded,
      isMatchingFilter,
      numTicks,
      rpc,
      showChildrenIcon,
      showErrorIcon,
      span,
      spanID,
      traceStartTime,
      onRerootClicked,
    } = this.props;
    const label = span.process.serviceName;
    const longLabel = `${span.process.serviceName}: ${span.operationName}`;
    const depth = span.depth;
    const hasChildren = span.hasChildren;
    const viewBounds = getViewedBounds(span.startTime, span.startTime + span.duration);
    const viewStart = viewBounds.start;
    const viewEnd = viewBounds.end;

    const labelDetail = `${label} | ${span.operationName}`;
    let hintSide;
    if (viewStart > 1 - viewEnd) {
      hintSide = 'left';
    } else {
      hintSide = 'right';
    }
    return (
      <TimelineRow
        className={cx(
          'SpanBarRow',
          {
            'is-expanded': isDetailExpanded,
            'is-matching-filter': isMatchingFilter,
          },
          className
        )}
      >
        <TimelineRow.Cell className="span-name-column" width={0.25}>
          <div className="span-name-wrapper">
            <SpanTreeOffset
              childrenVisible={childrenVisible}
              span={span}
              showChildrenIcon={showChildrenIcon}
              onChildrenToggled={this._childrenToggle}
            />
            <a
              className={cx('span-name', { 'is-detail-expanded': isDetailExpanded })}
              aria-checked={isDetailExpanded}
              onClick={this._detailToggle}
              role="switch"
              style={{ borderColor: span.process.serviceName ? undefined : span.color }}
              title={labelDetail}
            >
              <span
                className={cx('span-svc-name', {
                  'span-svc-name--theme': !span.process.serviceName,
                })}
              >
                {label}
              </span>
              <small className="endpoint-name">{span.operationName}</small>
            </a>
            {showErrorIcon && (
              <IoInformationCircle
                className="SpanBarRow--errorIcon"
                aria-label="Contains an error"
                data-tip="Contains an error"
                data-for="trace-error-marker-tooltip"
              />
            )}
          </div>
        </TimelineRow.Cell>
        <TimelineRow.Cell className="span-view" width={0.75}>
          <div className="SpanBarRow--multigraph">
            <SpanBar
              criticalPath={criticalPath}
              longLabel={longLabel}
              shortLabel={label}
              color={span.color}
              getViewedBounds={getViewedBounds}
              hintSide={hintSide}
              rpc={rpc}
              viewEnd={viewEnd}
              viewStart={viewStart}
              traceStartTime={traceStartTime}
              span={span}
              onRerootClicked={onRerootClicked}
            />
          </div>
          <div className="SpanBarRow--timelineButtonsWrapper">
            {hasChildren && (
              <Button
                className="SpanBarRow--timelineCollapseBtn"
                htmlType="button"
                onClick={this._childrenToggle}
                type="text"
                icon={isChildrenExpanded ? <IoChevronUp /> : <IoChevronDown />}
              />
            )}
            {span.depth > 0 && onRerootClicked && (
              <Button
                className="SpanBarRow--rerootBtn"
                htmlType="button"
                onClick={this._handleRerootClick}
                type="text"
                title="Focus on this span and its descendants"
              >
                Re-root
              </Button>
            )}
          </div>
        </TimelineRow.Cell>
      </TimelineRow>
    );
  }
}