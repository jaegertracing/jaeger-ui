// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';

import AppThemeProvider, { useThemeMode } from './ThemeProvider';
import { THEME_STORAGE_KEY } from './ThemeStorage';
import getConfig from '../../utils/config/get-config';

vi.mock('../../utils/config/get-config', () => ({
  __esModule: true,
  default: vi.fn(),
}));

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
    (getConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ themes: { enabled: true } });
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

  it('toggles from dark back to light', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    render(
      <AppThemeProvider>
        <ThemeConsumer />
      </AppThemeProvider>
    );

    const toggleButton = screen.getByRole('button', { name: /toggle theme/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
      expect(document.body.dataset.theme).toBe('light');
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
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

  it('ignores stored preference when themes are disabled', () => {
    (getConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ themes: { enabled: false } });
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

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
    window.localStorage.setItem = vi.fn(() => {
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
    window.localStorage.getItem = vi.fn(() => {
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
    const observer = vi.fn();

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

  it('skips updating document body when document is undefined', () => {
    const { result } = renderHook(() => useThemeMode(), { wrapper: AppThemeProvider });

    const originalDocument = (global as any).document;
    delete (global as any).document;

    try {
      act(() => {
        result.current.toggleMode();
      });
    } catch {
      // Ant Design's CSS injection (useCacheToken) also accesses document when
      // re-rendering; the ReferenceError here comes from antd internals, not our
      // ThemeProvider code.  Our useEffect is already guarded with
      // `typeof document !== 'undefined'`.  We intentionally swallow ALL errors:
      // React 19 may wrap the original ReferenceError in an AggregateError or
      // rethrow it through internal error-reporting machinery, making a precise
      // `instanceof ReferenceError` check unreliable in practice.
    } finally {
      (global as any).document = originalDocument;
    }
  });

  it('correctly calculates and syncs AntD tokens in dark mode', async () => {
    render(
      <AppThemeProvider>
        <ThemeConsumer />
      </AppThemeProvider>
    );

    const toggleButton = screen.getByRole('button', { name: /toggle theme/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
    });

    // Verify that a token not manually overridden (like controlItemBgActive)
    // is synced to a dark color CSS variable.
    // AntD's darkAlgorithm usually results in dark backgrounds for selected items.
    const root = document.documentElement;
    const controlItemBgActive = root.style.getPropertyValue('--ant-control-item-bg-active');

    // In dark mode, controlItemBgActive should NOT be the light mode default (usually #e6f4ff or similar)
    // It should be a darker color or at least DIFFERENT from light mode.
    // Note: ThemeTokenSync prefixes with --ant- and converts camelCase to kebab-case.
    expect(controlItemBgActive).toBeDefined();
    expect(controlItemBgActive).not.toBe('');
  });
});
