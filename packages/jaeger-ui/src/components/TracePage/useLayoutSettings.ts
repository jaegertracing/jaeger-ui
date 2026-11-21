// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useLayoutEffect, useMemo } from 'react';
import { useNavigate, type Location } from 'react-router-dom';

import type { SpanDetailPanelMode } from '../../types/config';
import {
  normalizeLayoutPrefs,
  setDetailPanelMode,
  useDisplayedLayoutStore,
  useSavedLayoutPrefsStore,
} from './TraceTimelineViewer/store';
import { parseLayoutSettingsFromUrl, stringifyLayoutSettings, type UrlLayoutSettings } from './url';

interface IResolvedSetting<T> {
  value: T;
  source: 'url' | 'heuristic' | 'localstorage';
  isOverridden: boolean;
}

function resolveSetting<T>(url: T | null, heuristic: T | null | undefined, saved: T): IResolvedSetting<T> {
  const value = url ?? heuristic ?? saved;
  return {
    value,
    source: url != null ? 'url' : heuristic != null ? 'heuristic' : 'localstorage',
    isOverridden: value !== saved,
  };
}

export function useLayoutSettings(
  location: Location,
  enableSidePanel: boolean,
  heuristics: Partial<UrlLayoutSettings> = {}
) {
  const navigate = useNavigate();
  const savedTimeline = useSavedLayoutPrefsStore(state => state.timelineBarsVisible);
  const savedMode = useSavedLayoutPrefsStore(state => state.detailPanelMode);
  const displayedTimeline = useDisplayedLayoutStore(state => state.timelineBarsVisible);
  const displayedMode = useDisplayedLayoutStore(state => state.detailPanelMode);
  const defaults = useMemo(
    () => normalizeLayoutPrefs({ timelineBarsVisible: savedTimeline, detailPanelMode: savedMode }),
    [savedTimeline, savedMode]
  );
  const url = parseLayoutSettingsFromUrl(location.search ?? '');
  const timelineBarsVisible = resolveSetting(
    url.timelineBarsVisible,
    heuristics.timelineBarsVisible,
    defaults.timelineBarsVisible
  );
  const detailPanelMode = resolveSetting(
    url.detailPanelMode === 'sidepanel' && !enableSidePanel ? null : url.detailPanelMode,
    heuristics.detailPanelMode === 'sidepanel' && !enableSidePanel ? null : heuristics.detailPanelMode,
    defaults.detailPanelMode
  );

  useLayoutEffect(() => {
    const layout = useDisplayedLayoutStore.getState();
    // Resolve from this page's inputs, never the layout left by the previous trace.
    if (layout.timelineBarsVisible !== timelineBarsVisible.value) {
      layout.setTimelineBarsVisible(timelineBarsVisible.value, { persist: false });
    }
    if (layout.detailPanelMode !== detailPanelMode.value) {
      setDetailPanelMode(detailPanelMode.value, { persist: false });
    }
  }, [timelineBarsVisible.value, detailPanelMode.value, displayedTimeline, displayedMode]);

  const updateUrl = useCallback(
    (settings: Partial<UrlLayoutSettings>) => {
      const params = new URLSearchParams(location.search ?? '');
      Object.entries(stringifyLayoutSettings(settings)).forEach(([name, value]) => params.set(name, value));
      navigate(
        { pathname: location.pathname, search: `?${params.toString()}`, hash: location.hash },
        { replace: true, state: location.state }
      );
    },
    [location.pathname, location.search, location.hash, location.state, navigate]
  );

  const updateTimelineBarsVisible = useCallback(
    (visible: boolean) => {
      useDisplayedLayoutStore.getState().setTimelineBarsVisible(visible, { persist: false });
      updateUrl({ timelineBarsVisible: visible });
    },
    [updateUrl]
  );

  const updateDetailPanelMode = useCallback(
    (mode: SpanDetailPanelMode) => {
      setDetailPanelMode(mode, { persist: false });
      updateUrl({ detailPanelMode: mode });
    },
    [updateUrl]
  );

  return {
    timelineBarsVisible,
    detailPanelMode,
    setTimelineBarsVisible: updateTimelineBarsVisible,
    setDetailPanelMode: updateDetailPanelMode,
  };
}
