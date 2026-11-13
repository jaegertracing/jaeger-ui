// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import type { SpanDetailPanelMode } from '../../../types/config';
import getConfig from '../../../utils/config/get-config';
import storage from '../../../utils/storage';
import {
  MIN_TIMELINE_COLUMN_WIDTH,
  SIDE_PANEL_WIDTH_MAX,
  SIDE_PANEL_WIDTH_MIN,
  SPAN_NAME_COLUMN_WIDTH_MAX,
  SPAN_NAME_COLUMN_WIDTH_MIN,
} from './store.constants';

function getMaxNameColumnWidth(opts: {
  detailPanelMode: string;
  timelineBarsVisible: boolean;
  sidePanelWidth: number;
}): number {
  if (opts.detailPanelMode !== 'sidepanel') {
    return SPAN_NAME_COLUMN_WIDTH_MAX;
  }
  const availableWidth = opts.timelineBarsVisible
    ? 1 - opts.sidePanelWidth - MIN_TIMELINE_COLUMN_WIDTH
    : 1 - SIDE_PANEL_WIDTH_MIN;
  return Math.min(SPAN_NAME_COLUMN_WIDTH_MAX, availableWidth);
}

// The persisted slice of the store: the user layout preferences (no actions).
type LayoutPrefs = {
  spanNameColumnWidth: number;
  sidePanelWidth: number;
  detailPanelMode: SpanDetailPanelMode;
  timelineBarsVisible: boolean;
  heatmapEnabled: boolean;
};

type TraceTimelineLayoutPrefsStore = LayoutPrefs & {
  // Only choices made by the user are saved; derived defaults stay in memory.
  explicitPrefs: Partial<LayoutPrefs>;
  setSpanNameColumnWidth: (width: number) => void;
  setSidePanelWidth: (width: number) => void;
  // Updates layout fields only; use `setDetailPanelMode` from `./store` to also sync detail panel state.
  applyDetailPanelModeToLayout: (mode: SpanDetailPanelMode) => void;
  setTimelineBarsVisible: (visible: boolean) => void;
  toggleHeatmap: () => void;
};

// Single namespaced localStorage key holding the JSON-serialized prefs (replaces the four raw keys).
const STORAGE_KEY = 'jaeger.layout';
const STORAGE_VERSION = 1;

// Reads the legacy unprefixed keys into a partial LayoutPrefs, or returns null when none are present.
// Used as a one-time fallback on first load before the namespaced key exists.
function readLegacyLayoutPrefs(): Partial<LayoutPrefs> | null {
  const rawSpanNameColumnWidth = storage.getItem('spanNameColumnWidth');
  const rawSidePanelWidth = storage.getItem('sidePanelWidth');
  const rawDetailPanelMode = storage.getItem('detailPanelMode');
  const rawTimelineVisible = storage.getItem('timelineVisible');

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

// Resolves saved choices against configuration defaults and the available column widths.
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
  const rawSidePanelWidth = stored.sidePanelWidth ?? (1 - spanNameColumnWidth) / 2;
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

  const heatmapEnabled = stored.heatmapEnabled ?? false;

  return { spanNameColumnWidth, sidePanelWidth, detailPanelMode, timelineBarsVisible, heatmapEnabled };
}

// Storage is untrusted input. Copy only valid preference values, never actions or other store fields.
function readLayoutPrefs(value: unknown): Partial<LayoutPrefs> {
  if (!value || typeof value !== 'object') return {};
  const stored = value as Partial<LayoutPrefs>;
  const prefs: Partial<LayoutPrefs> = {};
  if (typeof stored.spanNameColumnWidth === 'number' && Number.isFinite(stored.spanNameColumnWidth)) {
    prefs.spanNameColumnWidth = stored.spanNameColumnWidth;
  }
  if (typeof stored.sidePanelWidth === 'number' && Number.isFinite(stored.sidePanelWidth)) {
    prefs.sidePanelWidth = stored.sidePanelWidth;
  }
  if (stored.detailPanelMode === 'inline' || stored.detailPanelMode === 'sidepanel') {
    prefs.detailPanelMode = stored.detailPanelMode;
  }
  if (typeof stored.timelineBarsVisible === 'boolean') {
    prefs.timelineBarsVisible = stored.timelineBarsVisible;
  }
  if (typeof stored.heatmapEnabled === 'boolean') {
    prefs.heatmapEnabled = stored.heatmapEnabled;
  }
  return prefs;
}

