// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import type { SpanDetailPanelMode } from '../../../types/config';
import getConfig from '../../../utils/config/get-config';
import {
  MIN_TIMELINE_COLUMN_WIDTH,
  SIDE_PANEL_WIDTH_MAX,
  SIDE_PANEL_WIDTH_MIN,
  SPAN_NAME_COLUMN_WIDTH_MAX,
  SPAN_NAME_COLUMN_WIDTH_MIN,
} from './store.constants';

// The persisted slice of the store: the four user layout preferences (no actions).
type LayoutPrefs = {
  spanNameColumnWidth: number;
  sidePanelWidth: number;
  detailPanelMode: SpanDetailPanelMode;
  timelineBarsVisible: boolean;
};

type TraceTimelineLayoutPrefsStore = LayoutPrefs & {
  setSpanNameColumnWidth: (width: number) => void;
  setSidePanelWidth: (width: number) => void;
  // Updates layout fields only; use `setDetailPanelMode` from `./store` to also sync detail panel state.
  applyDetailPanelModeToLayout: (mode: SpanDetailPanelMode) => void;
  setTimelineBarsVisible: (visible: boolean) => void;
};

// Single namespaced localStorage key holding the JSON-serialized prefs (replaces the four raw keys).
const STORAGE_KEY = 'jaeger.layout';
const STORAGE_VERSION = 1;

// Legacy unprefixed keys written by the pre-Zustand-persist implementation (and still by duck.ts).
// localStorage key 'timelineVisible' is kept as-is for backward compatibility with stored preferences.
const LEGACY_SPAN_NAME_COLUMN_WIDTH = 'spanNameColumnWidth';
const LEGACY_SIDE_PANEL_WIDTH = 'sidePanelWidth';
const LEGACY_DETAIL_PANEL_MODE = 'detailPanelMode';
const LEGACY_TIMELINE_VISIBLE = 'timelineVisible';

// Reads the legacy unprefixed keys into a partial LayoutPrefs, or returns null when none are present.
// Used as a one-time fallback on first load before the namespaced key exists.
function readLegacyLayoutPrefs(): Partial<LayoutPrefs> | null {
  const rawSpanNameColumnWidth = localStorage.getItem(LEGACY_SPAN_NAME_COLUMN_WIDTH);
  const rawSidePanelWidth = localStorage.getItem(LEGACY_SIDE_PANEL_WIDTH);
  const rawDetailPanelMode = localStorage.getItem(LEGACY_DETAIL_PANEL_MODE);
  const rawTimelineVisible = localStorage.getItem(LEGACY_TIMELINE_VISIBLE);

  if (
    rawSpanNameColumnWidth === null &&
    rawSidePanelWidth === null &&
    rawDetailPanelMode === null &&
    rawTimelineVisible === null
  ) {
    return null;
  }

  const prefs: Partial<LayoutPrefs> = {};
  const parsedSpanNameColumnWidth = parseFloat(rawSpanNameColumnWidth ?? '');
  if (!Number.isNaN(parsedSpanNameColumnWidth)) {
    prefs.spanNameColumnWidth = parsedSpanNameColumnWidth;
  }
  const parsedSidePanelWidth = parseFloat(rawSidePanelWidth ?? '');
  if (!Number.isNaN(parsedSidePanelWidth)) {
    prefs.sidePanelWidth = parsedSidePanelWidth;
  }
  if (rawDetailPanelMode === 'sidepanel' || rawDetailPanelMode === 'inline') {
    prefs.detailPanelMode = rawDetailPanelMode;
  }
  if (rawTimelineVisible !== null) {
    prefs.timelineBarsVisible = rawTimelineVisible !== 'false';
  }
  return prefs;
}

