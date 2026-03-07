// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Action, ActionFunctionAny, createActions, handleActions } from 'redux-actions';

import DetailState from './SpanDetail/DetailState';
import { TNil } from '../../../types';
import { IOtelSpan, IOtelTrace, IEvent } from '../../../types/otel';
import TTraceTimeline from '../../../types/TTraceTimeline';
import filterSpans from '../../../utils/filter-spans';
import generateActionTypes from '../../../utils/generate-action-types';
import getConfig from '../../../utils/config/get-config';
import guardReducer from '../../../utils/guardReducer';
import spanAncestorIds from '../../../utils/span-ancestor-ids';

export const SPAN_NAME_COLUMN_WIDTH_MIN = 0.15;
export const SPAN_NAME_COLUMN_WIDTH_MAX = 0.85;
export const SIDE_PANEL_WIDTH_MIN = 0.2;
export const SIDE_PANEL_WIDTH_MAX = 0.7;
// Minimum fraction of page width reserved for the timeline bars column when side panel is visible.
export const MIN_TIMELINE_COLUMN_WIDTH = 0.05;

// payloads
export type TSpanIdLogValue = { logItem: IEvent; spanID: string };
export type TSpanIdValue = { spanID: string };
type TSpansValue = { spans: IOtelSpan[] };
type TTraceUiFindValue = { trace: IOtelTrace; uiFind: string | TNil; allowHide?: boolean };
export type TWidthValue = { width: number };
export type TDetailPanelModeValue = { mode: 'inline' | 'sidepanel' };
export type TTimelineVisibleValue = { visible: boolean };
export type TActionTypes =
  | TSpanIdLogValue
  | TSpanIdValue
  | TSpansValue
  | TTraceUiFindValue
  | TWidthValue
  | TDetailPanelModeValue
  | TTimelineVisibleValue
  | object;

type TTimelineViewerActions = {
  [actionName: string]: ActionFunctionAny<Action<TActionTypes>>;
};

function shouldDisableCollapse(allSpans: IOtelSpan[], hiddenSpansIds: Set<string>) {
  const allParentSpans = allSpans.filter(s => s.hasChildren);
  return allParentSpans.length === hiddenSpansIds.size;
}

