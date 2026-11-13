// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Action, ActionFunctionAny, createActions, handleActions } from 'redux-actions';

import DetailState from './SpanDetail/DetailState';
import { TNil } from '../../../types';
import { IOtelSpan, IOtelTrace, IEvent } from '../../../types/otel';
import TTraceTimeline from '../../../types/TTraceTimeline';
import filterSpans from '../../../utils/filter-spans';
import generateActionTypes from '../../../utils/generate-action-types';
import guardReducer from '../../../utils/guardReducer';
import spanAncestorIds from '../../../utils/span-ancestor-ids';
import { shouldDisableCollapse } from './timeline-utils';

// payloads
export type TSpanIdLogValue = { logItem: IEvent; spanID: string };
export type TSpanIdValue = { spanID: string };
type TSpansValue = { spans: IOtelSpan[] };
type TTraceUiFindValue = { trace: IOtelTrace; uiFind: string | TNil; allowHide?: boolean };
type TActionTypes = TSpanIdLogValue | TSpanIdValue | TSpansValue | TTraceUiFindValue | object;

type TTimelineViewerActions = {
  [actionName: string]: ActionFunctionAny<Action<TActionTypes>>;
};

export function newInitialState(): TTraceTimeline {
  return {
    childrenHiddenIDs: new Set(),
    detailStates: new Map(),
    shouldScrollToFirstUiFindMatch: false,
    traceID: null,
  };
}

export const actionTypes = generateActionTypes('@jaeger-ui/trace-timeline-viewer', [
  'CHILDREN_TOGGLE',
  'CLEAR_SHOULD_SCROLL_TO_FIRST_UI_FIND_MATCH',
  'COLLAPSE_ALL',
  'COLLAPSE_ONE',
  'DETAIL_TOGGLE',
  'DETAIL_TAGS_TOGGLE',
  'DETAIL_PROCESS_TOGGLE',
  'DETAIL_LOGS_TOGGLE',
  'DETAIL_LOG_ITEM_TOGGLE',
  'DETAIL_WARNINGS_TOGGLE',
  'DETAIL_REFERENCES_TOGGLE',
  'EXPAND_ALL',
  'EXPAND_ONE',
  'FOCUS_UI_FIND_MATCHES',
  'SET_TRACE',
]);

const fullActions = createActions<TActionTypes>({
  [actionTypes.CHILDREN_TOGGLE]: (spanID: string) => ({ spanID }),
  [actionTypes.CLEAR_SHOULD_SCROLL_TO_FIRST_UI_FIND_MATCH]: () => ({}),
  [actionTypes.COLLAPSE_ALL]: (spans: IOtelSpan[]) => ({ spans }),
  [actionTypes.COLLAPSE_ONE]: (spans: IOtelSpan[]) => ({ spans }),
  [actionTypes.DETAIL_LOG_ITEM_TOGGLE]: (spanID: string, logItem: IEvent) => ({ logItem, spanID }),
  [actionTypes.DETAIL_LOGS_TOGGLE]: (spanID: string) => ({ spanID }),
  [actionTypes.EXPAND_ALL]: () => ({}),
  [actionTypes.EXPAND_ONE]: (spans: IOtelSpan[]) => ({ spans }),
  [actionTypes.DETAIL_PROCESS_TOGGLE]: (spanID: string) => ({ spanID }),
  [actionTypes.DETAIL_WARNINGS_TOGGLE]: (spanID: string) => ({ spanID }),
  [actionTypes.DETAIL_REFERENCES_TOGGLE]: (spanID: string) => ({ spanID }),
  [actionTypes.DETAIL_TAGS_TOGGLE]: (spanID: string) => ({ spanID }),
  [actionTypes.DETAIL_TOGGLE]: (spanID: string) => ({ spanID }),
  [actionTypes.FOCUS_UI_FIND_MATCHES]: (trace: IOtelTrace, uiFind: string | TNil, allowHide?: boolean) => ({
    trace,
    uiFind,
    allowHide,
  }),
  [actionTypes.SET_TRACE]: (trace: IOtelTrace, uiFind: string | TNil) => ({ trace, uiFind }),
});

export const actions = (fullActions as any).jaegerUi.traceTimelineViewer as TTimelineViewerActions;

/** Returns the currently selected span ID in side-panel mode (first key of detailStates), or null. */
export function getSelectedSpanID(detailStates: Map<string, DetailState | TNil>): string | null {
  return detailStates.size > 0 ? (detailStates.keys().next().value as string) : null;
}

function calculateFocusedFindRowStates(uiFind: string, spans: ReadonlyArray<IOtelSpan>, allowHide = true) {
  const spansMap = new Map();
  const childrenHiddenIDs: Set<string> = new Set();
  const detailStates: Map<string, DetailState> = new Map();
  let shouldScrollToFirstUiFindMatch = false;

  spans.forEach(span => {
    spansMap.set(span.spanID, span);
    if (allowHide) {
      childrenHiddenIDs.add(span.spanID);
    }
  });
  const matchedSpanIds = filterSpans(uiFind, spans);
  if (matchedSpanIds && matchedSpanIds.size) {
    matchedSpanIds.forEach(spanID => {
      const span = spansMap.get(spanID);
      detailStates.set(spanID, new DetailState());
      spanAncestorIds(span).forEach(ancestorID => childrenHiddenIDs.delete(ancestorID));
    });
    shouldScrollToFirstUiFindMatch = true;
  }
  return {
    childrenHiddenIDs,
    detailStates,
    shouldScrollToFirstUiFindMatch,
  };
}

