// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import DetailState from './SpanDetail/DetailState';
import { TNil } from '../../../types';
import { IOtelSpan, IOtelTrace, IEvent } from '../../../types/otel';
import type { SpanDetailPanelMode } from '../../../types/config';
import getConfig from '../../../utils/config/get-config';
import filterSpans from '../../../utils/filter-spans';
import spanAncestorIds from '../../../utils/span-ancestor-ids';

export const SPAN_NAME_COLUMN_WIDTH_MIN = 0.15;
export const SPAN_NAME_COLUMN_WIDTH_MAX = 0.85;
export const SIDE_PANEL_WIDTH_MIN = 0.2;
export const SIDE_PANEL_WIDTH_MAX = 0.7;
export const MIN_TIMELINE_COLUMN_WIDTH = 0.05;

function shouldDisableCollapse(allSpans: ReadonlyArray<IOtelSpan>, hiddenSpansIds: Set<string>): boolean {
  return allSpans.filter(s => s.hasChildren).every(p => hiddenSpansIds.has(p.spanID));
}

type FocusedFindRowStates = {
  childrenHiddenIDs: Set<string>;
  detailStates: Map<string, DetailState>;
  shouldScrollToFirstUiFindMatch: boolean;
};

export function calculateFocusedFindRowStates(
  uiFind: string,
  spans: ReadonlyArray<IOtelSpan>,
  allowHide = true
): FocusedFindRowStates {
  const spansMap = new Map<string, IOtelSpan>();
  const childrenHiddenIDs: Set<string> = new Set();
  const detailStates: Map<string, DetailState> = new Map();
  let shouldScrollToFirstUiFindMatch = false;

  spans.forEach(span => {
    spansMap.set(span.spanID, span);
    if (allowHide && span.hasChildren) {
      childrenHiddenIDs.add(span.spanID);
    }
  });

  const matchedSpanIds = filterSpans(uiFind, spans);
  if (matchedSpanIds && matchedSpanIds.size) {
    matchedSpanIds.forEach(spanID => {
      const span = spansMap.get(spanID);
      detailStates.set(spanID, new DetailState());
      if (span) {
        spanAncestorIds(span).forEach(ancestorID => childrenHiddenIDs.delete(ancestorID));
      }
    });
    shouldScrollToFirstUiFindMatch = true;
  }

  return { childrenHiddenIDs, detailStates, shouldScrollToFirstUiFindMatch };
}

/** Returns the currently selected span ID in side-panel mode (first key of detailStates), or null. */
export function getSelectedSpanID(detailStates: Map<string, DetailState | TNil>): string | null {
  return detailStates.size > 0 ? (detailStates.keys().next().value as string) : null;
}

export type TraceTimelineLayoutStore = {
  spanNameColumnWidth: number;
  sidePanelWidth: number;
  detailPanelMode: SpanDetailPanelMode;
  timelineBarsVisible: boolean;
  setSpanNameColumnWidth: (width: number) => void;
  setSidePanelWidth: (width: number) => void;
  setDetailPanelMode: (mode: SpanDetailPanelMode) => void;
  setTimelineBarsVisible: (visible: boolean) => void;

  traceID: string | null;
  childrenHiddenIDs: Set<string>;
  detailStates: Map<string, DetailState>;
  shouldScrollToFirstUiFindMatch: boolean;
  // Resets ephemeral fields for a new trace and optionally pre-applies a uiFind filter.
  setTrace: (trace: IOtelTrace, uiFind?: string | TNil) => void;
  childrenToggle: (spanID: string) => void;
  expandAll: () => void;
  expandOne: (spans: ReadonlyArray<IOtelSpan>) => void;
  collapseAll: (spans: ReadonlyArray<IOtelSpan>) => void;
  collapseOne: (spans: ReadonlyArray<IOtelSpan>) => void;
  detailToggle: (spanID: string) => void;
  detailTagsToggle: (spanID: string) => void;
  detailProcessToggle: (spanID: string) => void;
  detailLogsToggle: (spanID: string) => void;
  detailLogItemToggle: (spanID: string, logItem: IEvent) => void;
  detailWarningsToggle: (spanID: string) => void;
  detailReferencesToggle: (spanID: string) => void;
  clearShouldScrollToFirstUiFindMatch: () => void;
  focusUiFindMatches: (trace: IOtelTrace, uiFind?: string | TNil, allowHide?: boolean) => void;
};

