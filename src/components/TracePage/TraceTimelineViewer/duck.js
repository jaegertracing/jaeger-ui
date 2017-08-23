//* eslint-disable */

import { createActions, handleActions } from 'redux-actions';

import getFilteredSpans from './get-filtered-spans';
import DetailState from './SpanDetail/detail-state';

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
//   trace: Trace,
//   childrenHiddenIDs: Set<spanID>,
//   findMatches: ?Set<spanID>,
//   detailStates: Map<spanID, DetailState>
// }
//

export function newInitialState(trace = null) {
  return {
    trace,
    childrenHiddenIDs: new Set(),
    detailStates: new Map(),
    findMatchesIDs: null,
  };
}

export const actions = createActions({
  CHILDREN_TOGGLE: spanID => ({ spanID }),
  DETAIL_TOGGLE: spanID => ({ spanID }),
  DETAIL_TAGS_TOGGLE: spanID => ({ spanID }),
  DETAIL_PROCESS_TOGGLE: spanID => ({ spanID }),
  DETAIL_LOGS_TOGGLE: spanID => ({ spanID }),
  DETAIL_LOG_ITEM_TOGGLE: (spanID, logItem) => ({ logItem, spanID }),
  FIND: searchText => ({ searchText }),
});

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
  const { searchText } = payload;
  const needle = searchText ? searchText.trim() : null;
  const findMatchesIDs = needle ? getFilteredSpans(state.trace, needle) : null;
  return { ...state, findMatchesIDs };
}

export default handleActions(
  {
    CHILDREN_TOGGLE: childrenToggle,
    DETAIL_TOGGLE: detailToggle,
    DETAIL_TAGS_TOGGLE: detailTagsToggle,
    DETAIL_PROCESS_TOGGLE: detailProcessToggle,
    DETAIL_LOGS_TOGGLE: detailLogsToggle,
    DETAIL_LOG_ITEM_TOGGLE: detailLogItemToggle,
    FIND: find,
  },
  newInitialState()
);