function focusUiFindMatches(state: TTraceTimeline, { uiFind, trace, allowHide }: TTraceUiFindValue) {
  if (!uiFind) return state;
  return {
    ...state,
    ...calculateFocusedFindRowStates(uiFind, trace.spans, allowHide),
  };
}

function clearShouldScrollToFirstUiFindMatch(state: TTraceTimeline) {
  if (state.shouldScrollToFirstUiFindMatch) {
    return { ...state, shouldScrollToFirstUiFindMatch: false };
  }
  return state;
}

function setTrace(state: TTraceTimeline, { uiFind, trace }: TTraceUiFindValue) {
  const { traceID, spans } = trace;
  if (traceID === state.traceID) {
    return state;
  }

  return Object.assign(
    { ...newInitialState(), traceID },
    uiFind ? calculateFocusedFindRowStates(uiFind, spans) : null
  );
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
  const childrenHiddenIDs = new Set<string>();
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
  }, new Set<string>());
  return { ...state, childrenHiddenIDs };
}

export function collapseOne(state: TTraceTimeline, { spans }: TSpansValue) {
  if (shouldDisableCollapse(spans, state.childrenHiddenIDs)) {
    return state;
  }
  let nearestCollapsedAncestor: IOtelSpan | undefined;
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
  // This reducer only ever runs in inline mode: side-panel mode is a layout preference now
  // owned by useLayoutPrefsStore, and its detail-toggle equivalent lives in store.timeline.ts.
  // Multiple spans can be expanded at once.
  const detailStates = new Map(state.detailStates);
  if (detailStates.has(spanID)) {
    detailStates.delete(spanID);
  } else {
    detailStates.set(spanID, new DetailState());
  }
  return { ...state, detailStates };
}

function detailSubsectionToggle(
  subSection: 'tags' | 'process' | 'logs' | 'warnings' | 'references',
  state: TTraceTimeline,
  { spanID }: TSpanIdValue
) {
  const old = state.detailStates.get(spanID) ?? new DetailState();
  let detailState;
  if (subSection === 'tags') {
    detailState = old.toggleTags();
  } else if (subSection === 'process') {
    detailState = old.toggleProcess();
  } else if (subSection === 'warnings') {
    detailState = old.toggleWarnings();
  } else if (subSection === 'references') {
    detailState = old.toggleReferences();
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
const detailWarningsToggle = detailSubsectionToggle.bind(null, 'warnings');
const detailReferencesToggle = detailSubsectionToggle.bind(null, 'references');

function detailLogItemToggle(state: TTraceTimeline, { spanID, logItem }: TSpanIdLogValue) {
  const old = state.detailStates.get(spanID) ?? new DetailState();
  const detailState = old.toggleLogItem(logItem);
  const detailStates = new Map(state.detailStates);
  detailStates.set(spanID, detailState);
  return { ...state, detailStates };
}

export default handleActions<TTraceTimeline, any>(
  {
    [actionTypes.CHILDREN_TOGGLE]: guardReducer(childrenToggle),
    [actionTypes.CLEAR_SHOULD_SCROLL_TO_FIRST_UI_FIND_MATCH]: guardReducer(
      clearShouldScrollToFirstUiFindMatch
    ),
    [actionTypes.COLLAPSE_ALL]: guardReducer(collapseAll),
    [actionTypes.COLLAPSE_ONE]: guardReducer(collapseOne),
    [actionTypes.DETAIL_LOGS_TOGGLE]: guardReducer(detailLogsToggle),
    [actionTypes.DETAIL_LOG_ITEM_TOGGLE]: guardReducer(detailLogItemToggle),
    [actionTypes.DETAIL_PROCESS_TOGGLE]: guardReducer(detailProcessToggle),
    [actionTypes.DETAIL_WARNINGS_TOGGLE]: guardReducer(detailWarningsToggle),
    [actionTypes.DETAIL_REFERENCES_TOGGLE]: guardReducer(detailReferencesToggle),
    [actionTypes.DETAIL_TAGS_TOGGLE]: guardReducer(detailTagsToggle),
    [actionTypes.DETAIL_TOGGLE]: guardReducer(detailToggle),
    [actionTypes.EXPAND_ALL]: guardReducer(expandAll),
    [actionTypes.EXPAND_ONE]: guardReducer(expandOne),
    [actionTypes.FOCUS_UI_FIND_MATCHES]: guardReducer(focusUiFindMatches),
    [actionTypes.SET_TRACE]: guardReducer(setTrace),
  },
  newInitialState()
);
