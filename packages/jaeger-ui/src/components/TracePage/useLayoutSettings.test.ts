// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { renderHook, act } from '@testing-library/react';
import { useLayoutSettings } from './useLayoutSettings';
import { useLayoutPrefsStore } from './TraceTimelineViewer/store.layout';

function resetStore(overrides: Partial<{ timelineBarsVisible: boolean; detailPanelMode: string }> = {}) {
  useLayoutPrefsStore.setState({
    timelineBarsVisible: overrides.timelineBarsVisible ?? true,
    detailPanelMode: (overrides.detailPanelMode as 'inline' | 'sidepanel') ?? 'inline',
  });
}

beforeEach(() => {
  localStorage.clear();
  resetStore();
});

describe('URL parameter overrides', () => {
  it('resolves timelineBarsVisible=false from ?timeline=off', () => {
    resetStore({ timelineBarsVisible: true });
    const { result } = renderHook(() => useLayoutSettings('?timeline=off'));
    expect(result.current.timelineBarsVisible.value).toBe(false);
    expect(result.current.timelineBarsVisible.source).toBe('url');
    expect(result.current.timelineBarsVisible.isOverridden).toBe(true);
  });

  it('resolves timelineBarsVisible=true from ?timeline=on even if localStorage says false', () => {
    resetStore({ timelineBarsVisible: false });
    const { result } = renderHook(() => useLayoutSettings('?timeline=on'));
    expect(result.current.timelineBarsVisible.value).toBe(true);
    expect(result.current.timelineBarsVisible.source).toBe('url');
  });

  it('resolves detailPanelMode=sidepanel from ?sidebar=sidepanel', () => {
    resetStore({ detailPanelMode: 'inline' });
    const { result } = renderHook(() => useLayoutSettings('?sidebar=sidepanel'));
    expect(result.current.detailPanelMode.value).toBe('sidepanel');
    expect(result.current.detailPanelMode.source).toBe('url');
    expect(result.current.detailPanelMode.isOverridden).toBe(true);
  });

  it('resolves detailPanelMode=inline from ?sidebar=inline', () => {
    resetStore({ detailPanelMode: 'sidepanel' });
    const { result } = renderHook(() => useLayoutSettings('?sidebar=inline'));
    expect(result.current.detailPanelMode.value).toBe('inline');
    expect(result.current.detailPanelMode.source).toBe('url');
  });

  it('sets isOverridden=false when URL value matches localStorage value', () => {
    // Set BOTH localStorage and store state so getInitialLayoutState() reads false
    localStorage.setItem('timelineVisible', 'false');
    resetStore({ timelineBarsVisible: false });
    // URL also says off — value matches localStorage, so no real override from user's POV
    const { result } = renderHook(() => useLayoutSettings('?timeline=off'));
    expect(result.current.timelineBarsVisible.source).toBe('url');
    expect(result.current.timelineBarsVisible.isOverridden).toBe(false);
  });
});

describe('localStorage fallback', () => {
  it('falls back to localStorage when no URL params present', () => {
    localStorage.setItem('timelineVisible', 'false');
    localStorage.setItem('detailPanelMode', 'sidepanel');
    resetStore({ timelineBarsVisible: false, detailPanelMode: 'sidepanel' });
    const { result } = renderHook(() => useLayoutSettings(''));
    expect(result.current.timelineBarsVisible.value).toBe(false);
    expect(result.current.timelineBarsVisible.source).toBe('localstorage');
    expect(result.current.timelineBarsVisible.isOverridden).toBe(false);
    expect(result.current.detailPanelMode.value).toBe('sidepanel');
    expect(result.current.detailPanelMode.source).toBe('localstorage');
  });

  it('returns isOverridden=false for localstorage source when it matches localStorage', () => {
    localStorage.setItem('timelineVisible', 'true');
    resetStore({ timelineBarsVisible: true });
    const { result } = renderHook(() => useLayoutSettings(''));
    expect(result.current.timelineBarsVisible.isOverridden).toBe(false);
  });

  it('detects manual session overrides (isOverridden=true) when store diverges from localStorage', () => {
    localStorage.setItem('timelineVisible', 'true');
    resetStore({ timelineBarsVisible: false });
    const { result } = renderHook(() => useLayoutSettings(''));
    expect(result.current.timelineBarsVisible.value).toBe(false);
    expect(result.current.timelineBarsVisible.source).toBe('localstorage');
    expect(result.current.timelineBarsVisible.isOverridden).toBe(true);
  });
});

