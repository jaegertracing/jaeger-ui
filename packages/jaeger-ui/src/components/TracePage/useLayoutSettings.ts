// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { SpanDetailPanelMode } from '../../types/config';
import { parseSettingsFromUrl } from './url';
import type { UrlLayoutSettings } from './url';
import { getInitialLayoutState, useLayoutPrefsStore } from './TraceTimelineViewer/store.layout';
import { setDetailPanelMode as setDetailPanelModeZustand } from './TraceTimelineViewer/store';

export type SettingSource = 'url' | 'heuristic' | 'localstorage';

export type ResolvedSetting<T> = {
  value: T;
  source: SettingSource;
  isOverridden: boolean;
};

export type ResolvedLayoutSettings = {
  timelineBarsVisible: ResolvedSetting<boolean>;
  detailPanelMode: ResolvedSetting<SpanDetailPanelMode>;
};

function computeHeuristicOverrides(): UrlLayoutSettings {
  return { timelineBarsVisible: null, detailPanelMode: null };
}

export function useLayoutSettings(locationSearch: string): ResolvedLayoutSettings & {
  saveAsDefault: (key: 'timelineBarsVisible' | 'detailPanelMode') => void;
} {
  const storeTimelineBarsVisible = useLayoutPrefsStore(s => s.timelineBarsVisible);
  const storeDetailPanelMode = useLayoutPrefsStore(s => s.detailPanelMode);
  const zustandSetTimelineBarsVisible = useLayoutPrefsStore(s => s.setTimelineBarsVisible);

  // Read localStorage state on mount, and update it manually when saveAsDefault is called.
  const [lsDefaults, setLsDefaults] = useState(() => getInitialLayoutState());
  const urlSettings = useMemo(() => parseSettingsFromUrl(locationSearch), [locationSearch]);
  const heuristicOverrides = useMemo(() => computeHeuristicOverrides(), []);

  const timelineBarsVisible = useMemo<ResolvedSetting<boolean>>(() => {
    if (urlSettings.timelineBarsVisible !== null) {
      return {
        value: urlSettings.timelineBarsVisible,
        source: 'url',
        isOverridden: urlSettings.timelineBarsVisible !== lsDefaults.timelineBarsVisible,
      };
    }
    if (heuristicOverrides.timelineBarsVisible !== null) {
      return {
        value: heuristicOverrides.timelineBarsVisible,
        source: 'heuristic',
        isOverridden: heuristicOverrides.timelineBarsVisible !== lsDefaults.timelineBarsVisible,
      };
    }
    return {
      value: storeTimelineBarsVisible,
      source: 'localstorage',
      isOverridden: storeTimelineBarsVisible !== lsDefaults.timelineBarsVisible,
    };
  }, [
    urlSettings.timelineBarsVisible,
    heuristicOverrides.timelineBarsVisible,
    lsDefaults.timelineBarsVisible,
    storeTimelineBarsVisible,
  ]);

  const detailPanelMode = useMemo<ResolvedSetting<SpanDetailPanelMode>>(() => {
    if (urlSettings.detailPanelMode !== null) {
      return {
        value: urlSettings.detailPanelMode,
        source: 'url',
        isOverridden: urlSettings.detailPanelMode !== lsDefaults.detailPanelMode,
      };
    }
    if (heuristicOverrides.detailPanelMode !== null) {
      return {
        value: heuristicOverrides.detailPanelMode,
        source: 'heuristic',
        isOverridden: heuristicOverrides.detailPanelMode !== lsDefaults.detailPanelMode,
      };
    }
    return {
      value: storeDetailPanelMode,
      source: 'localstorage',
      isOverridden: storeDetailPanelMode !== lsDefaults.detailPanelMode,
    };
  }, [
    urlSettings.detailPanelMode,
    heuristicOverrides.detailPanelMode,
    lsDefaults.detailPanelMode,
    storeDetailPanelMode,
  ]);

  const prevUrlSettingsRef = useRef<UrlLayoutSettings>(urlSettings);
  useLayoutEffect(() => {
    const prevUrlSettings = prevUrlSettingsRef.current;
    // Sync Timeline Bars
    if (urlSettings.timelineBarsVisible !== null) {
      zustandSetTimelineBarsVisible(urlSettings.timelineBarsVisible, false);
    } else if (
      prevUrlSettings.timelineBarsVisible !== null &&
      storeTimelineBarsVisible === prevUrlSettings.timelineBarsVisible
    ) {
      zustandSetTimelineBarsVisible(lsDefaults.timelineBarsVisible, false);
    }

    // Sync Detail Panel Mode
    if (urlSettings.detailPanelMode !== null) {
      setDetailPanelModeZustand(urlSettings.detailPanelMode, false);
    } else if (
      prevUrlSettings.detailPanelMode !== null &&
      storeDetailPanelMode === prevUrlSettings.detailPanelMode
    ) {
      setDetailPanelModeZustand(lsDefaults.detailPanelMode, false);
    }

    prevUrlSettingsRef.current = urlSettings;
  }, [
    urlSettings,
    lsDefaults,
    zustandSetTimelineBarsVisible,
    storeTimelineBarsVisible,
    storeDetailPanelMode,
  ]);

  const saveAsDefault = useCallback(
    (key: 'timelineBarsVisible' | 'detailPanelMode') => {
      if (key === 'timelineBarsVisible') {
        zustandSetTimelineBarsVisible(timelineBarsVisible.value, true);
      } else {
        setDetailPanelModeZustand(detailPanelMode.value, true);
      }
      setLsDefaults(getInitialLayoutState());
    },
    [zustandSetTimelineBarsVisible, timelineBarsVisible.value, detailPanelMode.value]
  );

  return { timelineBarsVisible, detailPanelMode, saveAsDefault };
}