// Applies config-driven defaults and clamps the stored prefs into a consistent layout.
// Mirrors the bootstrapping logic that previously lived in `getInitialLayoutState()`/duck `newInitialState()`,
// but operates on already-typed values instead of reading localStorage directly. Runs on every rehydrate
// (via persist `merge`) and for the initial state, so a stale/oversized stored width can never break layout.
function normalizeLayoutPrefs(stored: Partial<LayoutPrefs>): LayoutPrefs {
  const { traceTimeline } = getConfig();

  let detailPanelMode: SpanDetailPanelMode = 'inline';
  if (traceTimeline?.enableSidePanel) {
    if (stored.detailPanelMode === 'sidepanel') {
      detailPanelMode = 'sidepanel';
    } else if (traceTimeline.defaultDetailPanelMode === 'sidepanel' && stored.detailPanelMode === undefined) {
      detailPanelMode = 'sidepanel';
    }
  }

  const timelineBarsVisible = stored.timelineBarsVisible ?? true;

  let spanNameColumnWidth =
    stored.spanNameColumnWidth === undefined
      ? 0.25
      : Math.min(
          Math.max(stored.spanNameColumnWidth, SPAN_NAME_COLUMN_WIDTH_MIN),
          SPAN_NAME_COLUMN_WIDTH_MAX
        );

  const sidePanelWidthExplicit = stored.sidePanelWidth !== undefined;
  const rawSidePanelWidth = sidePanelWidthExplicit ? stored.sidePanelWidth! : (1 - spanNameColumnWidth) / 2;
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

// Storage adapter that reads/writes the namespaced JSON key and, on first load (before that key exists),
// transparently falls back to the legacy unprefixed keys. The legacy keys are intentionally left in place:
// the not-yet-removed Redux `duck.ts` still reads them in `newInitialState()`.
const layoutPrefsStorage: PersistStorage<LayoutPrefs> = {
  getItem: name => {
    const raw = localStorage.getItem(name);
    if (raw) {
      return JSON.parse(raw) as StorageValue<LayoutPrefs>;
    }
    const legacy = readLegacyLayoutPrefs();
    if (legacy) {
      return { state: legacy as LayoutPrefs, version: STORAGE_VERSION };
    }
    return null;
  },
  setItem: (name, value) => {
    localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: name => {
    localStorage.removeItem(name);
  },
};

export const useLayoutPrefsStore = create<TraceTimelineLayoutPrefsStore>()(
  persist(
    (set, get) => ({
      ...normalizeLayoutPrefs({}),

      setSpanNameColumnWidth: (width: number) => {
        const { detailPanelMode, sidePanelWidth } = get();
        const maxWidth =
          detailPanelMode === 'sidepanel'
            ? Math.min(SPAN_NAME_COLUMN_WIDTH_MAX, 1 - sidePanelWidth - MIN_TIMELINE_COLUMN_WIDTH)
            : SPAN_NAME_COLUMN_WIDTH_MAX;
        const spanNameColumnWidth = Math.min(Math.max(width, SPAN_NAME_COLUMN_WIDTH_MIN), maxWidth);
        set({ spanNameColumnWidth });
      },

      setSidePanelWidth: (width: number) => {
        const { timelineBarsVisible, spanNameColumnWidth } = get();
        const availableWidth = timelineBarsVisible
          ? 1 - spanNameColumnWidth - MIN_TIMELINE_COLUMN_WIDTH
          : 1 - spanNameColumnWidth;
        const maxWidth = Math.max(SIDE_PANEL_WIDTH_MIN, Math.min(SIDE_PANEL_WIDTH_MAX, availableWidth));
        const sidePanelWidth = Math.min(Math.max(width, SIDE_PANEL_WIDTH_MIN), maxWidth);
        set({ sidePanelWidth });
      },

      applyDetailPanelModeToLayout: (mode: SpanDetailPanelMode) => {
        let { spanNameColumnWidth, sidePanelWidth } = get();
        if (mode === 'sidepanel') {
          const maxWidth = Math.min(
            SPAN_NAME_COLUMN_WIDTH_MAX,
            1 - sidePanelWidth - MIN_TIMELINE_COLUMN_WIDTH
          );
          spanNameColumnWidth = Math.min(spanNameColumnWidth, maxWidth);
        }
        set({ detailPanelMode: mode, spanNameColumnWidth });
      },

      setTimelineBarsVisible: (visible: boolean) => {
        set({ timelineBarsVisible: visible });
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: layoutPrefsStorage,
      // Persist only the data fields, never the action functions.
      partialize: state => ({
        spanNameColumnWidth: state.spanNameColumnWidth,
        sidePanelWidth: state.sidePanelWidth,
        detailPanelMode: state.detailPanelMode,
        timelineBarsVisible: state.timelineBarsVisible,
      }),
      // Re-apply config defaults + clamping over whatever was rehydrated (or migrated from legacy keys).
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...normalizeLayoutPrefs((persistedState ?? {}) as Partial<LayoutPrefs>),
      }),
    }
  )
);

export { normalizeLayoutPrefs };
