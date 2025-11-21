import React from 'react';
import { Button, Tooltip } from 'antd';
import { IoMoon, IoSunny } from 'react-icons/io5';

import { useThemeMode } from './ThemeProvider';

export default function ThemeToggleButton() {
  const { mode, toggleMode } = useThemeMode();
  const isDark = mode === 'dark';
  const label = isDark ? 'Light' : 'Dark';

  return (
    <Tooltip title={`Switch to ${label.toLowerCase()} mode`} placement="bottomRight">
      <Button
        aria-label="Toggle color mode"
        aria-pressed={isDark}
        className="ThemeToggleButton"
        onClick={toggleMode}
        type="text"
      >
        {isDark ? (
          <IoSunny className="ThemeToggleButton--icon" />
        ) : (
          <IoMoon className="ThemeToggleButton--icon" />
        )}
        <span className="ThemeToggleButton--label">{label} mode</span>
      </Button>
    </Tooltip>
  );
}
