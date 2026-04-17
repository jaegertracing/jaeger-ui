// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import type { SpanDetailPanelMode } from '../../../types/config';
import getConfig from '../../../utils/config/get-config';
import {
  MIN_TIMELINE_COLUMN_WIDTH,
  SIDE_PANEL_WIDTH_MAX,
  SIDE_PANEL_WIDTH_MIN,
  SPAN_NAME_COLUMN_WIDTH_MAX,
  SPAN_NAME_COLUMN_WIDTH_MIN,
} from './store.constants';

type TraceTimelineLayoutPrefsStore = {
  spanNameColumnWidth: number;
  sidePanelWidth: number;
  detailPanelMode: SpanDetailPanelMode;
  timelineBarsVisible: boolean;
  setSpanNameColumnWidth: (width: number) => void;
  setSidePanelWidth: (width: number) => void;
  // Updates layout fields only; use `setDetailPanelMode` from `./store` to also sync detail panel state.
  applyDetailPanelModeToLayout: (mode: SpanDetailPanelMode) => void;
  setTimelineBarsVisible: (visible: boolean) => void;
};

// Reads user layout preferences from localStorage and merges them with config-driven defaults.
// Mirrors the logic that was previously in TraceTimelineViewer/duck.ts `newInitialState()`.
export function getInitialLayoutState(): Pick<
  TraceTimelineLayoutPrefsStore,
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

export const useLayoutPrefsStore = create<TraceTimelineLayoutPrefsStore>()((set, get) => ({
  ...getInitialLayoutState(),

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

  applyDetailPanelModeToLayout: (mode: SpanDetailPanelMode) => {
    localStorage.setItem('detailPanelMode', mode);
    let { spanNameColumnWidth, sidePanelWidth } = get();
    if (mode === 'sidepanel') {
      const maxWidth = Math.min(SPAN_NAME_COLUMN_WIDTH_MAX, 1 - sidePanelWidth - MIN_TIMELINE_COLUMN_WIDTH);
      spanNameColumnWidth = Math.min(spanNameColumnWidth, maxWidth);
    }
    set({ detailPanelMode: mode, spanNameColumnWidth });
  },

  setTimelineBarsVisible: (visible: boolean) => {
    localStorage.setItem('timelineVisible', String(visible));
    set({ timelineBarsVisible: visible });
  },
}));
