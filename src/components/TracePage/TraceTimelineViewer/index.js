// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import _ from 'lodash';
import {
  onlyUpdateForKeys,
  compose,
  withState,
  withProps,
  pure,
} from 'recompose';
import * as d3 from 'd3-scale';
import { filterSpansForText } from '../../../selectors/span';
import './grid.css';
import './index.css';
import {
  calculateSpanPosition,
  convertTimeRangeToPercent,
  ensureWithinRange,
  formatDuration,
  findServerChildSpan,
  isErrorSpan,
  spanContainsErredSpan,
} from './utils';
import { transformTrace } from './transforms';
import colorGenerator from '../../../utils/color-generator';
import SpanDetail from './SpanDetail';

// TODO: Move some styles to css
// TODO: Clean up component names and move to seperate files.
// TODO: Add unit tests
// TODO: unify transforms and utils

const ensurePercentIsBetween0And100 = percent =>
  ensureWithinRange([0, 100], percent);

/**
 * Components!
 */
function Rail() {
  return <i className="plus icon" style={{ opacity: 0 }} />;
}

function SpanBar(props) {
  const {
    startPercent,
    endPercent,
    color,
    label,
    enableTransition,
    onClick = noop => noop,
    onMouseOver = noop => noop,
    onMouseOut = noop => noop,
    childInterval,
  } = props;
  const barWidth = endPercent - startPercent;
  const barHeightPercent = 50;
  return (
    <div
      onMouseOver={() => onMouseOver()}
      onMouseOut={() => onMouseOut()}
      className="span-row__bar hint--right hint--always"
      onClick={onClick}
      aria-label={label}
      style={{
        transition: enableTransition ? 'width 500ms' : undefined,
        borderRadius: 3,
        position: 'absolute',
        display: 'inline-block',
        backgroundColor: color,
        top: `${(100 - barHeightPercent) / 2}%`,
        height: `${barHeightPercent}%`,
        width: `${ensurePercentIsBetween0And100(barWidth)}%`,
        left: `${ensurePercentIsBetween0And100(startPercent)}%`,
      }}
    >
      {childInterval &&
        <div
          style={{
            position: 'absolute',
            backgroundColor: childInterval.color,
            left: `${ensurePercentIsBetween0And100(childInterval.startPercent)}%`,
            right: `${100 - ensurePercentIsBetween0And100(childInterval.endPercent)}%`,
            top: '20%',
            bottom: '20%',
          }}
        />}
    </div>
  );
}
SpanBar.defaultProps = {
  enableTransition: true,
};
SpanBar.propTypes = {
  childInterval: PropTypes.shape({
    startPercent: PropTypes.number,
    endPercent: PropTypes.number,
    color: PropTypes.string,
  }),
  enableTransition: PropTypes.bool,
  startPercent: PropTypes.number.isRequired,
  endPercent: PropTypes.number.isRequired,
  color: PropTypes.string,
  label: PropTypes.string,

  onClick: PropTypes.func,
  onMouseOver: PropTypes.func,
  onMouseOut: PropTypes.func,
};
const SpanBarEnhanced = compose(
  withState('label', 'setLabel', props => props.shortLabel),
  withProps(({ setLabel, shortLabel, longLabel }) => ({
    onMouseOver: () => setLabel(longLabel),
    onMouseOut: () => setLabel(shortLabel),
  })),
  onlyUpdateForKeys(['startPercent', 'endPercent', 'label', 'childInterval'])
)(SpanBar);

function Ticks(props) {
  const { ticks } = props;
  const margin = 5;
  return (
    <div>
      {ticks.map(tick => (
        <div
          key={tick.percent}
          style={{
            position: 'absolute',
            left: `${tick.percent}%`,
            height: '100%',
            width: 1,
            backgroundColor: 'lightgray',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: tick.position !== 'left' ? margin : undefined,
              right: tick.position === 'left' ? margin : undefined,
            }}
          >
            {tick.label}
          </span>
        </div>
      ))}
    </div>
  );
}
Ticks.propTypes = {
  ticks: PropTypes.arrayOf(
    PropTypes.shape({
      percent: PropTypes.number,
      label: PropTypes.string,
    })
  ),
};

const TimelineRow = props => {
  const { children, className, ...rest } = props;
  return (
    <div className={`row ${className}`} {...rest}>
      {children}
    </div>
  );
};
TimelineRow.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
TimelineRow.Left = props => {
  const { children, ...rest } = props;
  return (
    <div className="col-xs-3" {...rest}>
      {children}
    </div>
  );
};
TimelineRow.Left.propTypes = {
  children: PropTypes.node,
};
TimelineRow.Right = props => {
  const { children, ...rest } = props;
  return (
    <div className="col-xs-9 relative" {...rest}>
      {children}
    </div>
  );
};
TimelineRow.Right.propTypes = {
  children: PropTypes.node,
};

