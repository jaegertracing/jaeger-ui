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

import { createActions, handleActions } from 'redux-actions';

import DetailState from './SpanDetail/DetailState';
import filterSpans from '../../../utils/filter-spans';
import generateActionTypes from '../../../utils/generate-action-types';
import spanAncestorIds from '../../../utils/span-ancestor-ids';

// DetailState {
//   isTagsOpen: bool,
//   isProcessOpen: bool,
//   logs: {
//     isOpen: bool,
//     openItems: Set<LogItem>
//   }
// }
//
// TraceState {
//   traceID: string,
//   spanNameColumnWidth:
//   childrenHiddenIDs: Set<spanID>,
//   detailStates: Map<spanID, DetailState>
// }

export function newInitialState() {
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

const fullActions = createActions({
  [actionTypes.SET_TRACE]: (trace, uiFind) => ({ trace, uiFind }),
  [actionTypes.SET_SPAN_NAME_COLUMN_WIDTH]: width => ({ width }),
  [actionTypes.CHILDREN_TOGGLE]: spanID => ({ spanID }),
  [actionTypes.EXPAND_ALL]: () => ({}),
  [actionTypes.EXPAND_ONE]: spans => ({ spans }),
  [actionTypes.COLLAPSE_ALL]: spans => ({ spans }),
  [actionTypes.COLLAPSE_ONE]: spans => ({ spans }),
  [actionTypes.DETAIL_TOGGLE]: spanID => ({ spanID }),
  [actionTypes.DETAIL_TAGS_TOGGLE]: spanID => ({ spanID }),
  [actionTypes.DETAIL_PROCESS_TOGGLE]: spanID => ({ spanID }),
  [actionTypes.DETAIL_LOGS_TOGGLE]: spanID => ({ spanID }),
  [actionTypes.DETAIL_LOG_ITEM_TOGGLE]: (spanID, logItem) => ({ logItem, spanID }),
  [actionTypes.ADD_HOVER_INDENT_GUIDE_ID]: spanID => ({ spanID }),
  [actionTypes.REMOVE_HOVER_INDENT_GUIDE_ID]: spanID => ({ spanID }),
});

export const actions = fullActions.jaegerUi.traceTimelineViewer;

function setTrace(state, { payload }) {
  const { uiFind, trace } = payload;
  const { traceID, spans } = trace;
  if (traceID === state.traceID) {
    return state;
  }
  // preserve spanNameColumnWidth when resetting state
  const { spanNameColumnWidth } = state;
  const newStateValues = { spanNameColumnWidth, traceID };

  // If there is a filter, collapse all rows except the path(s) to match(es) and show details for match(es)
  if (uiFind) {
    const spansMap = new Map();

    newStateValues.childrenHiddenIDs = new Set();
    newStateValues.detailStates = new Map();

    spans.forEach(span => {
      spansMap.set(span.spanID, span);
      newStateValues.childrenHiddenIDs.add(span.spanID);
    });

    filterSpans(uiFind, spans).forEach(spanID => {
      const span = spansMap.get(spanID);
      newStateValues.detailStates.set(spanID, new DetailState());
      spanAncestorIds(span).forEach(ancestorID => newStateValues.childrenHiddenIDs.delete(ancestorID));
    });
  }

  return Object.assign(newInitialState(), newStateValues);
}

function setColumnWidth(state, { payload }) {
  const { width } = payload;
  return { ...state, spanNameColumnWidth: width };
}

function childrenToggle(state, { payload }) {
  const { spanID } = payload;
  const childrenHiddenIDs = new Set(state.childrenHiddenIDs);
  if (childrenHiddenIDs.has(spanID)) {
    childrenHiddenIDs.delete(spanID);
  } else {
    childrenHiddenIDs.add(spanID);
  }
  return { ...state, childrenHiddenIDs };
}

function shouldDisableCollapse(allSpans, hiddenSpansIds) {
  const allParentSpans = allSpans.filter(s => s.hasChildren);
  return allParentSpans.length === hiddenSpansIds.size;
}

export function expandAll(state) {
  const childrenHiddenIDs = new Set();
  return { ...state, childrenHiddenIDs };
}

export function collapseAll(state, { payload }) {
  const { spans } = payload;
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

export function collapseOne(state, { payload }) {
  const { spans } = payload;
  if (shouldDisableCollapse(spans, state.childrenHiddenIDs)) {
    return state;
  }
  let nearestCollapsedAncestor;
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
  childrenHiddenIDs.add(nearestCollapsedAncestor.spanID);
  return { ...state, childrenHiddenIDs };
}

export function expandOne(state, { payload }) {
  const { spans } = payload;
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

function detailToggle(state, { payload }) {
  const { spanID } = payload;
  const detailStates = new Map(state.detailStates);
  if (detailStates.has(spanID)) {
    detailStates.delete(spanID);
  } else {
    detailStates.set(spanID, new DetailState());
  }
  return { ...state, detailStates };
}

function detailSubsectionToggle(subSection, state, { payload }) {
  const { spanID } = payload;
  const old = state.detailStates.get(spanID);
  let detailState;
  if (subSection === 'tags') {
    detailState = old.toggleTags();
  } else if (subSection === 'process') {
    detailState = old.toggleProcess();
  } else if (subSection === 'logs') {
    detailState = old.toggleLogs();
  }
  const detailStates = new Map(state.detailStates);
  detailStates.set(spanID, detailState);
  return { ...state, detailStates };
}

const detailTagsToggle = detailSubsectionToggle.bind(null, 'tags');
const detailProcessToggle = detailSubsectionToggle.bind(null, 'process');
const detailLogsToggle = detailSubsectionToggle.bind(null, 'logs');

function detailLogItemToggle(state, { payload }) {
  const { spanID, logItem } = payload;
  const old = state.detailStates.get(spanID);
  const detailState = old.toggleLogItem(logItem);
  const detailStates = new Map(state.detailStates);
  detailStates.set(spanID, detailState);
  return { ...state, detailStates };
}

function addHoverIndentGuideId(state, { payload }) {
  const { spanID } = payload;
  const newHoverIndentGuideIds = new Set(state.hoverIndentGuideIds);
  newHoverIndentGuideIds.add(spanID);

  return { ...state, hoverIndentGuideIds: newHoverIndentGuideIds };
}

function removeHoverIndentGuideId(state, { payload }) {
  const { spanID } = payload;
  const newHoverIndentGuideIds = new Set(state.hoverIndentGuideIds);
  newHoverIndentGuideIds.delete(spanID);

  return { ...state, hoverIndentGuideIds: newHoverIndentGuideIds };
}

export default handleActions(
  {
    [actionTypes.SET_TRACE]: setTrace,
    [actionTypes.SET_SPAN_NAME_COLUMN_WIDTH]: setColumnWidth,
    [actionTypes.CHILDREN_TOGGLE]: childrenToggle,
    [actionTypes.EXPAND_ALL]: expandAll,
    [actionTypes.EXPAND_ONE]: expandOne,
    [actionTypes.COLLAPSE_ALL]: collapseAll,
    [actionTypes.COLLAPSE_ONE]: collapseOne,
    [actionTypes.DETAIL_TOGGLE]: detailToggle,
    [actionTypes.DETAIL_TAGS_TOGGLE]: detailTagsToggle,
    [actionTypes.DETAIL_PROCESS_TOGGLE]: detailProcessToggle,
    [actionTypes.DETAIL_LOGS_TOGGLE]: detailLogsToggle,
    [actionTypes.DETAIL_LOG_ITEM_TOGGLE]: detailLogItemToggle,
    [actionTypes.ADD_HOVER_INDENT_GUIDE_ID]: addHoverIndentGuideId,
    [actionTypes.REMOVE_HOVER_INDENT_GUIDE_ID]: removeHoverIndentGuideId,
  },
  newInitialState()
);
