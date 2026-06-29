// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TNil } from '../../types';

interface ITimeCursorUpdate {
  cursor: number | TNil;
}

interface ITimeReframeUpdate {
  reframe: {
    anchor: number;
    shift: number;
  };
}

interface ITimeShiftEndUpdate {
  shiftEnd: number;
}

interface ITimeShiftStartUpdate {
  shiftStart: number;
}

export type TUpdateViewRangeTimeFunction = (start: number, end: number, trackSrc?: string) => void;

export type ViewRangeTimeUpdate =
  | ITimeCursorUpdate
  | ITimeReframeUpdate
  | ITimeShiftEndUpdate
  | ITimeShiftStartUpdate;

export interface IViewRangeTime {
  current: [number, number];
  cursor?: number | TNil;
  reframe?: {
    anchor: number;
    shift: number;
  };
  shiftEnd?: number;
  shiftStart?: number;
}

export interface IViewRange {
  time: IViewRangeTime;
}

// Common contract for "inversion of control on search": a searchable view computes its own matches
// from the `uiFind` query and reports them up. The parent displays the count without knowing how the
// view searches. `matches` carries the matching IDs so a parent can use them (e.g. navigation) too.
export type TSearchResults = {
  count: number;
  matches: Set<string>;
};

export type TOnSearchResults = (results: TSearchResults) => void;

export enum ETraceViewType {
  TraceTimelineViewer = 'TraceTimelineViewer',
  TraceGraph = 'TraceGraph',
  TraceStatistics = 'TraceStatistics',
  TraceSpansView = 'TraceSpansView',
  TraceFlamegraph = 'TraceFlamegraph',
  TraceLogs = 'TraceLogs',
  GenAITimelineViewer = 'GenAITimelineViewer',
}

export function viewTypeShowsMinimap(viewType: ETraceViewType): boolean {
  return viewType === ETraceViewType.TraceTimelineViewer || viewType === ETraceViewType.GenAITimelineViewer;
}

export function viewTypeIsNavigable(viewType: ETraceViewType): boolean {
  return viewType === ETraceViewType.TraceTimelineViewer || viewType === ETraceViewType.GenAITimelineViewer;
}