export function newInitialState(): TTraceTimeline {
  const { traceTimeline } = getConfig();
  let detailPanelMode: 'inline' | 'sidepanel' = 'inline';
  if (traceTimeline?.enableSidePanel) {
    const stored = localStorage.getItem('detailPanelMode');
    if (stored === 'sidepanel') {
      detailPanelMode = 'sidepanel';
    } else if (traceTimeline.defaultDetailPanelMode === 'sidepanel' && stored === null) {
      detailPanelMode = 'sidepanel';
    }
  }

  // localStorage key kept as 'timelineVisible' for backward compatibility with stored user preferences.
  const storedTimelineVisible = localStorage.getItem('timelineVisible');
  const timelineBarsVisible = storedTimelineVisible === null ? true : storedTimelineVisible !== 'false';

  const parsedSpanNameColumnWidth = parseFloat(localStorage.getItem('spanNameColumnWidth') ?? '');
  let spanNameColumnWidth = Number.isNaN(parsedSpanNameColumnWidth)
    ? 0.25
    : Math.min(Math.max(parsedSpanNameColumnWidth, SPAN_NAME_COLUMN_WIDTH_MIN), SPAN_NAME_COLUMN_WIDTH_MAX);

  const parsedSidePanelWidth = parseFloat(localStorage.getItem('sidePanelWidth') ?? '');
  const sidePanelWidthExplicit = !Number.isNaN(parsedSidePanelWidth);
  // Default: equal split between timeline and span details columns, clamped to allowed range.
  const rawSidePanelWidth = sidePanelWidthExplicit ? parsedSidePanelWidth : (1 - spanNameColumnWidth) / 2;
  let sidePanelWidth = Math.min(Math.max(rawSidePanelWidth, SIDE_PANEL_WIDTH_MIN), SIDE_PANEL_WIDTH_MAX);
  // Sanity check: the two stored widths must leave room for the timeline column.
  // Only applies when sidePanelWidth was explicitly stored (not derived from spanNameColumnWidth),
  // since the default formula always produces a consistent value before clamping.
  // First try resetting only sidePanelWidth. If spanNameColumnWidth is so large that even the
  // minimum side-panel width leaves no room (sum still >= 1), reset both to defaults.
  if (sidePanelWidthExplicit && spanNameColumnWidth + sidePanelWidth >= 1) {
    sidePanelWidth = Math.min(
      Math.max((1 - spanNameColumnWidth) / 2, SIDE_PANEL_WIDTH_MIN),
      SIDE_PANEL_WIDTH_MAX
    );
    if (spanNameColumnWidth + sidePanelWidth >= 1) {
      spanNameColumnWidth = 0.25;
      sidePanelWidth = (1 - spanNameColumnWidth) / 2; // 0.375, within [SIDE_PANEL_WIDTH_MIN, SIDE_PANEL_WIDTH_MAX]
    }
  }
  // Second sanity check: in side-panel mode the timeline column must also have MIN_TIMELINE_COLUMN_WIDTH.
  // This covers the case where sidePanelWidth was derived (not explicit) but was clamped up to
  // SIDE_PANEL_WIDTH_MIN, leaving no room for the minimum timeline column.
  if (
    detailPanelMode === 'sidepanel' &&
    spanNameColumnWidth + sidePanelWidth > 1 - MIN_TIMELINE_COLUMN_WIDTH
  ) {
    sidePanelWidth = Math.min(
      Math.max(1 - MIN_TIMELINE_COLUMN_WIDTH - spanNameColumnWidth, SIDE_PANEL_WIDTH_MIN),
      SIDE_PANEL_WIDTH_MAX
    );
    if (spanNameColumnWidth + sidePanelWidth > 1 - MIN_TIMELINE_COLUMN_WIDTH) {
      spanNameColumnWidth = 0.25;
      sidePanelWidth = (1 - MIN_TIMELINE_COLUMN_WIDTH - spanNameColumnWidth) / 2; // within [SIDE_PANEL_WIDTH_MIN, SIDE_PANEL_WIDTH_MAX]
    }
  }

  return {
    childrenHiddenIDs: new Set(),
    detailStates: new Map(),
    detailPanelMode,
    hoverIndentGuideIds: new Set(),
    shouldScrollToFirstUiFindMatch: false,
    sidePanelWidth,
    spanNameColumnWidth,
    timelineBarsVisible,
    traceID: null,
  };
}

export const actionTypes = generateActionTypes('@jaeger-ui/trace-timeline-viewer', [
  'ADD_HOVER_INDENT_GUIDE_ID',
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
  'REMOVE_HOVER_INDENT_GUIDE_ID',
  'SET_DETAIL_PANEL_MODE',
  'SET_SIDE_PANEL_WIDTH',
  'SET_SPAN_NAME_COLUMN_WIDTH',
  'SET_TIMELINE_BARS_VISIBLE',
  'SET_TRACE',
]);

