// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ThemeConfig } from 'antd';
import { ConfigProvider, theme } from 'antd';

export type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const THEME_STORAGE_KEY = 'jaeger-ui-theme';
const DEFAULT_MODE: ThemeMode = 'light';

type ThemeProviderProps = {
  children: React.ReactNode;
};

const ThemeModeContext = createContext<ThemeContextValue>({
  mode: DEFAULT_MODE,
  setMode: () => undefined,
  toggleMode: () => undefined,
});

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

const { defaultAlgorithm, defaultSeed } = theme;
const mapToken = defaultAlgorithm(defaultSeed);

// The base theme customizes some dimensional properties.
const baseThemeConfig: ThemeConfig = {
  cssVar: {},
  components: {
    Layout: {
      headerHeight: 48,
      headerPadding: '0 50',
      footerPadding: '24 50',
      triggerHeight: 48,
      zeroTriggerWidth: 36,
      zeroTriggerHeight: 42,
    },
  },
};

const lightTheme: ThemeConfig = {
  ...baseThemeConfig,
  algorithm: theme.defaultAlgorithm,
  token: {
    // --- Color Palette Seeds ---
    colorPrimary: '#199', // Your brand's single primary color
    // --- Neutral Seeds (Optional but recommended) ---
    colorTextBase: '#000000',
    colorBgBase: '#ffffff',
  },
  components: {
    Layout: {
      ...baseThemeConfig.components?.Layout,
      bodyBg: '#fff',
      headerBg: '#404040',
      footerBg: '#fff',
      siderBg: '#404040',
      triggerBg: 'tint(#fff, 20%)',
    },
    Menu: {
      darkItemBg: '#151515',
    },
    Table: {
      rowHoverBg: '#e5f2f2',
    },
  },
};

const darkTheme: ThemeConfig = {
  ...baseThemeConfig,
  algorithm: theme.darkAlgorithm,
  token: {
    ...mapToken,
    colorPrimary: '#4dd0e1',
    colorBgLayout: '#0b1625',
    colorBgContainer: '#162338',
    colorText: 'rgba(244, 248, 255, 0.92)',
    colorTextSecondary: 'rgba(244, 248, 255, 0.7)',
    colorBorder: 'rgba(125, 153, 191, 0.4)',
    colorBorderSecondary: 'rgba(125, 153, 191, 0.25)',
    colorLink: '#7bdcff',
    colorLinkHover: '#caf3ff',
    colorBgElevated: '#162338',
  },
  components: {
    Layout: {
      ...baseThemeConfig.components?.Layout,
      bodyBg: '#0b1625',
      headerBg: 'transparent',
      footerBg: '#0b1625',
      siderBg: '#0f1c30',
      triggerBg: 'rgba(255, 255, 255, 0.06)',
    },
    Menu: {
      darkItemBg: 'transparent',
    },
    Table: {
      rowHoverBg: 'rgba(100, 217, 255, 0.12)',
      headerColor: 'rgba(244, 248, 255, 0.75)',
    },
  },
};

function readStoredTheme(targetWindow?: Window | null): ThemeMode | null {
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

function writeStoredTheme(mode: ThemeMode, targetWindow?: Window | null) {
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

function getInitialMode(): ThemeMode {
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

export const __themeTestInternals = {
  readStoredTheme,
  writeStoredTheme,
  getInitialMode,
};

export default function AppThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => getInitialMode());

  const setMode = useCallback((value: ThemeMode) => {
    setModeState(value);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev: ThemeMode) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.theme = mode;
    }

    writeStoredTheme(mode);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode,
    }),
    [mode, setMode, toggleMode]
  );

  const themeConfig: ThemeConfig = mode === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeModeContext.Provider value={value}>
      <ConfigProvider theme={themeConfig}>{children}</ConfigProvider>
    </ThemeModeContext.Provider>
  );
}
