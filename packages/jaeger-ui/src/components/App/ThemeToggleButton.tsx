// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Button, Tooltip } from 'antd';
import { IoMoon, IoSunny } from 'react-icons/io5';
import './ThemeToggleButton.css';

import { useThemeMode } from './ThemeProvider';

export default function ThemeToggleButton() {
  const { mode, toggleMode } = useThemeMode();
  const isDark = mode === 'dark';
  const label = isDark ? 'Light' : 'Dark';
  const iconProps = {
    className: 'ThemeToggleButton--icon',
    'data-testid': 'theme-icon',
    'data-icon': isDark ? 'sun' : 'moon',
  } as const;

  return (
    <Tooltip title={`Switch to ${label.toLowerCase()} mode`} placement="bottomRight">
      <Button
        aria-label="Toggle color mode"
        aria-pressed={isDark}
        className="ThemeToggleButton"
        onClick={toggleMode}
        type="text"
      >
        {isDark ? <IoSunny {...iconProps} /> : <IoMoon {...iconProps} />}
        {/* <span className="ThemeToggleButton--label">{label} mode</span> */}
      </Button>
    </Tooltip>
  );
}
