// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Simple localStorage wrapper with JSON serialization.
 * Replaces the 'store' npm package.
 */

function getRaw(key: string): unknown {
  let value: string | null;
  try {
    value = localStorage.getItem(key);
  } catch {
    return undefined;
  }
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
  try {
    const value = localStorage.getItem(key);
    if (value === null) return undefined;
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function set(key: string, value: unknown): void {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, serialized);
    }
  } catch {
    // Ignore quota errors or non-serializable values
  }
}

const storage = { getString, getNumber, getBool, getJSON, set };

export default storage;
