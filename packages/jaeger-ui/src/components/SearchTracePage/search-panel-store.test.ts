// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  useSearchPanelStore,
  getInitialState,
  PANEL_WIDTH_MIN,
  PANEL_WIDTH_MAX,
  PANEL_WIDTH_DEFAULT,
  LS_WIDTH_KEY,
  LS_COLLAPSED_KEY,
} from './search-panel-store';

describe('useSearchPanelStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSearchPanelStore.setState({ panelWidth: PANEL_WIDTH_DEFAULT, collapsed: false });
  });

  it('has default panelWidth', () => {
    expect(useSearchPanelStore.getState().panelWidth).toBe(PANEL_WIDTH_DEFAULT);
  });

  it('has default collapsed of false', () => {
    expect(useSearchPanelStore.getState().collapsed).toBe(false);
  });

  it('setPanelWidth updates panelWidth', () => {
    useSearchPanelStore.getState().setPanelWidth(0.35);
    expect(useSearchPanelStore.getState().panelWidth).toBe(0.35);
  });

  it('setPanelWidth clamps to min', () => {
    useSearchPanelStore.getState().setPanelWidth(0.05);
    expect(useSearchPanelStore.getState().panelWidth).toBe(PANEL_WIDTH_MIN);
  });

  it('setPanelWidth clamps to max', () => {
    useSearchPanelStore.getState().setPanelWidth(0.9);
    expect(useSearchPanelStore.getState().panelWidth).toBe(PANEL_WIDTH_MAX);
  });

  it('setPanelWidth ignores NaN and leaves panelWidth unchanged', () => {
    useSearchPanelStore.setState({ panelWidth: 0.3 });
    useSearchPanelStore.getState().setPanelWidth(NaN);
    expect(useSearchPanelStore.getState().panelWidth).toBe(0.3);
  });

  it('setPanelWidth persists to localStorage', () => {
    useSearchPanelStore.getState().setPanelWidth(0.3);
    expect(localStorage.getItem(LS_WIDTH_KEY)).toBe('0.3');
  });

  it('setCollapsed sets collapsed to true and persists', () => {
    useSearchPanelStore.getState().setCollapsed(true);
    expect(useSearchPanelStore.getState().collapsed).toBe(true);
    expect(localStorage.getItem(LS_COLLAPSED_KEY)).toBe('true');
  });

  it('setCollapsed sets collapsed to false and persists', () => {
    useSearchPanelStore.setState({ collapsed: true });
    useSearchPanelStore.getState().setCollapsed(false);
    expect(useSearchPanelStore.getState().collapsed).toBe(false);
    expect(localStorage.getItem(LS_COLLAPSED_KEY)).toBe('false');
  });
});

// These tests call getInitialState() directly after seeding localStorage so they
// actually exercise the initialization path, not just the in-memory store state.
describe('getInitialState — localStorage-driven initialization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns PANEL_WIDTH_DEFAULT when no value is stored', () => {
    const { panelWidth } = getInitialState();
    expect(panelWidth).toBe(PANEL_WIDTH_DEFAULT);
  });

  it('reads a valid stored panelWidth', () => {
    localStorage.setItem(LS_WIDTH_KEY, '0.4');
    expect(getInitialState().panelWidth).toBe(0.4);
  });

  it('clamps stored panelWidth below min to PANEL_WIDTH_MIN', () => {
    localStorage.setItem(LS_WIDTH_KEY, '0.01');
    expect(getInitialState().panelWidth).toBe(PANEL_WIDTH_MIN);
  });

  it('clamps stored panelWidth above max to PANEL_WIDTH_MAX', () => {
    localStorage.setItem(LS_WIDTH_KEY, '0.99');
    expect(getInitialState().panelWidth).toBe(PANEL_WIDTH_MAX);
  });

  it('falls back to PANEL_WIDTH_DEFAULT when stored value is not a finite number', () => {
    localStorage.setItem(LS_WIDTH_KEY, 'not-a-number');
    expect(getInitialState().panelWidth).toBe(PANEL_WIDTH_DEFAULT);
  });

  it('reads collapsed=true from localStorage', () => {
    localStorage.setItem(LS_COLLAPSED_KEY, 'true');
    expect(getInitialState().collapsed).toBe(true);
  });

  it('defaults collapsed to false when key is absent', () => {
    expect(getInitialState().collapsed).toBe(false);
  });
});

describe('useSearchPanelStore — blocked localStorage (SecurityError)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useSearchPanelStore.setState({ panelWidth: PANEL_WIDTH_DEFAULT, collapsed: false });
  });

  it('setPanelWidth keeps in-memory state when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });
    useSearchPanelStore.getState().setPanelWidth(0.4);
    // State is updated in memory even though persistence failed
    expect(useSearchPanelStore.getState().panelWidth).toBe(0.4);
  });

  it('setCollapsed keeps in-memory state when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });
    useSearchPanelStore.getState().setCollapsed(true);
    expect(useSearchPanelStore.getState().collapsed).toBe(true);
  });

  it('getInitialState returns defaults when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });
    const state = getInitialState();
    expect(state.panelWidth).toBe(PANEL_WIDTH_DEFAULT);
    expect(state.collapsed).toBe(false);
  });
});