// Keep the stored version intact so persist can run migrations before resolving the layout.
// This store migrates from the old keys when `jaeger.layout` is missing or invalid, so they stay
// in localStorage.
const layoutPrefsStorage: PersistStorage<Partial<LayoutPrefs>> = {
  getItem: name => {
    const raw = storage.getItem(name);
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw) as StorageValue<Partial<LayoutPrefs>>;
        if (parsed && parsed.state && typeof parsed.state === 'object' && !Array.isArray(parsed.state)) {
          return parsed;
        }
      } catch {
        // Invalid JSON: try the old keys instead.
      }
      storage.removeItem(name);
    }
    const legacy = readLegacyLayoutPrefs();
    return legacy ? { state: legacy, version: 0 } : null;
  },
  setItem: (name, value) => storage.setItem(name, JSON.stringify(value)),
  removeItem: name => storage.removeItem(name),
};

export const useLayoutPrefsStore = create<TraceTimelineLayoutPrefsStore>()(
  persist(
    (set, get) => ({
      ...normalizeLayoutPrefs({}),
      explicitPrefs: {},

      setSpanNameColumnWidth: (width: number) => {
        const { detailPanelMode, sidePanelWidth, timelineBarsVisible } = get();
        const maxWidth = getMaxNameColumnWidth({ detailPanelMode, sidePanelWidth, timelineBarsVisible });
        const spanNameColumnWidth = Math.min(Math.max(width, SPAN_NAME_COLUMN_WIDTH_MIN), maxWidth);
        set(state => ({
          spanNameColumnWidth,
          explicitPrefs: { ...state.explicitPrefs, spanNameColumnWidth },
        }));
      },

      setSidePanelWidth: (width: number) => {
        const { timelineBarsVisible, spanNameColumnWidth } = get();
        const availableWidth = timelineBarsVisible
          ? 1 - spanNameColumnWidth - MIN_TIMELINE_COLUMN_WIDTH
          : 1 - spanNameColumnWidth;
        const maxWidth = Math.max(SIDE_PANEL_WIDTH_MIN, Math.min(SIDE_PANEL_WIDTH_MAX, availableWidth));
        const sidePanelWidth = Math.min(Math.max(width, SIDE_PANEL_WIDTH_MIN), maxWidth);
        set(state => ({
          sidePanelWidth,
          explicitPrefs: { ...state.explicitPrefs, sidePanelWidth },
        }));
      },

      applyDetailPanelModeToLayout: (mode: SpanDetailPanelMode) => {
        let { spanNameColumnWidth, sidePanelWidth, timelineBarsVisible } = get();
        if (mode === 'sidepanel') {
          const maxWidth = getMaxNameColumnWidth({
            detailPanelMode: mode,
            sidePanelWidth,
            timelineBarsVisible,
          });
          spanNameColumnWidth = Math.min(spanNameColumnWidth, maxWidth);
        }
        set(state => ({
          detailPanelMode: mode,
          spanNameColumnWidth,
          explicitPrefs: { ...state.explicitPrefs, detailPanelMode: mode },
        }));
      },

      setTimelineBarsVisible: (visible: boolean) => {
        set(state => ({
          timelineBarsVisible: visible,
          explicitPrefs: { ...state.explicitPrefs, timelineBarsVisible: visible },
        }));
      },

      toggleHeatmap: () => {
        set(state => {
          const heatmapEnabled = !state.heatmapEnabled;
          return { heatmapEnabled, explicitPrefs: { ...state.explicitPrefs, heatmapEnabled } };
        });
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: layoutPrefsStorage,
      // Version 0 is the same four preferences read from the old, separate keys.
      migrate: persisted => readLayoutPrefs(persisted),
      partialize: state => state.explicitPrefs,
      merge: (persisted, current) => {
        const explicitPrefs = readLayoutPrefs(persisted ?? current.explicitPrefs);
        // Normalize the partial choices once. Saving the resolved defaults would turn
        // untouched fields into explicit preferences and change the next load's layout.
        return { ...current, ...normalizeLayoutPrefs(explicitPrefs), explicitPrefs };
      },
    }
  )
);

export { normalizeLayoutPrefs };
