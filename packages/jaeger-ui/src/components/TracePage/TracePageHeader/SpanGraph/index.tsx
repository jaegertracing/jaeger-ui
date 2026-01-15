// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { memo, useMemo } from 'react';

import CanvasSpanGraph from './CanvasSpanGraph';
import TickLabels from './TickLabels';
import ViewingLayer from './ViewingLayer';
import { TUpdateViewRangeTimeFunction, IViewRange, ViewRangeTimeUpdate } from '../../types';
import { IOtelSpan, IOtelTrace } from '../../../../types/otel';

import './SpanGraph.css';

const DEFAULT_HEIGHT = 60;
const TIMELINE_TICK_INTERVAL = 4;

type SpanGraphProps = {
  height?: number;
  trace: IOtelTrace;
  viewRange: IViewRange;
  updateViewRangeTime: TUpdateViewRangeTimeFunction;
  updateNextViewRangeTime: (nextUpdate: ViewRangeTimeUpdate) => void;
};

type SpanItem = {
  valueOffset: number;
  valueWidth: number;
  serviceName: string;
};

function getItem(span: IOtelSpan): SpanItem {
  return {
    valueOffset: span.relativeStartTime,
    valueWidth: span.duration,
    serviceName: span.resource.serviceName,
  };
}

function getItems(trace: IOtelTrace): SpanItem[] {
  return trace.spans.map(getItem);
}

const SpanGraph = ({
  height = DEFAULT_HEIGHT,
  trace,
  viewRange,
  updateNextViewRangeTime,
  updateViewRangeTime,
}: SpanGraphProps) => {
  // Early return if no trace data - avoid unnecessary hook execution
  if (!trace) {
    return <div />;
  }

  // Memoize items calculation based on trace reference
  const items = useMemo(() => getItems(trace), [trace]);

  return (
    <div className="SpanGraph ub-pb2 ub-px2">
      <TickLabels numTicks={TIMELINE_TICK_INTERVAL} duration={trace.duration} />
      <div className="ub-relative">
        <CanvasSpanGraph valueWidth={trace.duration} items={items} />
        <ViewingLayer
          viewRange={viewRange}
          numTicks={TIMELINE_TICK_INTERVAL}
          height={height}
          updateViewRangeTime={updateViewRangeTime}
          updateNextViewRangeTime={updateNextViewRangeTime}
        />
      </div>
    </div>
  );
};

// memo provides shallow comparison equivalent to PureComponent
export default memo(SpanGraph);
