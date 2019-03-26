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

import { Action, ActionFunctionAny, createActions, handleActions } from 'redux-actions';

import DetailState from './SpanDetail/DetailState';
import { TNil } from '../../../types';
import { Log, Span, Trace } from '../../../types/trace';
import TTraceTimeline from '../../../types/TTraceTimeline';
import filterSpans from '../../../utils/filter-spans';
import generateActionTypes from '../../../utils/generate-action-types';
import guardReducer from '../../../utils/guardReducer';
import spanAncestorIds from '../../../utils/span-ancestor-ids';

// payloads
export type TSpanIdLogValue = { logItem: Log; spanID: string };
export type TSpanIdValue = { spanID: string };
type TSpansValue = { spans: Span[] };
type TTraceUiFindValue = { trace: Trace; uiFind: string | TNil };
export type TWidthValue = { width: number };
export type TActionTypes =
  | TSpanIdLogValue
  | TSpanIdValue
  | TSpansValue
  | TTraceUiFindValue
  | TWidthValue
  | {};

type TTimelineViewerActions = {
  [actionName: string]: ActionFunctionAny<Action<TActionTypes>>;
};

function shouldDisableCollapse(allSpans: Span[], hiddenSpansIds: Set<string>) {
  const allParentSpans = allSpans.filter(s => s.hasChildren);
  return allParentSpans.length === hiddenSpansIds.size;
}

export function newInitialState(): TTraceTimeline {
  return {
    childrenHiddenIDs: new Set(),
    detailStates: new Map(),
    hoverIndentGuideIds: new Set(),
    spanNameColumnWidth: 0.25,
    traceID: null,
  };
}

export const actionTypes = generateActionTypes('@jaeger-ui/trace-timeline-viewer', [
  'ADD_HOVER_INDENT_GUIDE_ID',
  'CHILDREN_TOGGLE',
  'COLLAPSE_ALL',
  'COLLAPSE_ONE',
  'DETAIL_TOGGLE',
  'DETAIL_TAGS_TOGGLE',
  'DETAIL_PROCESS_TOGGLE',
  'DETAIL_LOGS_TOGGLE',
  'DETAIL_LOG_ITEM_TOGGLE',
  'EXPAND_ALL',
  'EXPAND_ONE',
  'REMOVE_HOVER_INDENT_GUIDE_ID',
  'SET_SPAN_NAME_COLUMN_WIDTH',
  'SET_TRACE',
]);

const fullActions = createActions<TActionTypes>({
  [actionTypes.SET_TRACE]: (trace: Trace, uiFind: string | TNil) => ({ trace, uiFind }),
  [actionTypes.SET_SPAN_NAME_COLUMN_WIDTH]: (width: number) => ({ width }),
  [actionTypes.CHILDREN_TOGGLE]: (spanID: string) => ({ spanID }),
  [actionTypes.EXPAND_ALL]: () => ({}),
  [actionTypes.EXPAND_ONE]: (spans: Span[]) => ({ spans }),
  [actionTypes.COLLAPSE_ALL]: (spans: Span[]) => ({ spans }),
  [actionTypes.COLLAPSE_ONE]: (spans: Span[]) => ({ spans }),
  [actionTypes.DETAIL_TOGGLE]: (spanID: string) => ({ spanID }),
  [actionTypes.DETAIL_TAGS_TOGGLE]: (spanID: string) => ({ spanID }),
  [actionTypes.DETAIL_PROCESS_TOGGLE]: (spanID: string) => ({ spanID }),
  [actionTypes.DETAIL_LOGS_TOGGLE]: (spanID: string) => ({ spanID }),
  [actionTypes.DETAIL_LOG_ITEM_TOGGLE]: (spanID: string, logItem: Log) => ({ logItem, spanID }),
  [actionTypes.ADD_HOVER_INDENT_GUIDE_ID]: (spanID: string) => ({ spanID }),
  [actionTypes.REMOVE_HOVER_INDENT_GUIDE_ID]: (spanID: string) => ({ spanID }),
});

