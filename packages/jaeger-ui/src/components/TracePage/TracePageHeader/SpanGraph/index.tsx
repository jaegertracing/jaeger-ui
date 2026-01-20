// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import memoizeOne from 'memoize-one';

import CanvasSpanGraph from './CanvasSpanGraph';
import TickLabels from './TickLabels';
import ViewingLayer from './ViewingLayer';
import { TUpdateViewRangeTimeFunction, IViewRange, ViewRangeTimeUpdate } from '../../types';
import { Span, Trace } from '../../../../types/trace';

const DEFAULT_HEIGHT = 60;
const TIMELINE_TICK_INTERVAL = 4;

type SpanGraphProps = {
  height?: number;
  trace: Trace;
  viewRange: IViewRange;
  updateViewRangeTime: TUpdateViewRangeTimeFunction;
  updateNextViewRangeTime: (nextUpdate: ViewRangeTimeUpdate) => void;
};

type SpanItem = {
  valueOffset: number;
  valueWidth: number;
  serviceName: string;
};

function getItem(span: Span): SpanItem {
  return {
    valueOffset: span.relativeStartTime,
    valueWidth: span.duration,
    serviceName: span.process.serviceName,
  };
}

function getItems(trace: Trace): SpanItem[] {
  return trace.spans.map(getItem);
}

const memoizedGetItems = memoizeOne(getItems);

export default class SpanGraph extends React.PureComponent<SpanGraphProps> {
  static defaultProps = {
    height: DEFAULT_HEIGHT,
  };

  render() {
    const { height, trace, viewRange, updateNextViewRangeTime, updateViewRangeTime } = this.props;
    if (!trace) {
      return <div />;
    }

    const items = memoizedGetItems(trace);
    return (
      <div className="ub-pb2 ub-px2">
        <TickLabels numTicks={TIMELINE_TICK_INTERVAL} duration={trace.duration} />
        <div className="ub-relative">
          <CanvasSpanGraph valueWidth={trace.duration} items={items} />
          <ViewingLayer
            viewRange={viewRange}
            numTicks={TIMELINE_TICK_INTERVAL}
            height={height || DEFAULT_HEIGHT}
            updateViewRangeTime={updateViewRangeTime}
            updateNextViewRangeTime={updateNextViewRangeTime}
          />
        </div>
      </div>
    );
  }
}