const Timeline = {};
Timeline.SpanDetails = pure(props => {
  const { span, color, trace } = props;
  const { spanID } = span;
  return (
    <TimelineRow key={`${spanID}-details`}>
      <TimelineRow.Left />
      <TimelineRow.Right>
        <div
          className="p2"
          style={{
            backgroundColor: 'whitesmoke',
            border: '1px solid lightgray',
            borderTop: `3px solid ${color}`,
            boxShadow: `inset 0 16px 20px -20px rgba(0,0,0,0.45),
              inset 0 -12px 20px -20px rgba(0,0,0,0.45)`,
          }}
        >
          <SpanDetail span={span} trace={trace} />
        </div>
      </TimelineRow.Right>
    </TimelineRow>
  );
});
Timeline.SpanDetails.propTypes = {
  span: PropTypes.object,
  color: PropTypes.string,
};

function TraceView(props) {
  const {
    trace,
    zoomStart = 0,
    zoomEnd = 100,
    collapsedSpanIDs,
    selectedSpanIDs,
    filteredSpansIDs,
    onSpanClick,
    onSpanCollapseClick,
    tickPercents = [0, 25, 50, 75, 100],
  } = props;

  function getDuationAtTickPercent(tickPercent) {
    const d1 = d3.scaleLinear().domain([0, 100]).range([zoomStart, zoomEnd]);
    const d2 = d3.scaleLinear().domain([0, 100]).range([0, trace.duration]);
    return d2(d1(tickPercent));
  }

  let collapseBelow = null;
  const renderSpansRows = trace.spans.reduce(
    (arr, span, i) => {
      const { spanID } = span;
      const showSpanDetails = selectedSpanIDs.has(spanID);
      const spanHasChildren = span.hasChildren;
      const spanIsCollapsed = collapsedSpanIDs.has(spanID);
      const spanColor = colorGenerator.getColorByKey(span.process.serviceName);

      let filterOutSpan = false;
      if (filteredSpansIDs) {
        filterOutSpan = !filteredSpansIDs.has(spanID);
      }

      // Collapse logic
      // TODO: Investigate if this should be moved out to statefull component.
      let hidden = false;
      if (collapseBelow) {
        if (span.depth >= collapseBelow) {
          hidden = true;
        } else {
          collapseBelow = null;
        }
      }
      if (spanIsCollapsed && !hidden) {
        collapseBelow = span.depth + 1;
      }
      if (hidden) {
        return arr;
      }

      // Compute span position with given zoom.
      const { xStart: startPercent, xEnd: endPercent } = calculateSpanPosition({
        traceStartTime: trace.startTime,
        traceEndTime: trace.endTime,
        spanStart: span.startTime,
        spanEnd: span.startTime + span.duration,
        xStart: zoomStart,
        xEnd: zoomEnd,
      });

      // Check for direct child "server" span if the span is a "client" span.
      // TODO: Can probably optimize this a bit more so it does not do it
      // on render.
      const childServerSpan = findServerChildSpan(trace.spans.slice(i));
      let interval;
      if (childServerSpan && spanIsCollapsed) {
        const childSpanPosition = calculateSpanPosition({
          traceStartTime: trace.startTime,
          traceEndTime: trace.endTime,
          spanStart: childServerSpan.startTime,
          spanEnd: childServerSpan.startTime + childServerSpan.duration,
          xStart: zoomStart,
          xEnd: zoomEnd,
        });
        const x = d3
          .scaleLinear()
          .domain([startPercent, endPercent])
          .range([0, 100]);
        interval = {
          color: colorGenerator.getColorByKey(
            childServerSpan.process.serviceName
          ),
          startPercent: x(childSpanPosition.xStart),
          endPercent: x(childSpanPosition.xEnd),
        };
      }

      const showErrorIcon = isErrorSpan(span) ||
        (spanIsCollapsed && spanContainsErredSpan(trace.spans, i));
      const backgroundColor = showSpanDetails ? 'whitesmoke' : null;
      arr.push(
        <TimelineRow
          key={spanID}
          className="span-row"
          style={{
            backgroundColor,
            opacity: filterOutSpan ? 0.2 : undefined,
          }}
        >
          <TimelineRow.Left>
            <div
              className="overflow-hidden nowrap"
              style={{
                textOverflow: 'ellipsis',
              }}
            >
              {_.times(span.depth, z => <Rail key={z} />)}
              {spanHasChildren
                ? <i
                    style={{ cursor: 'pointer' }}
                    className={
                      `icon square ${spanIsCollapsed ? 'plus' : 'outline minus'}`
                    }
                    onClick={() => onSpanCollapseClick(spanID)}
                  />
                : <Rail />}
              <a
                tabIndex="0"
                className="inline border-left"
                style={{
                  outline: 0,
                  color: 'black',
                  borderLeft: `4px solid ${spanColor}`,
                  cursor: 'pointer',
                }}
                onClick={() => onSpanClick(spanID)}
              >
                <span
                  className="p1"
                  style={{
                    fontSize: '1.05em',
                    fontWeight: spanIsCollapsed && spanHasChildren
                      ? 'bold'
                      : undefined,
                    fontStyle: spanIsCollapsed && spanHasChildren
                      ? 'italic'
                      : undefined,
                  }}
                >
                  {showErrorIcon &&
                    <i
                      aria-hidden="true"
                      className="icon warning circle red"
                    />}
                  {span.process.serviceName} {childServerSpan &&
                    spanIsCollapsed &&
                    <span>
                      <i
                        className="long arrow right icon"
                        style={{ float: 'none' }}
                      />
                      <i
                        className="circle icon"
                        style={{
                          color: colorGenerator.getColorByKey(
                            childServerSpan.process.serviceName
                          ),
                        }}
                      />
                      {childServerSpan.process.serviceName}
                    </span>}
                </span>
                <span className="mb1 pl1 h6" style={{ color: 'gray' }}>
                  {childServerSpan && spanIsCollapsed
                    ? childServerSpan.operationName
                    : span.operationName}
                </span>
              </a>
            </div>
          </TimelineRow.Left>
          <TimelineRow.Right
            style={{ cursor: 'pointer' }}
            onClick={() => onSpanClick(spanID)}
          >
            <Ticks ticks={tickPercents.map(percent => ({ percent }))} />
            <SpanBarEnhanced
              childInterval={interval}
              startPercent={startPercent}
              endPercent={endPercent}
              color={spanColor}
              shortLabel={formatDuration(span.duration)}
              longLabel={
                `${formatDuration(span.duration)}
              | ${span.process.serviceName}::${span.operationName}`
              }
            />
          </TimelineRow.Right>
        </TimelineRow>
      );
      if (showSpanDetails) {
        arr.push(
          <Timeline.SpanDetails
            key={span.id}
            span={span}
            trace={trace}
            color={spanColor}
          />
        );
      }
      return arr;
    },
    []
  );

  return (
    <div className="mx0 px1 overflow-hidden">
      <TimelineRow style={{ backgroundColor: 'whitesmoke' }}>
        <TimelineRow.Left>
          <h3 className="m0 p1">Span Name</h3>
        </TimelineRow.Left>
        <TimelineRow.Right>
          <Ticks
            ticks={tickPercents.map(tickPercent => ({
              percent: tickPercent,
              label: tickPercent !== 0
                ? formatDuration(getDuationAtTickPercent(tickPercent))
                : '',
              position: tickPercent === 100 ? 'left' : 'right',
            }))}
          />
          <h3 className="m0 p1">Timeline</h3>
        </TimelineRow.Right>
      </TimelineRow>
      {renderSpansRows}
    </div>
  );
}
TraceView.propTypes = {
  trace: PropTypes.object,

  collapsedSpanIDs: PropTypes.object,
  selectedSpanIDs: PropTypes.object,
  filteredSpansIDs: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  tickPercents: PropTypes.arrayOf(PropTypes.number),
  zoomStart: PropTypes.number,
  zoomEnd: PropTypes.number,

  onSpanClick: PropTypes.func,
  onSpanCollapseClick: PropTypes.func,
};

