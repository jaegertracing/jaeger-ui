// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { type ComponentProps, type PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import getConfig from '../../utils/config/get-config';
import {
  setDetailPanelMode,
  useDisplayedLayoutStore,
  useSavedLayoutPrefsStore,
  useTraceTimelineStore,
} from './TraceTimelineViewer/store';
import DetailState from './TraceTimelineViewer/SpanDetail/DetailState';
import { useLayoutSettings } from './useLayoutSettings';
import type { UrlLayoutSettings } from './url';

vi.mock('../../utils/config/get-config', () => ({
  default: vi.fn(() => ({ traceTimeline: { enableSidePanel: true } })),
}));

interface IHookProps {
  enableSidePanel: boolean;
  heuristics: Partial<UrlLayoutSettings>;
}

function renderLayout(
  initialEntries: ComponentProps<typeof MemoryRouter>['initialEntries'] = ['/trace/one'],
  props: IHookProps = { enableSidePanel: true, heuristics: {} }
) {
  return renderHook(
    (options: IHookProps) => {
      const location = useLocation();
      const navigate = useNavigate();
      const settings = useLayoutSettings(location, options.enableSidePanel, options.heuristics);
      return { settings, location, navigate };
    },
    {
      initialProps: props,
      wrapper: ({ children }: PropsWithChildren) => (
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      ),
    }
  );
}

