// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { THEME_STORAGE_KEY, readStoredTheme, writeStoredTheme, getInitialTheme } from './ThemeStorage';
import getConfig from '../../utils/config/get-config';
import storage from '../../utils/storage';

vi.mock('../../utils/config/get-config', () => mockDefault(vi.fn()));
vi.mock('../../utils/storage', () =>
  mockDefault({
    getString: vi.fn(),
    set: vi.fn(),
  })
);

const mockGetConfig = getConfig as unknown as ReturnType<typeof vi.fn>;
const mockStorage = vi.mocked(storage);

function setupMatchMedia(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('ThemeStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMatchMedia(false);
    mockGetConfig.mockReturnValue({ themes: { enabled: true } });
    mockStorage.getString.mockReturnValue(undefined as unknown as string);
  });

  describe('readStoredTheme', () => {
    it('returns stored theme when present and valid', () => {
      mockStorage.getString.mockReturnValue('dark');
      expect(readStoredTheme()).toBe('dark');
      expect(mockStorage.getString).toHaveBeenCalledWith(THEME_STORAGE_KEY);
    });

    it('returns null when stored theme is invalid', () => {
      mockStorage.getString.mockReturnValue('sepia');
      expect(readStoredTheme()).toBeNull();
    });

    it('returns null when no theme is stored', () => {
      expect(readStoredTheme()).toBeNull();
    });
  });

  describe('writeStoredTheme', () => {
    it('delegates to storage.set', () => {
      writeStoredTheme('dark');
      expect(mockStorage.set).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
    });
  });

  describe('getInitialTheme', () => {
    it('returns embedded theme unconditionally when provided, ignoring themes.enabled', () => {
      mockGetConfig.mockReturnValue({ themes: { enabled: false } });
      expect(getInitialTheme('dark')).toBe('dark');
      expect(getInitialTheme('light')).toBe('light');
    });

    it('returns embedded theme even when a stored preference exists', () => {
      mockStorage.getString.mockReturnValue('light');
      expect(getInitialTheme('dark')).toBe('dark');
    });

    it('returns default mode when themes are disabled and no embedded theme', () => {
      mockGetConfig.mockReturnValue({ themes: { enabled: false } });
      mockStorage.getString.mockReturnValue('dark');
      expect(getInitialTheme()).toBe('light');
    });

    it('prefers stored theme when present', () => {
      mockStorage.getString.mockReturnValue('dark');
      expect(getInitialTheme()).toBe('dark');
    });

    it('prefers system preference when no stored theme', () => {
      setupMatchMedia(true);
      expect(getInitialTheme()).toBe('dark');
    });

    it('falls back to default mode when no preference or stored theme', () => {
      expect(getInitialTheme()).toBe('light');
    });

    it('treats null embedded theme the same as undefined', () => {
      mockStorage.getString.mockReturnValue('dark');
      expect(getInitialTheme(null)).toBe('dark');
    });
  });
});