export default class TraceTimelineViewer extends Component {
  constructor(props) {
    super(props);
    const initialDepthCollapse = false; // Change this to = 1 to first children spans only.
    const collapsedSpans = new Map();
    const transformedTrace = transformTrace(props.trace);
    if (_.isNumber(initialDepthCollapse)) {
      transformedTrace.spans.forEach(span => {
        if (span.depth >= initialDepthCollapse && span.hasChildren) {
          collapsedSpans.set(span.spanID, true);
        }
      });
    }

    this.state = {
      selectedSpans: new Map(),
      collapsedSpans,
      startX: 0,
      endX: 100,
      trace: transformedTrace,
    };
  }
  toggleSpanCollapse(spanID) {
    this.toggleStateMap('collapsedSpans', spanID);
  }
  toggleSpanSelect(spanID) {
    this.toggleStateMap('selectedSpans', spanID);
  }
  toggleStateMap(statePropName, spanID) {
    const propMap = this.state[statePropName];
    if (propMap.has(spanID)) {
      propMap.delete(spanID);
    } else {
      propMap.set(spanID, true);
    }
    this.setState({ [statePropName]: propMap });
  }
  render() {
    const { selectedSpans, collapsedSpans, trace } = this.state;
    const { timeRangeFilter, textFilter } = this.props;
    let filteredSpansIDs = false;
    if (textFilter) {
      filteredSpansIDs = new Map();
      filterSpansForText({
        spans: trace.spans,
        text: textFilter,
      }).forEach(span => filteredSpansIDs.set(span.spanID, true));
    }
    const { startTime, endTime } = trace;
    const zoom = convertTimeRangeToPercent(timeRangeFilter, [
      startTime,
      endTime,
    ]);
    return (
      <div>
        <TraceView
          {...this.props}
          trace={trace}
          collapsedSpanIDs={collapsedSpans}
          selectedSpanIDs={selectedSpans}
          filteredSpansIDs={filteredSpansIDs}
          zoomStart={zoom[0]}
          zoomEnd={zoom[1]}
          onSpanClick={spanID => this.toggleSpanSelect(spanID)}
          onSpanCollapseClick={spanID => this.toggleSpanCollapse(spanID)}
        />
      </div>
    );
  }
}
TraceTimelineViewer.propTypes = {
  trace: PropTypes.object,
  timeRangeFilter: PropTypes.array,
  textFilter: PropTypes.string,
};
