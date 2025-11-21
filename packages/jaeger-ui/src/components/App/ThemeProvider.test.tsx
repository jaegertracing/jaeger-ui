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

import AppThemeProvider, { useThemeMode } from './ThemeProvider';

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
});
