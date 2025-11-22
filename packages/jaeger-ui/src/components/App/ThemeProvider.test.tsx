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

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import AppThemeProvider, { __themeTestInternals, useThemeMode } from './ThemeProvider';

const THEME_STORAGE_KEY = 'jaeger-ui-theme';

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

function ThemeConsumer() {
  const { mode, toggleMode, setMode } = useThemeMode();
  return (
    <div>
      <span data-testid="theme-mode">{mode}</span>
      <button type="button" onClick={toggleMode}>
        toggle theme
      </button>
      <button type="button" onClick={() => setMode('light')}>
        force light
      </button>
    </div>
  );
}

describe('AppThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.body.dataset.theme;
    setupMatchMedia(false);
  });

  it('initializes using the stored preference when present', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    render(
      <AppThemeProvider>
        <ThemeConsumer />
      </AppThemeProvider>
    );

    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
  });

  it('toggles between light and dark, updating body and storage', async () => {
    render(
      <AppThemeProvider>
        <ThemeConsumer />
      </AppThemeProvider>
    );

    const toggleButton = screen.getByRole('button', { name: /toggle theme/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
      expect(document.body.dataset.theme).toBe('dark');
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });
  });

  it('prefers system dark mode when no stored preference exists', () => {
    setupMatchMedia(true);

    render(
      <AppThemeProvider>
        <ThemeConsumer />
      </AppThemeProvider>
    );

    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
  });

  it('falls back to the default mode when the stored value is invalid', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia');

    render(
      <AppThemeProvider>
        <ThemeConsumer />
      </AppThemeProvider>
    );

    expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
  });

  it('recovers to light mode when setMode is invoked', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    render(
      <AppThemeProvider>
        <ThemeConsumer />
      </AppThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /force light/i }));

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
      expect(document.body.dataset.theme).toBe('light');
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    });
  });

  it('swallows storage errors when persisting mode changes', async () => {
    const originalSetItem = window.localStorage.setItem;
    window.localStorage.setItem = jest.fn(() => {
      throw new Error('quota exceeded');
    });

    try {
      render(
        <AppThemeProvider>
          <ThemeConsumer />
        </AppThemeProvider>
      );

      const toggleButton = screen.getByRole('button', { name: /toggle theme/i });
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
        expect(document.body.dataset.theme).toBe('dark');
      });
    } finally {
      window.localStorage.setItem = originalSetItem;
    }
  });

  it('ignores errors when reading the stored preference', () => {
    const originalGetItem = window.localStorage.getItem;
    window.localStorage.getItem = jest.fn(() => {
      throw new Error('blocked');
    });

    try {
      render(
        <AppThemeProvider>
          <ThemeConsumer />
        </AppThemeProvider>
      );

      expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
    } finally {
      window.localStorage.getItem = originalGetItem;
    }
  });

  it('provides default context values when the hook is used without a provider', () => {
    const observer = jest.fn();

    function BareConsumer() {
      const context = useThemeMode();
      React.useEffect(() => {
        observer(context);
      }, [context]);
      return null;
    }

    render(<BareConsumer />);

    expect(observer).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'light',
        setMode: expect.any(Function),
        toggleMode: expect.any(Function),
      })
    );
    const context = observer.mock.calls[0][0];
    expect(context.setMode('dark')).toBeUndefined();
    expect(context.toggleMode()).toBeUndefined();
  });

  it('short-circuits storage helpers when no window is available', () => {
    expect(__themeTestInternals.readStoredTheme(null)).toBeNull();
    expect(() => __themeTestInternals.writeStoredTheme('dark', null)).not.toThrow();
  });

  it('honors injected window overrides when reading and writing storage', () => {
    const getItem = jest.fn(() => 'dark');
    const setItem = jest.fn();
    const fakeWindow = {
      localStorage: { getItem, setItem },
    } as unknown as Window;

    expect(__themeTestInternals.readStoredTheme(fakeWindow)).toBe('dark');
    __themeTestInternals.writeStoredTheme('light', fakeWindow);

    expect(getItem).toHaveBeenCalledWith('jaeger-ui-theme');
    expect(setItem).toHaveBeenCalledWith('jaeger-ui-theme', 'light');
  });

  it('falls back gracefully when the global window is unavailable', () => {
    const originalWindow = window;
    (global as typeof global & { window?: Window }).window = undefined;

    try {
      expect(__themeTestInternals.readStoredTheme()).toBeNull();
      expect(() => __themeTestInternals.writeStoredTheme('dark')).not.toThrow();
    } finally {
      (global as typeof global & { window?: Window }).window = originalWindow;
    }
  });
});