export const actions = (fullActions as any).jaegerUi.traceTimelineViewer as TTimelineViewerActions;

function setTrace(state: TTraceTimeline, { uiFind, trace }: TTraceUiFindValue) {
  const { traceID, spans } = trace;
  if (traceID === state.traceID) {
    return state;
  }
  const { spanNameColumnWidth } = state;

  if (!uiFind) {
    // No filter, so we're done
    return { ...newInitialState(), spanNameColumnWidth, traceID };
  }
  // There is a filter, so collapse all rows except matches and their ancestors; show details for matches
  const spansMap = new Map();
  const childrenHiddenIDs = new Set();
  const detailStates = new Map();

  spans.forEach((span: Span) => {
    spansMap.set(span.spanID, span);
    childrenHiddenIDs.add(span.spanID);
  });
  const matchedSpanIds = filterSpans(uiFind, spans);
  if (matchedSpanIds) {
    matchedSpanIds.forEach(spanID => {
      const span = spansMap.get(spanID);
      detailStates.set(spanID, new DetailState());
      spanAncestorIds(span).forEach(ancestorID => childrenHiddenIDs.delete(ancestorID));
    });
  }
  return {
    ...newInitialState(),
    spanNameColumnWidth,
    childrenHiddenIDs,
    detailStates,
    traceID,
  };
}

function setColumnWidth(state: TTraceTimeline, { width }: TWidthValue): TTraceTimeline {
  return { ...state, spanNameColumnWidth: width };
}

function childrenToggle(state: TTraceTimeline, { spanID }: TSpanIdValue): TTraceTimeline {
  const childrenHiddenIDs = new Set(state.childrenHiddenIDs);
  if (childrenHiddenIDs.has(spanID)) {
    childrenHiddenIDs.delete(spanID);
  } else {
    childrenHiddenIDs.add(spanID);
  }
  return { ...state, childrenHiddenIDs };
}

export function expandAll(state: TTraceTimeline): TTraceTimeline {
  const childrenHiddenIDs = new Set();
  return { ...state, childrenHiddenIDs };
}

export function collapseAll(state: TTraceTimeline, { spans }: TSpansValue) {
  if (shouldDisableCollapse(spans, state.childrenHiddenIDs)) {
    return state;
  }
  const childrenHiddenIDs = spans.reduce((res, s) => {
    if (s.hasChildren) {
      res.add(s.spanID);
    }
    return res;
  }, new Set());
  return { ...state, childrenHiddenIDs };
}

export function collapseOne(state: TTraceTimeline, { spans }: TSpansValue) {
  if (shouldDisableCollapse(spans, state.childrenHiddenIDs)) {
    return state;
  }
  let nearestCollapsedAncestor: Span | undefined;
  const childrenHiddenIDs = spans.reduce((res, curSpan) => {
    if (nearestCollapsedAncestor && curSpan.depth <= nearestCollapsedAncestor.depth) {
      res.add(nearestCollapsedAncestor.spanID);
      if (curSpan.hasChildren) {
        nearestCollapsedAncestor = curSpan;
      }
    } else if (curSpan.hasChildren && !res.has(curSpan.spanID)) {
      nearestCollapsedAncestor = curSpan;
    }
    return res;
  }, new Set(state.childrenHiddenIDs));
  // The last one
  if (nearestCollapsedAncestor) {
    childrenHiddenIDs.add(nearestCollapsedAncestor.spanID);
  }
  return { ...state, childrenHiddenIDs };
}

export function expandOne(state: TTraceTimeline, { spans }: TSpansValue) {
  if (state.childrenHiddenIDs.size === 0) {
    return state;
  }
  let prevExpandedDepth = -1;
  let expandNextHiddenSpan = true;
  const childrenHiddenIDs = spans.reduce((res, s) => {
    if (s.depth <= prevExpandedDepth) {
      expandNextHiddenSpan = true;
    }
    if (expandNextHiddenSpan && res.has(s.spanID)) {
      res.delete(s.spanID);
      expandNextHiddenSpan = false;
      prevExpandedDepth = s.depth;
    }
    return res;
  }, new Set(state.childrenHiddenIDs));
  return { ...state, childrenHiddenIDs };
}

