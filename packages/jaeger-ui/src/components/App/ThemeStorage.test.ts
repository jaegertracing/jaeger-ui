// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { THEME_STORAGE_KEY, readStoredTheme, writeStoredTheme, getInitialTheme } from './ThemeStorage';
import { getConfigValue } from '../../utils/config/get-config';

jest.mock('../../utils/config/get-config', () => ({
  getConfigValue: jest.fn(),
}));

function setupMatchMedia(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

describe('ThemeStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setupMatchMedia(false);
    (getConfigValue as jest.Mock).mockImplementation(key => {
      if (key === 'themes.enabled') {
        return true;
      }
      return undefined;
    });
  });

  describe('readStoredTheme', () => {
    it('returns stored theme when present and valid', () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      expect(readStoredTheme()).toBe('dark');
    });

    it('returns null when stored theme is invalid', () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'invalid');
      expect(readStoredTheme()).toBeNull();
    });

    it('returns null when no theme is stored', () => {
      expect(readStoredTheme()).toBeNull();
    });

    it('returns null and suppresses error when global window is blocked/unavailable', () => {
      const originalGetItem = window.localStorage.getItem;
      window.localStorage.getItem = jest.fn(() => {
        throw new Error('blocked');
      });

      try {
        expect(readStoredTheme()).toBeNull();
      } finally {
        window.localStorage.getItem = originalGetItem;
      }
    });

    it('honors injected window override', () => {
      const getItem = jest.fn(() => 'dark');
      const fakeWindow = {
        localStorage: { getItem },
      } as unknown as Window;

      expect(readStoredTheme(fakeWindow)).toBe('dark');
      expect(getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
    });

    it('short-circuits when null window is provided', () => {
      expect(readStoredTheme(null)).toBeNull();
    });

    it('falls back gracefully when the global window is unavailable', () => {
      const originalWindow = window;
      (global as typeof global & { window?: Window }).window = undefined;

      try {
        expect(readStoredTheme()).toBeNull();
      } finally {
        (global as typeof global & { window?: Window }).window = originalWindow;
      }
    });
  });

  describe('writeStoredTheme', () => {
    it('writes theme to localStorage', () => {
      writeStoredTheme('dark');
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });

    it('suppresses errors when localStorage is full or blocked', () => {
      const originalSetItem = window.localStorage.setItem;
      window.localStorage.setItem = jest.fn(() => {
        throw new Error('quota exceeded');
      });

      try {
        expect(() => writeStoredTheme('dark')).not.toThrow();
      } finally {
        window.localStorage.setItem = originalSetItem;
      }
    });

    it('honors injected window override', () => {
      const setItem = jest.fn();
      const fakeWindow = {
        localStorage: { setItem },
      } as unknown as Window;

      writeStoredTheme('light', fakeWindow);
      expect(setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'light');
    });

    it('short-circuits when null window is provided', () => {
      expect(() => writeStoredTheme('dark', null)).not.toThrow();
    });

    it('falls back gracefully when the global window is unavailable', () => {
      const originalWindow = window;
      (global as typeof global & { window?: Window }).window = undefined;

      try {
        expect(() => writeStoredTheme('dark')).not.toThrow();
      } finally {
        (global as typeof global & { window?: Window }).window = originalWindow;
      }
    });
  });

  describe('getInitialTheme', () => {
    it('returns default mode when themes are disabled', () => {
      (getConfigValue as jest.Mock).mockReturnValue(false);
      window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      expect(getInitialTheme()).toBe('light');
    });

    it('prefers stored theme when present', () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      expect(getInitialTheme()).toBe('dark');
    });

    it('prefers system preference when no stored theme', () => {
      setupMatchMedia(true);
      expect(getInitialTheme()).toBe('dark');
    });

    it('falls back to default mode when no preference or stored theme', () => {
      expect(getInitialTheme()).toBe('light');
    });
  });
});
