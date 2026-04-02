// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import ThemeToggleButton from './ThemeToggleButton';
import { useThemeMode } from './ThemeProvider';

vi.mock('./ThemeProvider');

describe('ThemeToggleButton', () => {
  const mockToggle = vi.fn();

  beforeEach(() => {
    mockToggle.mockClear();
  });

  it('shows sun icon when current mode is dark', () => {
    (useThemeMode as ReturnType<typeof vi.fn>).mockReturnValue({ mode: 'dark', toggleMode: mockToggle });

    render(<ThemeToggleButton />);

    const button = screen.getByRole('button', { name: /toggle color mode/i });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('theme-icon')).toHaveAttribute('data-icon', 'sun');
  });

  it('shows moon icon when current mode is light', () => {
    (useThemeMode as ReturnType<typeof vi.fn>).mockReturnValue({ mode: 'light', toggleMode: mockToggle });

    render(<ThemeToggleButton />);

    const button = screen.getByRole('button', { name: /toggle color mode/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('theme-icon')).toHaveAttribute('data-icon', 'moon');
  });

  it('toggles the theme when the button is clicked', () => {
    (useThemeMode as ReturnType<typeof vi.fn>).mockReturnValue({ mode: 'light', toggleMode: mockToggle });
    render(<ThemeToggleButton />);

    const button = screen.getByRole('button', { name: /toggle color mode/i });
    fireEvent.click(button);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });
});
