// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import VerticalResizer from '../../../common/VerticalResizer';
import TimelineCollapser from './TimelineCollapser';
import TimelineViewingLayer from './TimelineViewingLayer';
import Ticks from '../Ticks';
import TimelineRow from '../TimelineRow';
import { TUpdateViewRangeTimeFunction, IViewRangeTime, ViewRangeTimeUpdate } from '../../types';
import { IOtelSpan } from '../../../../types/otel';

import './TimelineHeaderRow.css';

type TimelineHeaderRowProps = {
  duration: number;
  // nameColumnWidth is the page fraction of the name column (pre-computed by the parent).
  // When timeline bars are hidden the side panel absorbs the timeline column; the name column
  // keeps its stored pixel width, so nameColumnWidth equals spanNameColumnWidth in all cases
  // except when there is no side panel and bars are hidden (then it is 1).
  nameColumnWidth: number;
  numTicks: number;
  onCollapseAll: () => void;
  onCollapseOne: () => void;
  onColummWidthChange: (width: number) => void;
  onExpandAll: () => void;
  onExpandOne: () => void;
  resizerMax: number;
  sidePanelVisible: boolean;
  sidePanelWidth: number;
  sidePanelLabel: string;
  timelineBarsVisible: boolean;
  updateNextViewRangeTime: (update: ViewRangeTimeUpdate) => void;
  updateViewRangeTime: TUpdateViewRangeTimeFunction;
  viewRangeTime: IViewRangeTime;
  useOtelTerms: boolean;
};

export default function TimelineHeaderRow(props: TimelineHeaderRowProps) {
  const {
    duration,
    nameColumnWidth,
    numTicks,
    onCollapseAll,
    onCollapseOne,
    onColummWidthChange,
    onExpandAll,
    onExpandOne,
    resizerMax,
    sidePanelVisible,
    sidePanelWidth,
    sidePanelLabel,
    timelineBarsVisible,
    updateViewRangeTime,
    updateNextViewRangeTime,
    viewRangeTime,
  } = props;
  const [viewStart, viewEnd] = viewRangeTime.current;
  const startTime = (viewStart * duration) as IOtelSpan['startTime'];
  const endTime = (viewEnd * duration) as IOtelSpan['endTime'];
  const timelineColumnWidth = 1 - nameColumnWidth - (sidePanelVisible ? sidePanelWidth : 0);
  return (
    <TimelineRow className="TimelineHeaderRow">
      <TimelineRow.Cell className="ub-flex ub-px2" width={nameColumnWidth}>
        <h3 className="TimelineHeaderRow--title">
          Service &amp; {props.useOtelTerms ? 'Span Name' : 'Operation'}
        </h3>
        <TimelineCollapser
          onCollapseAll={onCollapseAll}
          onExpandAll={onExpandAll}
          onCollapseOne={onCollapseOne}
          onExpandOne={onExpandOne}
        />
      </TimelineRow.Cell>
      {timelineBarsVisible && (
        <>
          <TimelineRow.Cell width={timelineColumnWidth}>
            <TimelineViewingLayer
              boundsInvalidator={nameColumnWidth}
              updateNextViewRangeTime={updateNextViewRangeTime}
              updateViewRangeTime={updateViewRangeTime}
              viewRangeTime={viewRangeTime}
            />
            <Ticks numTicks={numTicks} startTime={startTime} endTime={endTime} showLabels />
          </TimelineRow.Cell>
          <VerticalResizer
            position={nameColumnWidth}
            onChange={onColummWidthChange}
            min={0.15}
            max={resizerMax}
          />
        </>
      )}
      {sidePanelVisible && (
        <TimelineRow.Cell className="ub-flex ub-px2 TimelineHeaderRow--sidePanelCell" width={sidePanelWidth}>
          <h3 className="TimelineHeaderRow--title">{sidePanelLabel}</h3>
        </TimelineRow.Cell>
      )}
    </TimelineRow>
  );
}
