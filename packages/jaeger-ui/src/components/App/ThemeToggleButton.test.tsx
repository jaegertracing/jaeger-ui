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
    expect(screen.getByTestId('theme-icon').className).toContain('IoSunny');
  });

  it('toggles the theme when the button is clicked', () => {
    (useThemeMode as jest.Mock).mockReturnValue({ mode: 'light', toggleMode: mockToggle });
    render(<ThemeToggleButton />);

    const button = screen.getByRole('button', { name: /toggle color mode/i });
    fireEvent.click(button);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });
});