// Reads user layout preferences from localStorage and merges them with config-driven defaults.
// Mirrors the logic that was previously in TraceTimelineViewer/duck.ts `newInitialState()`.
export function getInitialLayoutState(): Pick<
  TraceTimelineLayoutStore,
  'spanNameColumnWidth' | 'sidePanelWidth' | 'detailPanelMode' | 'timelineBarsVisible'
> {
  const { traceTimeline } = getConfig();

  let detailPanelMode: SpanDetailPanelMode = 'inline';
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

  // The two stored widths must leave room for the timeline column.
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
      sidePanelWidth = (1 - spanNameColumnWidth) / 2;
    }
  }
  // in side-panel mode the timeline column must also have MIN_TIMELINE_COLUMN_WIDTH.
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
      sidePanelWidth = (1 - MIN_TIMELINE_COLUMN_WIDTH - spanNameColumnWidth) / 2;
    }
  }

  return { spanNameColumnWidth, sidePanelWidth, detailPanelMode, timelineBarsVisible };
}

//subsection helper
type SubSection = 'tags' | 'process' | 'logs' | 'warnings' | 'references';

function applyDetailSubsectionToggle(
  detailStates: Map<string, DetailState>,
  detailPanelMode: SpanDetailPanelMode,
  spanID: string,
  subSection: SubSection
): Map<string, DetailState> {
  const old = detailStates.get(spanID) ?? DetailState.forDetailPanelMode(detailPanelMode);
  let detailState: DetailState;
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
  const next = new Map(detailStates);
  next.set(spanID, detailState);
  return next;
}
export const useTraceTimelineStore = create<TraceTimelineLayoutStore>()((set, get) => ({
  ...getInitialLayoutState(),

  traceID: null,
  childrenHiddenIDs: new Set<string>(),
  detailStates: new Map<string, DetailState>(),
  shouldScrollToFirstUiFindMatch: false,

  setSpanNameColumnWidth: (width: number) => {
    const { detailPanelMode, sidePanelWidth } = get();
    const maxWidth =
      detailPanelMode === 'sidepanel'
        ? Math.min(SPAN_NAME_COLUMN_WIDTH_MAX, 1 - sidePanelWidth - MIN_TIMELINE_COLUMN_WIDTH)
        : SPAN_NAME_COLUMN_WIDTH_MAX;
    const spanNameColumnWidth = Math.min(Math.max(width, SPAN_NAME_COLUMN_WIDTH_MIN), maxWidth);
    localStorage.setItem('spanNameColumnWidth', spanNameColumnWidth.toString());
    set({ spanNameColumnWidth });
  },

  setSidePanelWidth: (width: number) => {
    const { timelineBarsVisible, spanNameColumnWidth } = get();
    const availableWidth = timelineBarsVisible
      ? 1 - spanNameColumnWidth - MIN_TIMELINE_COLUMN_WIDTH
      : 1 - spanNameColumnWidth;
    const maxWidth = Math.max(SIDE_PANEL_WIDTH_MIN, Math.min(SIDE_PANEL_WIDTH_MAX, availableWidth));
    const sidePanelWidth = Math.min(Math.max(width, SIDE_PANEL_WIDTH_MIN), maxWidth);
    localStorage.setItem('sidePanelWidth', sidePanelWidth.toString());
    set({ sidePanelWidth });
  },

  setDetailPanelMode: (mode: SpanDetailPanelMode) => {
    localStorage.setItem('detailPanelMode', mode);
    let { spanNameColumnWidth, detailStates } = get();
    if (mode === 'sidepanel') {
      // Keep at most one entry in detailStates, upgraded to side-panel defaults.
      if (detailStates.size > 0) {
        const firstKey = detailStates.keys().next().value as string;
        detailStates = new Map([[firstKey, DetailState.forDetailPanelMode('sidepanel')]]);
      }
      const { sidePanelWidth } = get();
      const maxWidth = Math.min(SPAN_NAME_COLUMN_WIDTH_MAX, 1 - sidePanelWidth - MIN_TIMELINE_COLUMN_WIDTH);
      spanNameColumnWidth = Math.min(spanNameColumnWidth, maxWidth);
    }
    set({ detailPanelMode: mode, detailStates, spanNameColumnWidth });
  },

  setTimelineBarsVisible: (visible: boolean) => {
    localStorage.setItem('timelineVisible', String(visible));
    set({ timelineBarsVisible: visible });
  },

  setTrace: (trace: IOtelTrace, uiFind?: string | TNil) => {
    const { traceID: currentTraceID } = get();
    if (trace.traceID === currentTraceID) return;

    const base: Partial<TraceTimelineLayoutStore> = {
      traceID: trace.traceID,
      childrenHiddenIDs: new Set<string>(),
      detailStates: new Map<string, DetailState>(),
      shouldScrollToFirstUiFindMatch: false,
    };

    if (uiFind) {
      const focused = calculateFocusedFindRowStates(uiFind, trace.spans);
      Object.assign(base, focused);
    }

    set(base as Partial<TraceTimelineLayoutStore>);
  },

  childrenToggle: (spanID: string) => {
    const childrenHiddenIDs = new Set(get().childrenHiddenIDs);
    if (childrenHiddenIDs.has(spanID)) {
      childrenHiddenIDs.delete(spanID);
    } else {
      childrenHiddenIDs.add(spanID);
    }
    set({ childrenHiddenIDs });
  },

  expandAll: () => {
    set({ childrenHiddenIDs: new Set<string>() });
  },

  expandOne: (spans: ReadonlyArray<IOtelSpan>) => {
    const current = get().childrenHiddenIDs;
    if (current.size === 0) return;
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
    }, new Set(current));
    set({ childrenHiddenIDs });
  },

  collapseAll: (spans: ReadonlyArray<IOtelSpan>) => {
    const { childrenHiddenIDs: current } = get();
    if (shouldDisableCollapse(spans, current)) return;
    const childrenHiddenIDs = spans.reduce((res, s) => {
      if (s.hasChildren) res.add(s.spanID);
      return res;
    }, new Set<string>());
    set({ childrenHiddenIDs });
  },

  collapseOne: (spans: ReadonlyArray<IOtelSpan>) => {
    const { childrenHiddenIDs: current } = get();
    if (shouldDisableCollapse(spans, current)) return;
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
    }, new Set(current));
    if (nearestCollapsedAncestor) {
      childrenHiddenIDs.add(nearestCollapsedAncestor.spanID);
    }
    set({ childrenHiddenIDs });
  },

  detailToggle: (spanID: string) => {
    const { detailPanelMode, detailStates: current } = get();
    if (detailPanelMode === 'sidepanel') {
      if (current.has(spanID)) {
        set({ detailStates: new Map() });
      } else {
        const detailStates = new Map<string, DetailState>();
        detailStates.set(spanID, DetailState.forDetailPanelMode('sidepanel'));
        set({ detailStates });
      }
      return;
    }
    const detailStates = new Map(current);
    if (detailStates.has(spanID)) {
      detailStates.delete(spanID);
    } else {
      detailStates.set(spanID, new DetailState());
    }
    set({ detailStates });
  },

  detailTagsToggle: (spanID: string) => {
    const { detailStates, detailPanelMode } = get();
    set({ detailStates: applyDetailSubsectionToggle(detailStates, detailPanelMode, spanID, 'tags') });
  },

  detailProcessToggle: (spanID: string) => {
    const { detailStates, detailPanelMode } = get();
    set({ detailStates: applyDetailSubsectionToggle(detailStates, detailPanelMode, spanID, 'process') });
  },

  detailLogsToggle: (spanID: string) => {
    const { detailStates, detailPanelMode } = get();
    set({ detailStates: applyDetailSubsectionToggle(detailStates, detailPanelMode, spanID, 'logs') });
  },

  detailWarningsToggle: (spanID: string) => {
    const { detailStates, detailPanelMode } = get();
    set({ detailStates: applyDetailSubsectionToggle(detailStates, detailPanelMode, spanID, 'warnings') });
  },

  detailReferencesToggle: (spanID: string) => {
    const { detailStates, detailPanelMode } = get();
    set({
      detailStates: applyDetailSubsectionToggle(detailStates, detailPanelMode, spanID, 'references'),
    });
  },

  detailLogItemToggle: (spanID: string, logItem: IEvent) => {
    const { detailStates, detailPanelMode } = get();
    const old = detailStates.get(spanID) ?? DetailState.forDetailPanelMode(detailPanelMode);
    const detailState = old.toggleLogItem(logItem);
    const next = new Map(detailStates);
    next.set(spanID, detailState);
    set({ detailStates: next });
  },

  clearShouldScrollToFirstUiFindMatch: () => {
    if (get().shouldScrollToFirstUiFindMatch) {
      set({ shouldScrollToFirstUiFindMatch: false });
    }
  },

  focusUiFindMatches: (trace: IOtelTrace, uiFind?: string | TNil, allowHide = true) => {
    if (!uiFind) return;
    const focused = calculateFocusedFindRowStates(uiFind, trace.spans, allowHide);
    set(focused);
  },
}));
