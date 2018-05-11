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

import * as React from 'react';

import TimelineColumnResizer from './TimelineColumnResizer';
import TimelineViewingLayer from './TimelineViewingLayer';
import Ticks from '../Ticks';
import TimelineRow from '../TimelineRow';
import type { ViewRangeTime, ViewRangeTimeUpdate } from '../../types';

import './TimelineHeaderRow.css';

type TimelineHeaderRowProps = {
  duration: number,
  nameColumnWidth: number,
  numTicks: number,
  onColummWidthChange: number => void,
  updateNextViewRangeTime: ViewRangeTimeUpdate => void,
  updateViewRangeTime: (number, number, ?string) => void,
  viewRangeTime: ViewRangeTime,
};

export default function TimelineHeaderRow(props: TimelineHeaderRowProps) {
  const {
    duration,
    nameColumnWidth,
    numTicks,
    onColummWidthChange,
    updateViewRangeTime,
    updateNextViewRangeTime,
    viewRangeTime,
  } = props;
  const [viewStart, viewEnd] = viewRangeTime.current;
  return (
    <TimelineRow className="TimelineHeaderRow">
      <TimelineRow.Cell width={nameColumnWidth}>
        <h3 className="TimelineHeaderRow--title">Service &amp; Operation</h3>
      </TimelineRow.Cell>
      <TimelineRow.Cell width={1 - nameColumnWidth}>
        <TimelineViewingLayer
          boundsInvalidator={nameColumnWidth}
          updateNextViewRangeTime={updateNextViewRangeTime}
          updateViewRangeTime={updateViewRangeTime}
          viewRangeTime={viewRangeTime}
        />
        <Ticks numTicks={numTicks} startTime={viewStart * duration} endTime={viewEnd * duration} showLabels />
      </TimelineRow.Cell>
      <TimelineColumnResizer
        position={nameColumnWidth}
        onChange={onColummWidthChange}
        min={0.15}
        max={0.85}
      />
    </TimelineRow>
  );
}
