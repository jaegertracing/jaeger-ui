// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import getConfig from '../../utils/config/get-config';
import storage from '../../utils/storage';

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'jaeger-ui-theme';
export const DEFAULT_MODE: ThemeMode = 'light';

export function readStoredTheme(): ThemeMode | null {
  const stored = storage.getString(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return null;
}

export function writeStoredTheme(mode: ThemeMode) {
  storage.set(THEME_STORAGE_KEY, mode);
}

export function getInitialTheme(embeddedTheme?: ThemeMode | null): ThemeMode {
  // Host-injected theme takes unconditional precedence (uiEmbed=v0&uiTheme=dark).
  if (embeddedTheme) {
    return embeddedTheme;
  }
  if (!getConfig().themes?.enabled) {
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
