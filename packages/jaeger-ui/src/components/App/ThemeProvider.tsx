// Copyright (c) 2025 The Jaeger Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// @ts-nocheck
/** @jsxRuntime classic */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ThemeConfig } from 'antd';
import { defaultTheme } from '@ant-design/compatible';
import { ConfigProvider } from 'antd';

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

const lightTheme: ThemeConfig = {
  token: {
    ...defaultTheme.token,
    colorPrimary: '#1976d2',
    colorBgLayout: '#f5f7fb',
    colorBgContainer: '#ffffff',
    colorText: 'rgba(13, 30, 54, 0.9)',
    colorTextSecondary: 'rgba(13, 30, 54, 0.68)',
    colorBorder: '#d3ddeb',
    colorBorderSecondary: '#e4ecf7',
    colorLink: '#0c6ca8',
    colorLinkHover: '#084c75',
  },
  components: {
    ...defaultTheme.components,
    Layout: {
      ...defaultTheme.components?.Layout,
      bodyBg: '#f5f7fb',
      headerBg: 'transparent',
      footerBg: '#f5f7fb',
      headerHeight: 48,
      headerPadding: '0 40',
      footerPadding: '24 40',
      siderBg: '#ffffff',
      triggerHeight: 48,
      triggerBg: '#e4ecf7',
      zeroTriggerWidth: 36,
      zeroTriggerHeight: 42,
    },
    Menu: {
      ...defaultTheme.components?.Menu,
      darkItemBg: 'transparent',
    },
    Table: {
      ...defaultTheme.components?.Table,
      rowHoverBg: '#e6f1ff',
      headerColor: 'rgba(13, 30, 54, 0.65)',
    },
  },
};

const darkTheme: ThemeConfig = {
  token: {
    ...defaultTheme.token,
    colorPrimary: '#4dd0e1',
    colorBgLayout: '#0b1625',
    colorBgContainer: '#162338',
    colorText: 'rgba(244, 248, 255, 0.92)',
    colorTextSecondary: 'rgba(244, 248, 255, 0.7)',
    colorBorder: 'rgba(125, 153, 191, 0.4)',
    colorBorderSecondary: 'rgba(125, 153, 191, 0.25)',
    colorLink: '#7bdcff',
    colorLinkHover: '#caf3ff',
  },
  components: {
    ...defaultTheme.components,
    Layout: {
      ...defaultTheme.components?.Layout,
      bodyBg: '#0b1625',
      headerBg: 'transparent',
      footerBg: '#0b1625',
      headerHeight: 48,
      headerPadding: '0 40',
      footerPadding: '24 40',
      siderBg: '#0f1c30',
      triggerHeight: 48,
      triggerBg: 'rgba(255, 255, 255, 0.06)',
      zeroTriggerWidth: 36,
      zeroTriggerHeight: 42,
    },
    Menu: {
      ...defaultTheme.components?.Menu,
      darkItemBg: 'transparent',
    },
    Table: {
      ...defaultTheme.components?.Table,
      rowHoverBg: 'rgba(100, 217, 255, 0.12)',
      headerColor: 'rgba(244, 248, 255, 0.75)',
    },
  },
};

const APP_THEMES: Record<ThemeMode, ThemeConfig> = {
  light: lightTheme,
  dark: darkTheme,
};

function readStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch (err) {
    // Local storage may be blocked; ignore and fallback below.
  }

  return null;
}

function writeStoredTheme(mode: ThemeMode) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
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

  const themeConfig: ThemeConfig = mode === 'dark' ? APP_THEMES.dark : APP_THEMES.light;

  return (
    <ThemeModeContext.Provider value={value}>
      <ConfigProvider theme={themeConfig}>{children}</ConfigProvider>
    </ThemeModeContext.Provider>
  );
}
