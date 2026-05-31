// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';

export const PANEL_WIDTH_MIN = 0.15;
export const PANEL_WIDTH_MAX = 0.55;
export const PANEL_WIDTH_DEFAULT = 0.25;

export const LS_WIDTH_KEY = 'jaeger.search.panelWidth';
export const LS_COLLAPSED_KEY = 'jaeger.search.panelCollapsed';

type SearchPanelStore = {
  panelWidth: number;
  collapsed: boolean;
  setPanelWidth: (width: number) => void;
  setCollapsed: (collapsed: boolean) => void;
};

function readLocalStorage(key: string): string | null {
  /* c8 ignore next */
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string): void {
  /* c8 ignore next */
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore SecurityError or QuotaExceededError
  }
}

export function getInitialState(): Pick<SearchPanelStore, 'panelWidth' | 'collapsed'> {
  const parsedWidth = parseFloat(readLocalStorage(LS_WIDTH_KEY) ?? '');
  const panelWidth = Number.isFinite(parsedWidth)
    ? Math.min(Math.max(parsedWidth, PANEL_WIDTH_MIN), PANEL_WIDTH_MAX)
    : PANEL_WIDTH_DEFAULT;
  const collapsed = readLocalStorage(LS_COLLAPSED_KEY) === 'true';
  return { panelWidth, collapsed };
}

export const useSearchPanelStore = create<SearchPanelStore>()(set => ({
  ...getInitialState(),
  // VerticalResizer calls onChange only on drag-end (not during drag-move), so
  // localStorage is written at most once per drag gesture — no throttling needed.
  setPanelWidth: (width: number) => {
    if (!Number.isFinite(width)) return;
    const panelWidth = Math.min(Math.max(width, PANEL_WIDTH_MIN), PANEL_WIDTH_MAX);
    writeLocalStorage(LS_WIDTH_KEY, panelWidth.toString());
    set({ panelWidth });
  },
  setCollapsed: (collapsed: boolean) => {
    writeLocalStorage(LS_COLLAPSED_KEY, String(collapsed));
    set({ collapsed });
  },
}));
