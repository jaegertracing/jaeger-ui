// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { AttributeValue, IAttribute, IAttributes } from '../types/otel';

/**
 * Default implementation of {@link IAttributes}. Wraps the underlying
 * `IAttribute[]` and builds a key→value index lazily on first key access,
 * so a specific-attribute lookup is O(1) instead of a linear scan. The raw
 * array is intentionally not exposed as a property; callers reach it only
 * through `entries()`, whose doc comment warns against per-key scans.
 */
class Attributes implements IAttributes {
  private readonly _entries: ReadonlyArray<IAttribute>;
  private _index?: Map<string, AttributeValue>;

  constructor(entries: ReadonlyArray<IAttribute>) {
    this._entries = entries;
  }

  private index(): Map<string, AttributeValue> {
    if (!this._index) {
      const map = new Map<string, AttributeValue>();
      // First-wins, matching the historical `.find(a => a.key === key)` semantics.
      for (const { key, value } of this._entries) {
        if (!map.has(key)) map.set(key, value);
      }
      this._index = map;
    }
    return this._index;
  }

  getValue(key: string): AttributeValue | undefined {
    return this.index().get(key);
  }

  has(key: string): boolean {
    return this.index().has(key);
  }

  keys(): ReadonlyArray<string> {
    return [...this.index().keys()];
  }

  entries(): ReadonlyArray<IAttribute> {
    return this._entries;
  }

  get size(): number {
    return this._entries.length;
  }
}

const EMPTY = new Attributes([]);

/**
 * Wraps an `IAttribute[]` into an {@link IAttributes} collection. The returned
 * object owns the passed array and returns the same reference from `entries()`,
 * so identity-based consumers (e.g. the link-pattern cache) remain stable.
 */
export function makeAttributes(entries: ReadonlyArray<IAttribute> = []): IAttributes {
  return entries.length === 0 ? EMPTY : new Attributes(entries);
}