const fullActions = createActions<TActionTypes>({
  [actionTypes.ADD_HOVER_INDENT_GUIDE_ID]: (spanID: string) => ({ spanID }),
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
  [actionTypes.REMOVE_HOVER_INDENT_GUIDE_ID]: (spanID: string) => ({ spanID }),
  [actionTypes.SET_DETAIL_PANEL_MODE]: (mode: 'inline' | 'sidepanel') => ({ mode }),
  [actionTypes.SET_SIDE_PANEL_WIDTH]: (width: number) => ({ width }),
  [actionTypes.SET_SPAN_NAME_COLUMN_WIDTH]: (width: number) => ({ width }),
  [actionTypes.SET_TIMELINE_BARS_VISIBLE]: (visible: boolean) => ({ visible }),
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
  const { spanNameColumnWidth, detailPanelMode, timelineBarsVisible, sidePanelWidth } = state;

  return Object.assign(
    {
      ...newInitialState(),
      spanNameColumnWidth,
      detailPanelMode,
      timelineBarsVisible,
      sidePanelWidth,
      traceID,
    },
    uiFind ? calculateFocusedFindRowStates(uiFind, spans) : null
  );
}

function setColumnWidth(state: TTraceTimeline, { width }: TWidthValue): TTraceTimeline {
  // In side-panel mode the name column must leave room for both the side panel and timeline bars.
  const maxWidth =
    state.detailPanelMode === 'sidepanel'
      ? Math.min(SPAN_NAME_COLUMN_WIDTH_MAX, 1 - state.sidePanelWidth - MIN_TIMELINE_COLUMN_WIDTH)
      : SPAN_NAME_COLUMN_WIDTH_MAX;
  const spanNameColumnWidth = Math.min(Math.max(width, SPAN_NAME_COLUMN_WIDTH_MIN), maxWidth);
  localStorage.setItem('spanNameColumnWidth', spanNameColumnWidth.toString());
  return { ...state, spanNameColumnWidth };
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
  if (state.detailPanelMode === 'sidepanel') {
    // In side panel mode, only one span can be expanded at a time.
    if (state.detailStates.has(spanID)) {
      return { ...state, detailStates: new Map() };
    }
    const detailStates = new Map<string, DetailState>();
    detailStates.set(spanID, new DetailState());
    return { ...state, detailStates };
  }
  // Inline mode: toggle as before, multiple spans can be expanded.
  const detailStates = new Map(state.detailStates);
  if (detailStates.has(spanID)) {
    detailStates.delete(spanID);
  } else {
    detailStates.set(spanID, new DetailState());
  }
  return { ...state, detailStates };
}

function setDetailPanelMode(state: TTraceTimeline, { mode }: TDetailPanelModeValue): TTraceTimeline {
  localStorage.setItem('detailPanelMode', mode);
  let { detailStates } = state;
  // When switching to sidepanel mode, keep at most one entry in detailStates.
  if (mode === 'sidepanel' && detailStates.size > 1) {
    const firstEntry = detailStates.entries().next().value;
    detailStates = new Map();
    if (firstEntry) {
      detailStates.set(firstEntry[0], firstEntry[1]);
    }
  }
  // When switching to sidepanel mode, ensure spanNameColumnWidth leaves room for the side panel and
  // the minimum timeline column. A wide name column stored in inline mode would otherwise produce a
  // zero/negative timeline column width as soon as the side panel is enabled.
  let { spanNameColumnWidth } = state;
  if (mode === 'sidepanel') {
    const maxWidth = Math.min(
      SPAN_NAME_COLUMN_WIDTH_MAX,
      1 - state.sidePanelWidth - MIN_TIMELINE_COLUMN_WIDTH
    );
    spanNameColumnWidth = Math.min(spanNameColumnWidth, maxWidth);
  }
  return { ...state, detailPanelMode: mode, detailStates, spanNameColumnWidth };
}

function setTimelineBarsVisible(state: TTraceTimeline, { visible }: TTimelineVisibleValue): TTraceTimeline {
  // localStorage key kept as 'timelineVisible' for backward compatibility with stored user preferences.
  localStorage.setItem('timelineVisible', String(visible));
  return { ...state, timelineBarsVisible: visible };
}

function setSidePanelWidth(state: TTraceTimeline, { width }: TWidthValue): TTraceTimeline {
  // When timeline bars are visible, reserve MIN_TIMELINE_COLUMN_WIDTH for them; otherwise the
  // side panel can absorb all space not occupied by the name column.
  const availableWidth = state.timelineBarsVisible
    ? 1 - state.spanNameColumnWidth - MIN_TIMELINE_COLUMN_WIDTH
    : 1 - state.spanNameColumnWidth;
  const maxWidth = Math.max(SIDE_PANEL_WIDTH_MIN, Math.min(SIDE_PANEL_WIDTH_MAX, availableWidth));
  const sidePanelWidth = Math.min(Math.max(width, SIDE_PANEL_WIDTH_MIN), maxWidth);
  localStorage.setItem('sidePanelWidth', sidePanelWidth.toString());
  return { ...state, sidePanelWidth };
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

export default handleActions<TTraceTimeline, any>(
  {
    [actionTypes.ADD_HOVER_INDENT_GUIDE_ID]: guardReducer(addHoverIndentGuideId),
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
    [actionTypes.REMOVE_HOVER_INDENT_GUIDE_ID]: guardReducer(removeHoverIndentGuideId),
    [actionTypes.SET_DETAIL_PANEL_MODE]: guardReducer(setDetailPanelMode),
    [actionTypes.SET_SIDE_PANEL_WIDTH]: guardReducer(setSidePanelWidth),
    [actionTypes.SET_SPAN_NAME_COLUMN_WIDTH]: guardReducer(setColumnWidth),
    [actionTypes.SET_TIMELINE_BARS_VISIBLE]: guardReducer(setTimelineBarsVisible),
    [actionTypes.SET_TRACE]: guardReducer(setTrace),
  },
  newInitialState()
);