describe('useLayoutSettings', () => {
  beforeEach(() => {
    vi.mocked(getConfig).mockReturnValue({ traceTimeline: { enableSidePanel: true } } as ReturnType<
      typeof getConfig
    >);
    useDisplayedLayoutStore.setState(useDisplayedLayoutStore.getInitialState(), true);
    useSavedLayoutPrefsStore.setState({}, true);
    useTraceTimelineStore.setState(useTraceTimelineStore.getInitialState(), true);
    localStorage.clear();
  });

  afterEach(() => vi.restoreAllMocks());

  it('applies URL overrides to the view and detail states without writing saved preferences', () => {
    useDisplayedLayoutStore.getState().setTimelineBarsVisible(true);
    useDisplayedLayoutStore.getState().applyDetailPanelModeToLayout('inline');
    useTraceTimelineStore.setState({
      detailStates: new Map([
        ['first', new DetailState()],
        ['second', new DetailState()],
      ]),
    });
    const saved = localStorage.getItem('jaeger.layout');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    const { result } = renderLayout(['/trace/one?timeline=off&sidebar=sidepanel']);

    expect(result.current.settings.timelineBarsVisible).toEqual({
      value: false,
      source: 'url',
      isOverridden: true,
    });
    expect(result.current.settings.detailPanelMode).toEqual({
      value: 'sidepanel',
      source: 'url',
      isOverridden: true,
    });
    expect(useDisplayedLayoutStore.getState()).toMatchObject({
      timelineBarsVisible: false,
      detailPanelMode: 'sidepanel',
    });
    expect([...useTraceTimelineStore.getState().detailStates.keys()]).toEqual(['first']);
    expect(localStorage.getItem('jaeger.layout')).toBe(saved);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('uses saved preferences when the URL and heuristics supply no value', () => {
    useDisplayedLayoutStore.getState().setTimelineBarsVisible(false);
    useDisplayedLayoutStore.getState().applyDetailPanelModeToLayout('sidepanel');

    const { result } = renderLayout();

    expect(result.current.settings.timelineBarsVisible).toEqual({
      value: false,
      source: 'localstorage',
      isOverridden: false,
    });
    expect(result.current.settings.detailPanelMode).toEqual({
      value: 'sidepanel',
      source: 'localstorage',
      isOverridden: false,
    });
  });

  it('uses configured defaults when no preference has been saved', () => {
    vi.mocked(getConfig).mockReturnValue({
      traceTimeline: { enableSidePanel: true, defaultDetailPanelMode: 'sidepanel' },
    } as ReturnType<typeof getConfig>);

    const { result } = renderLayout();

    expect(result.current.settings.detailPanelMode.value).toBe('sidepanel');
    expect(result.current.settings.timelineBarsVisible.value).toBe(true);
    expect(localStorage.getItem('jaeger.layout')).toBeNull();
  });

  it('resolves URL values before heuristics and heuristics before saved preferences', () => {
    const { result, rerender } = renderLayout(['/trace/one?timeline=on&sidebar=inline'], {
      enableSidePanel: true,
      heuristics: { timelineBarsVisible: false, detailPanelMode: 'sidepanel' },
    });

    expect(result.current.settings.timelineBarsVisible).toEqual({
      value: true,
      source: 'url',
      isOverridden: false,
    });
    expect(result.current.settings.detailPanelMode.source).toBe('url');

    act(() => result.current.navigate('/trace/one?timeline=invalid&sidebar=invalid'));
    expect(result.current.settings.timelineBarsVisible).toEqual({
      value: false,
      source: 'heuristic',
      isOverridden: true,
    });
    expect(result.current.settings.detailPanelMode.value).toBe('sidepanel');
    expect(result.current.settings.detailPanelMode.source).toBe('heuristic');

    rerender({ enableSidePanel: true, heuristics: {} });
    expect(result.current.settings.timelineBarsVisible.source).toBe('localstorage');
    expect(result.current.settings.timelineBarsVisible.value).toBe(true);
    expect(result.current.settings.detailPanelMode.value).toBe('inline');
  });

  it('resolves each setting independently', () => {
    const { result } = renderLayout(['/trace/one?timeline=off'], {
      enableSidePanel: true,
      heuristics: { timelineBarsVisible: true, detailPanelMode: 'sidepanel' },
    });

    expect(result.current.settings.timelineBarsVisible.source).toBe('url');
    expect(result.current.settings.timelineBarsVisible.value).toBe(false);
    expect(result.current.settings.detailPanelMode.source).toBe('heuristic');
    expect(result.current.settings.detailPanelMode.value).toBe('sidepanel');
  });

  it('ignores URL and heuristic requests for a disabled side panel', () => {
    vi.mocked(getConfig).mockReturnValue({ traceTimeline: { enableSidePanel: false } } as ReturnType<
      typeof getConfig
    >);
    const { result } = renderLayout(['/trace/one?sidebar=sidepanel'], {
      enableSidePanel: false,
      heuristics: { detailPanelMode: 'sidepanel' },
    });

    expect(result.current.settings.detailPanelMode).toEqual({
      value: 'inline',
      source: 'localstorage',
      isOverridden: false,
    });
    expect(useDisplayedLayoutStore.getState().detailPanelMode).toBe('inline');
    expect(localStorage.getItem('jaeger.layout')).toBeNull();
  });

  it('does not carry a previous trace layout into a newly mounted trace', () => {
    useDisplayedLayoutStore.getState().setTimelineBarsVisible(false, { persist: false });
    setDetailPanelMode('sidepanel', { persist: false });
    const saved = localStorage.getItem('jaeger.layout');
    const { result } = renderLayout();

    expect(result.current.settings.timelineBarsVisible.value).toBe(true);
    expect(result.current.settings.detailPanelMode.value).toBe('inline');
    expect(useDisplayedLayoutStore.getState()).toMatchObject({
      timelineBarsVisible: true,
      detailPanelMode: 'inline',
    });
    expect(localStorage.getItem('jaeger.layout')).toBe(saved);
  });

  it('restores the saved baseline when navigating to another trace without layout parameters', () => {
    const { result } = renderLayout(['/trace/one?timeline=off&sidebar=sidepanel']);

    act(() => result.current.navigate('/trace/two?uiFind=error'));

    expect(result.current.settings.timelineBarsVisible.value).toBe(true);
    expect(result.current.settings.detailPanelMode.value).toBe('inline');
    expect(useDisplayedLayoutStore.getState()).toMatchObject({
      timelineBarsVisible: true,
      detailPanelMode: 'inline',
    });
  });

  it('re-resolves layout during back and forward navigation', () => {
    const { result } = renderLayout(['/trace/one?timeline=off']);
    act(() => result.current.navigate('/trace/two?sidebar=sidepanel'));
    act(() => result.current.navigate(-1));
    expect(result.current.settings.timelineBarsVisible.value).toBe(false);
    expect(result.current.settings.detailPanelMode.value).toBe('inline');

    act(() => result.current.navigate(1));
    expect(result.current.settings.timelineBarsVisible.value).toBe(true);
    expect(result.current.settings.detailPanelMode.value).toBe('sidepanel');
  });

  it('writes manual changes to the URL while preserving repeated parameters, hash, state and defaults', () => {
    useDisplayedLayoutStore.getState().setTimelineBarsVisible(false);
    const saved = localStorage.getItem('jaeger.layout');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const state = { fromSearch: '/search?service=frontend' };
    const { result } = renderLayout([
      {
        pathname: '/trace/one',
        search: '?f=first&f=second&uiFind=error&sidebar=sidepanel',
        hash: '#span',
        state,
      },
    ]);

    act(() => result.current.settings.setTimelineBarsVisible(true));
    act(() => result.current.settings.setDetailPanelMode('inline'));

    const params = new URLSearchParams(result.current.location.search);
    expect(params.get('timeline')).toBe('on');
    expect(params.get('sidebar')).toBe('inline');
    expect(params.getAll('f')).toEqual(['first', 'second']);
    expect(params.get('uiFind')).toBe('error');
    expect(result.current.location.pathname).toBe('/trace/one');
    expect(result.current.location.hash).toBe('#span');
    expect(result.current.location.state).toEqual(state);
    expect(useDisplayedLayoutStore.getState().timelineBarsVisible).toBe(true);
    expect(useDisplayedLayoutStore.getState().detailPanelMode).toBe('inline');
    expect(localStorage.getItem('jaeger.layout')).toBe(saved);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('keeps a toggled layout after reopening the resulting URL', () => {
    const first = renderLayout();
    act(() => first.result.current.settings.setTimelineBarsVisible(false));
    const search = first.result.current.location.search;
    first.unmount();

    const { result } = renderLayout([`/trace/one${search}`]);
    expect(result.current.settings.timelineBarsVisible.value).toBe(false);
    expect(result.current.settings.timelineBarsVisible.source).toBe('url');
    expect(localStorage.getItem('jaeger.layout')).toBeNull();
  });

  it('reapplies URL overrides if saved preferences are rehydrated after the page opens', async () => {
    useDisplayedLayoutStore.getState().setTimelineBarsVisible(true);
    useDisplayedLayoutStore.getState().applyDetailPanelModeToLayout('inline');
    const saved = localStorage.getItem('jaeger.layout');
    const { result } = renderLayout(['/trace/one?timeline=off&sidebar=sidepanel']);
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    await act(async () => {
      await useSavedLayoutPrefsStore.persist.rehydrate();
    });

    expect(result.current.settings.timelineBarsVisible.value).toBe(false);
    expect(result.current.settings.detailPanelMode.value).toBe('sidepanel');
    expect(useDisplayedLayoutStore.getState()).toMatchObject({
      timelineBarsVisible: false,
      detailPanelMode: 'sidepanel',
    });
    expect(useSavedLayoutPrefsStore.getState()).toEqual({
      timelineBarsVisible: true,
      detailPanelMode: 'inline',
    });
    expect(localStorage.getItem('jaeger.layout')).toBe(saved);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('keeps a newer default from another tab intact when applying or toggling a shared layout', async () => {
    await useSavedLayoutPrefsStore.persist.rehydrate();
    const saved = JSON.stringify({ state: { timelineBarsVisible: false, heatmapEnabled: true }, version: 1 });
    localStorage.setItem('jaeger.layout', saved);
    const save = vi.spyOn(useSavedLayoutPrefsStore, 'setState');
    const { result } = renderLayout(['/trace/one?sidebar=sidepanel']);

    act(() => result.current.settings.setTimelineBarsVisible(false));
    expect(localStorage.getItem('jaeger.layout')).toBe(saved);
    expect(save).not.toHaveBeenCalled();
  });

  it('keeps an active URL override in force when another caller saves a default', () => {
    const { result } = renderLayout(['/trace/one?timeline=off']);
    act(() => useDisplayedLayoutStore.getState().setTimelineBarsVisible(true));

    expect(result.current.settings.timelineBarsVisible.value).toBe(false);
    expect(useDisplayedLayoutStore.getState().timelineBarsVisible).toBe(false);
    expect(JSON.parse(localStorage.getItem('jaeger.layout')!).state.timelineBarsVisible).toBe(true);

    act(() => result.current.navigate('/trace/one'));
    expect(result.current.settings.timelineBarsVisible.value).toBe(true);
    expect(useDisplayedLayoutStore.getState().timelineBarsVisible).toBe(true);
  });
});