describe('saveAsDefault', () => {
  it('writes timelineBarsVisible to localStorage when called', () => {
    resetStore({ timelineBarsVisible: true });
    const { result } = renderHook(() => useLayoutSettings('?timeline=off'));
    // Effective value is false (from URL)
    expect(result.current.timelineBarsVisible.value).toBe(false);

    act(() => {
      result.current.saveAsDefault('timelineBarsVisible');
    });

    expect(localStorage.getItem('timelineVisible')).toBe('false');
  });

  it('writes detailPanelMode to localStorage when called', () => {
    resetStore({ detailPanelMode: 'inline' });
    const { result } = renderHook(() => useLayoutSettings('?sidebar=sidepanel'));
    expect(result.current.detailPanelMode.value).toBe('sidepanel');

    act(() => {
      result.current.saveAsDefault('detailPanelMode');
    });

    expect(localStorage.getItem('detailPanelMode')).toBe('sidepanel');
  });

  it('does NOT write to localStorage for URL-driven values unless saveAsDefault is called', () => {
    resetStore({ timelineBarsVisible: true });
    renderHook(() => useLayoutSettings('?timeline=off'));
    // Before calling saveAsDefault, localStorage should not be changed
    expect(localStorage.getItem('timelineVisible')).toBeNull();
  });
});

describe('URL param edge cases', () => {
  it('ignores unknown timeline param values', () => {
    resetStore({ timelineBarsVisible: true });
    const { result } = renderHook(() => useLayoutSettings('?timeline=maybe'));
    expect(result.current.timelineBarsVisible.source).toBe('localstorage');
    expect(result.current.timelineBarsVisible.value).toBe(true);
  });

  it('ignores unknown sidebar param values', () => {
    resetStore({ detailPanelMode: 'inline' });
    const { result } = renderHook(() => useLayoutSettings('?sidebar=floating'));
    expect(result.current.detailPanelMode.source).toBe('localstorage');
    expect(result.current.detailPanelMode.value).toBe('inline');
  });

  it('handles combined timeline and sidebar params', () => {
    resetStore({ timelineBarsVisible: true, detailPanelMode: 'inline' });
    const { result } = renderHook(() => useLayoutSettings('?timeline=off&sidebar=sidepanel'));
    expect(result.current.timelineBarsVisible.value).toBe(false);
    expect(result.current.timelineBarsVisible.source).toBe('url');
    expect(result.current.detailPanelMode.value).toBe('sidepanel');
    expect(result.current.detailPanelMode.source).toBe('url');
  });
});

describe('URL parameter removal and store synchronization', () => {
  it('synchronizes the Zustand store when URL parameters are present', () => {
    resetStore({ timelineBarsVisible: true });
    renderHook(() => useLayoutSettings('?timeline=off'));
    expect(useLayoutPrefsStore.getState().timelineBarsVisible).toBe(false);
  });

  it('reverts the Zustand store to localStorage defaults when URL parameters are removed', () => {
    localStorage.setItem('timelineVisible', 'true');
    resetStore({ timelineBarsVisible: true });

    const { rerender } = renderHook(({ search }) => useLayoutSettings(search), {
      initialProps: { search: '?timeline=off' },
    });

    // Verify it synced to URL initially
    expect(useLayoutPrefsStore.getState().timelineBarsVisible).toBe(false);

    // Change search to empty (removal)
    rerender({ search: '' });

    // Verify it reverted to localStorage default (true)
    expect(useLayoutPrefsStore.getState().timelineBarsVisible).toBe(true);
  });

  it('reverts detailPanelMode to localStorage defaults when URL parameters are removed', () => {
    localStorage.setItem('detailPanelMode', 'inline');
    resetStore({ detailPanelMode: 'inline' });

    const { rerender } = renderHook(({ search }) => useLayoutSettings(search), {
      initialProps: { search: '?sidebar=sidepanel' },
    });

    // Verify it synced to URL initially
    expect(useLayoutPrefsStore.getState().detailPanelMode).toBe('sidepanel');

    // Change search to empty (removal)
    rerender({ search: '' });

    // Verify it reverted to localStorage default (inline)
    expect(useLayoutPrefsStore.getState().detailPanelMode).toBe('inline');
  });

  it('does NOT revert to defaults when URL param is removed if user has already changed the value', () => {
    // lsDefault is 'sidepanel', URL overrides to 'inline'
    localStorage.setItem('detailPanelMode', 'sidepanel');
    resetStore({ detailPanelMode: 'sidepanel' });

    const { rerender } = renderHook(({ search }) => useLayoutSettings(search), {
      initialProps: { search: '?sidebar=inline' },
    });

    // URL forced store to 'inline'
    expect(useLayoutPrefsStore.getState().detailPanelMode).toBe('inline');

    // User manually changes it back to 'sidepanel' (different from what URL set)
    act(() => {
      useLayoutPrefsStore.setState({ detailPanelMode: 'sidepanel' });
    });

    // Remove URL param — because store ('sidepanel') !== prevUrlValue ('inline'),
    // the revert guard should NOT fire, preserving the user's choice.
    rerender({ search: '' });

    expect(useLayoutPrefsStore.getState().detailPanelMode).toBe('sidepanel');
  });
});
