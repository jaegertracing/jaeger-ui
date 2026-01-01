// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ThemeConfig } from 'antd';
import { ConfigProvider, theme } from 'antd';

import { DEFAULT_MODE, ThemeMode, getInitialTheme, writeStoredTheme } from './ThemeStorage';
import { ThemeTokenSync } from './ThemeTokenSync';

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

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
    colorLink: '#199',
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

export default function AppThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => getInitialTheme());

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
      <ConfigProvider theme={themeConfig}>
        {/* Sync is inside ConfigProvider to access the theme context */}
        <ThemeTokenSync />
        {children}
      </ConfigProvider>
    </ThemeModeContext.Provider>
  );
}
