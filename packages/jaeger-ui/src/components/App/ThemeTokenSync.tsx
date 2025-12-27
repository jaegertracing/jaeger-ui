// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { theme } from 'antd';
import { useEffect } from 'react';

/**
 * ThemeTokenSync acts as a bridge between Ant Design's CSS-in-JS design tokens
 * and global CSS variables.
 *
 * ### Why is this needed?
 *
 * Ant Design v6 injects design tokens into a local scope (usually the `.ant-layout` container).
 * Elements rendered via Portals (Modals, Tooltips, Drawers) or those with `position: fixed`
 * often live outside this scope in the DOM tree, causing `--ant-` variables to be undefined.
 *
 * ### What it does:
 *
 * 1. Hooks into the current AntD theme context via `theme.useToken()`.
 * 2. Iterates through all tokens (e.g., `colorBgContainer`).
 * 3. Converts them to kebab-case CSS variables (e.g., `--ant-color-bg-container`).
 * 4. Injects them into the `:root` (`<html>`) element, making them globally accessible
 *    to custom CSS variables like `--surface-primary: var(--ant-color-bg-container)`.
 *
 * @example
 * <ConfigProvider theme={...}>
 *   <ThemeTokenSync />
 *   <App />
 * </ConfigProvider>
 */
export function ThemeTokenSync(): null {
  const { token } = theme.useToken();

  useEffect(() => {
    const root = document.documentElement;

    // Helper to convert camelCase to kebab-case
    const toKebabCase = (str: string) => str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);

    // Map every design token to a CSS variable
    Object.entries(token).forEach(([key, value]) => {
      // We prefix with --ant to match your existing custom vars
      // and check if the value is a string or number (avoiding nested objects)
      if (typeof value === 'string' || typeof value === 'number') {
        root.style.setProperty(`--ant-${toKebabCase(key)}`, String(value));
      }
    });
  }, [token]);

  return null;
}
