// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Simple localStorage wrapper with JSON serialization.
 * Replaces the 'store' npm package.
 */
const storage = {
  get(key: string): unknown {
    try {
      const value = localStorage.getItem(key);
      return value === null ? undefined : JSON.parse(value);
    } catch {
      return undefined;
    }
  },
  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore quota errors
    }
  },
};

export default storage;
