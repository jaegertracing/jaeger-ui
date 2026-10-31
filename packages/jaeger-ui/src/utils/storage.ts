// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Simple localStorage wrapper with JSON serialization.
 * Replaces the 'store' npm package.
 *
 * Every read and write goes through getItem/setItem/removeItem below, which swallow
 * the errors localStorage raises when the browser blocks storage: touching it at all
 * throws SecurityError where site data is disabled, and writing throws
 * QuotaExceededError when the store is full. A lost preference is an acceptable
 * outcome; a preference that breaks the page is not. Use these instead of reaching
 * for localStorage directly.
 */

function getItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore
  }
}

function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

function getRaw(key: string): unknown {
  const value = getItem(key);
  if (value === null) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getString(key: string): string | undefined;
function getString(key: string, defaultValue: string): string;
function getString(key: string, defaultValue?: string): string | undefined {
  const v = getRaw(key);
  return typeof v === 'string' ? v : defaultValue;
}

function getNumber(key: string): number | undefined;
function getNumber(key: string, defaultValue: number): number;
function getNumber(key: string, defaultValue?: number): number | undefined {
  const v = getRaw(key);
  return typeof v === 'number' && !Number.isNaN(v) ? v : defaultValue;
}

function getBool(key: string): boolean | undefined;
function getBool(key: string, defaultValue: boolean): boolean;
function getBool(key: string, defaultValue?: boolean): boolean | undefined {
  const v = getRaw(key);
  return typeof v === 'boolean' ? v : defaultValue;
}

function getJSON<T = unknown>(key: string): T | undefined {
  const value = getItem(key);
  if (value === null) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function set(key: string, value: unknown): void {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    // A value that cannot be serialized (a cycle, a BigInt) is not storable.
    return;
  }
  if (serialized === undefined) {
    removeItem(key);
  } else {
    setItem(key, serialized);
  }
}

const storage = { getItem, setItem, removeItem, getString, getNumber, getBool, getJSON, set };

export default storage;
