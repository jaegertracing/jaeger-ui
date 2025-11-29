// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import ThemeToggleButton from './ThemeToggleButton';
import { useThemeMode } from './ThemeProvider';

jest.mock('./ThemeProvider');

describe('ThemeToggleButton', () => {
  const mockToggle = jest.fn();

  beforeEach(() => {
    mockToggle.mockClear();
  });

  it('shows dark-mode label and sun icon when current mode is dark', () => {
    (useThemeMode as jest.Mock).mockReturnValue({ mode: 'dark', toggleMode: mockToggle });

    render(<ThemeToggleButton />);

    expect(screen.getByText('Light mode')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /toggle color mode/i });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('theme-icon')).toHaveAttribute('data-icon', 'sun');
  });

  it('shows light-mode label and moon icon when current mode is light', () => {
    (useThemeMode as jest.Mock).mockReturnValue({ mode: 'light', toggleMode: mockToggle });

    render(<ThemeToggleButton />);

    expect(screen.getByText('Dark mode')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /toggle color mode/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('theme-icon')).toHaveAttribute('data-icon', 'moon');
  });

  it('toggles the theme when the button is clicked', () => {
    (useThemeMode as jest.Mock).mockReturnValue({ mode: 'light', toggleMode: mockToggle });
    render(<ThemeToggleButton />);

    const button = screen.getByRole('button', { name: /toggle color mode/i });
    fireEvent.click(button);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });
});
