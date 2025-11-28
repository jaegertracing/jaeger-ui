// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Keyboard key constants for use with KeyboardEvent.key.
 * Previously imported from ts-key-enum, but v3 uses const enum which
 * doesn't work with Vite/esbuild (no runtime JavaScript representation).
 */
export const KeyboardKey = {
  Escape: 'Escape',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  Enter: 'Enter',
} as const;
