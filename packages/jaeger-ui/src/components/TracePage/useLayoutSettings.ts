// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useMemo } from 'react';
import type { SpanDetailPanelMode } from '../../types/config';
import { parseSettingsFromUrl } from './url';
import type { UrlLayoutSettings } from './url';
import { getInitialLayoutState, useLayoutPrefsStore } from './TraceTimelineViewer/store.layout';

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
  const zustandApplyDetailPanelMode = useLayoutPrefsStore(s => s.applyDetailPanelModeToLayout);

  const lsDefaults = useMemo(() => getInitialLayoutState(), []);
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
      isOverridden: false,
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
      isOverridden: false,
    };
  }, [
    urlSettings.detailPanelMode,
    heuristicOverrides.detailPanelMode,
    lsDefaults.detailPanelMode,
    storeDetailPanelMode,
  ]);

  const saveAsDefault = useCallback(
    (key: 'timelineBarsVisible' | 'detailPanelMode') => {
      if (key === 'timelineBarsVisible') {
        zustandSetTimelineBarsVisible(timelineBarsVisible.value, true);
      } else {
        zustandApplyDetailPanelMode(detailPanelMode.value, true);
      }
    },
    [
      zustandSetTimelineBarsVisible,
      zustandApplyDetailPanelMode,
      timelineBarsVisible.value,
      detailPanelMode.value,
    ]
  );

  return { timelineBarsVisible, detailPanelMode, saveAsDefault };
}
