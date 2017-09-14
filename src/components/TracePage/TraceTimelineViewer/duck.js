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

import { createActions, handleActions } from 'redux-actions';

import getFilteredSpans from './get-filtered-spans';
import DetailState from './SpanDetail/DetailState';
import generateActionTypes from '../../../utils/generate-action-types';

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
//   findMatches: ?Set<spanID>,
//   detailStates: Map<spanID, DetailState>
// }

export function newInitialState({ spanNameColumnWidth = null, traceID = null } = {}) {
  return {
    traceID,
    spanNameColumnWidth: spanNameColumnWidth || 0.25,
    childrenHiddenIDs: new Set(),
    detailStates: new Map(),
    findMatchesIDs: null,
  };
}

const actionTypes = generateActionTypes('@jaeger-ui/trace-timeline-viewer', [
  'SET_TRACE',
  'SET_SPAN_NAME_COLUMN_WIDTH',
  'CHILDREN_TOGGLE',
  'DETAIL_TOGGLE',
  'DETAIL_TAGS_TOGGLE',
  'DETAIL_PROCESS_TOGGLE',
  'DETAIL_LOGS_TOGGLE',
  'DETAIL_LOG_ITEM_TOGGLE',
  'FIND',
]);

const fullActions = createActions({
  [actionTypes.SET_TRACE]: traceID => ({ traceID }),
  [actionTypes.SET_SPAN_NAME_COLUMN_WIDTH]: width => ({ width }),
  [actionTypes.CHILDREN_TOGGLE]: spanID => ({ spanID }),
  [actionTypes.DETAIL_TOGGLE]: spanID => ({ spanID }),
  [actionTypes.DETAIL_TAGS_TOGGLE]: spanID => ({ spanID }),
  [actionTypes.DETAIL_PROCESS_TOGGLE]: spanID => ({ spanID }),
  [actionTypes.DETAIL_LOGS_TOGGLE]: spanID => ({ spanID }),
  [actionTypes.DETAIL_LOG_ITEM_TOGGLE]: (spanID, logItem) => ({ logItem, spanID }),
  [actionTypes.FIND]: (trace, searchText) => ({ searchText, trace }),
});

export const actions = fullActions.jaegerUi.traceTimelineViewer;

function setTrace(state, { payload }) {
  const { traceID } = payload;
  if (traceID === state.traceID) {
    return state;
  }
  // preserve spanNameColumnWidth when resetting state
  const { spanNameColumnWidth } = state;
  return newInitialState({ spanNameColumnWidth, traceID });
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

function find(state, { payload }) {
  const { searchText, trace } = payload;
  const needle = searchText ? searchText.trim() : null;
  const findMatchesIDs = needle ? getFilteredSpans(trace, needle) : null;
  return { ...state, findMatchesIDs };
}

export default handleActions(
  {
    [actionTypes.SET_TRACE]: setTrace,
    [actionTypes.SET_SPAN_NAME_COLUMN_WIDTH]: setColumnWidth,
    [actionTypes.CHILDREN_TOGGLE]: childrenToggle,
    [actionTypes.DETAIL_TOGGLE]: detailToggle,
    [actionTypes.DETAIL_TAGS_TOGGLE]: detailTagsToggle,
    [actionTypes.DETAIL_PROCESS_TOGGLE]: detailProcessToggle,
    [actionTypes.DETAIL_LOGS_TOGGLE]: detailLogsToggle,
    [actionTypes.DETAIL_LOG_ITEM_TOGGLE]: detailLogItemToggle,
    [actionTypes.FIND]: find,
  },
  newInitialState()
);
