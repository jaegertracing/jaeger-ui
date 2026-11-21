// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import type { ThemeConfig } from 'antd';
import { ConfigProvider, theme } from 'antd';

import { DEFAULT_MODE, ThemeMode, getInitialTheme, writeStoredTheme } from './ThemeStorage';
import { ThemeTokenSync } from './ThemeTokenSync';
import { useEmbeddedState } from '../../stores/embedded-store';

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

// antd's dark algorithm derives every shadow from white at 20% opacity, which leaves a popup
// with a glow of 1–2% opacity and no visible edge. The dark theme replaces the popup shadows
// with a hairline ring, which gives a popup an edge, and a black shadow dense enough to darken
// the page around it.
const darkPopupRingColor = 'rgba(125, 153, 191, 0.45)';
const darkPopupShadow = [
  `0 0 0 1px ${darkPopupRingColor}`,
  '0 6px 16px rgba(0, 0, 0, 0.55)',
  '0 12px 40px 8px rgba(0, 0, 0, 0.5)',
].join(', ');
const darkPopupTokens = {
  // Popups sit on a surface lighter than colorBgContainer, so that they do not blend into the
  // page: popovers, dropdowns, select lists, modals and notifications all use this token.
  colorBgElevated: '#24364f',
  boxShadow: darkPopupShadow,
  boxShadowSecondary: darkPopupShadow,
  // Popovers and tooltips take their shadow from a filter, which has no spread, so a 1px blur
  // stands in for the ring. antd reads dropShadowPopover but omits it from ThemeConfig, hence
  // this separate object, which is spread into the theme.
  dropShadowPopover: [
    `drop-shadow(0 0 1px ${darkPopupRingColor})`,
    'drop-shadow(0 6px 16px rgba(0, 0, 0, 0.55))',
    'drop-shadow(0 12px 28px rgba(0, 0, 0, 0.5))',
  ].join(' '),
};

const darkTheme: ThemeConfig = {
  ...baseThemeConfig,
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#4dd0e1',
    colorBgLayout: '#0b1625',
    colorBgContainer: '#162338',
    colorText: 'rgba(244, 248, 255, 0.92)',
    colorTextSecondary: 'rgba(244, 248, 255, 0.7)',
    colorBorder: 'rgba(125, 153, 191, 0.4)',
    colorBorderSecondary: 'rgba(125, 153, 191, 0.25)',
    colorLink: '#7bdcff',
    colorLinkHover: '#caf3ff',
    ...darkPopupTokens,
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
  const embeddedState = useEmbeddedState();
  const [mode, setModeState] = useState<ThemeMode>(() => getInitialTheme(embeddedState?.theme));

  const setMode = useCallback((value: ThemeMode) => {
    setModeState(value);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev: ThemeMode) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // This must be a layout effect, not a passive one. `vars.css` selects the dark
  // palette with `[data-theme='dark']`, and consumers that need a token's value
  // as data rather than as CSS — `ColorGenerator.getRgbColorByKey`, for the
  // canvas span graph — read it back off the DOM from their own `useEffect`.
  // React runs a parent's passive effects *after* its descendants', so writing
  // the attribute passively here would let those consumers observe the previous
  // theme for one commit. Every layout effect runs before any passive effect,
  // which puts the attribute in place first.
  useLayoutEffect(() => {
    document.body.dataset.theme = mode;
  }, [mode]);

  useEffect(() => {
    // Don't persist when the host controls the theme — avoid overwriting the
    // user's standalone preference with an embed-injected value.
    if (!embeddedState?.theme) writeStoredTheme(mode);
  }, [mode, embeddedState]);

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
