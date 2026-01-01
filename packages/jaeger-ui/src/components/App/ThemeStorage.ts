// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getConfigValue } from '../../utils/config/get-config';

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'jaeger-ui-theme';
export const DEFAULT_MODE: ThemeMode = 'light';

export function readStoredTheme(targetWindow?: Window | null): ThemeMode | null {
  const activeWindow =
    targetWindow !== undefined
      ? (targetWindow ?? undefined)
      : typeof window !== 'undefined'
        ? window
        : undefined;
  if (!activeWindow) {
    return null;
  }

  try {
    const stored = activeWindow.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch (err) {
    // Local storage may be blocked; ignore and fallback below.
  }

  return null;
}

export function writeStoredTheme(mode: ThemeMode, targetWindow?: Window | null) {
  const activeWindow =
    targetWindow !== undefined
      ? (targetWindow ?? undefined)
      : typeof window !== 'undefined'
        ? window
        : undefined;
  if (!activeWindow) {
    return;
  }

  try {
    activeWindow.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (err) {
    // Ignore storage errors (e.g., Safari in private mode).
  }
}

export function getInitialTheme(): ThemeMode {
  if (!getConfigValue('themes.enabled')) {
    return DEFAULT_MODE;
  }
  const stored = readStoredTheme();
  if (stored) {
    return stored;
  }

  if (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }

  return DEFAULT_MODE;
}
