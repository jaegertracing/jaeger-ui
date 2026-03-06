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
  nameColumnWidth: number;
  numTicks: number;
  onCollapseAll: () => void;
  onCollapseOne: () => void;
  onColummWidthChange: (width: number) => void;
  onExpandAll: () => void;
  onExpandOne: () => void;
  sidePanelVisible: boolean;
  sidePanelWidth: number;
  sidePanelLabel?: string;
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
  // nameColumnWidth is a fraction of the main (non-panel) area, computed by TraceTimelineViewer.
  // Convert to full-page coordinates by multiplying by the main area's share.
  const mainFraction = 1 - (sidePanelVisible ? sidePanelWidth : 0);
  const headerNameWidth = nameColumnWidth * mainFraction;
  const timelineColumnWidth = (1 - nameColumnWidth) * mainFraction;
  return (
    <TimelineRow className="TimelineHeaderRow">
      <TimelineRow.Cell className="ub-flex ub-px2" width={headerNameWidth}>
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
              boundsInvalidator={headerNameWidth}
              updateNextViewRangeTime={updateNextViewRangeTime}
              updateViewRangeTime={updateViewRangeTime}
              viewRangeTime={viewRangeTime}
            />
            <Ticks numTicks={numTicks} startTime={startTime} endTime={endTime} showLabels />
          </TimelineRow.Cell>
          <VerticalResizer position={headerNameWidth} onChange={onColummWidthChange} min={0.15} max={0.85} />
        </>
      )}
      {sidePanelVisible && (
        <TimelineRow.Cell className="ub-flex ub-px2 TimelineHeaderRow--sidePanelCell" width={sidePanelWidth}>
          <h3 className="TimelineHeaderRow--title">{sidePanelLabel ?? 'Span Details'}</h3>
        </TimelineRow.Cell>
      )}
    </TimelineRow>
  );
}