function detailToggle(state: TTraceTimeline, { spanID }: TSpanIdValue) {
  const detailStates = new Map(state.detailStates);
  if (detailStates.has(spanID)) {
    detailStates.delete(spanID);
  } else {
    detailStates.set(spanID, new DetailState());
  }
  return { ...state, detailStates };
}

function detailSubsectionToggle(
  subSection: 'tags' | 'process' | 'logs',
  state: TTraceTimeline,
  { spanID }: TSpanIdValue
) {
  const old = state.detailStates.get(spanID);
  if (!old) {
    return state;
  }
  let detailState;
  if (subSection === 'tags') {
    detailState = old.toggleTags();
  } else if (subSection === 'process') {
    detailState = old.toggleProcess();
  } else {
    detailState = old.toggleLogs();
  }
  const detailStates = new Map(state.detailStates);
  detailStates.set(spanID, detailState);
  return { ...state, detailStates };
}

const detailTagsToggle = detailSubsectionToggle.bind(null, 'tags');
const detailProcessToggle = detailSubsectionToggle.bind(null, 'process');
const detailLogsToggle = detailSubsectionToggle.bind(null, 'logs');

function detailLogItemToggle(state: TTraceTimeline, { spanID, logItem }: TSpanIdLogValue) {
  const old = state.detailStates.get(spanID);
  if (!old) {
    return state;
  }
  const detailState = old.toggleLogItem(logItem);
  const detailStates = new Map(state.detailStates);
  detailStates.set(spanID, detailState);
  return { ...state, detailStates };
}

function addHoverIndentGuideId(state: TTraceTimeline, { spanID }: TSpanIdValue) {
  const newHoverIndentGuideIds = new Set(state.hoverIndentGuideIds);
  newHoverIndentGuideIds.add(spanID);

  return { ...state, hoverIndentGuideIds: newHoverIndentGuideIds };
}

function removeHoverIndentGuideId(state: TTraceTimeline, { spanID }: TSpanIdValue) {
  const newHoverIndentGuideIds = new Set(state.hoverIndentGuideIds);
  newHoverIndentGuideIds.delete(spanID);

  return { ...state, hoverIndentGuideIds: newHoverIndentGuideIds };
}

export default handleActions(
  {
    [actionTypes.ADD_HOVER_INDENT_GUIDE_ID]: guardReducer(addHoverIndentGuideId),
    [actionTypes.CHILDREN_TOGGLE]: guardReducer(childrenToggle),
    [actionTypes.COLLAPSE_ALL]: guardReducer(collapseAll),
    [actionTypes.COLLAPSE_ONE]: guardReducer(collapseOne),
    [actionTypes.DETAIL_LOGS_TOGGLE]: guardReducer(detailLogsToggle),
    [actionTypes.DETAIL_LOG_ITEM_TOGGLE]: guardReducer(detailLogItemToggle),
    [actionTypes.DETAIL_PROCESS_TOGGLE]: guardReducer(detailProcessToggle),
    [actionTypes.DETAIL_TAGS_TOGGLE]: guardReducer(detailTagsToggle),
    [actionTypes.DETAIL_TOGGLE]: guardReducer(detailToggle),
    [actionTypes.EXPAND_ALL]: guardReducer(expandAll),
    [actionTypes.EXPAND_ONE]: guardReducer(expandOne),
    [actionTypes.REMOVE_HOVER_INDENT_GUIDE_ID]: guardReducer(removeHoverIndentGuideId),
    [actionTypes.SET_SPAN_NAME_COLUMN_WIDTH]: guardReducer(setColumnWidth),
    [actionTypes.SET_TRACE]: guardReducer(setTrace),
  },
  newInitialState()
);
