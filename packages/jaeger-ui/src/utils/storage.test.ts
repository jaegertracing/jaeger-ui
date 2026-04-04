// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import storage from './storage';

beforeEach(() => {
  localStorage.clear();
});

describe('storage.getString', () => {
  it('returns stored string', () => {
    storage.set('k', 'hello');
    expect(storage.getString('k')).toBe('hello');
  });

  it('returns undefined for missing key', () => {
    expect(storage.getString('missing')).toBeUndefined();
  });

  it('returns defaultValue when stored value is not a string', () => {
    storage.set('k', 123);
    expect(storage.getString('k', 'fallback')).toBe('fallback');
  });

  it('returns defaultValue for missing key', () => {
    expect(storage.getString('missing', 'fallback')).toBe('fallback');
  });

  it('returns raw string when JSON.parse fails', () => {
    localStorage.setItem('k', 'not-json');
    expect(storage.getString('k')).toBe('not-json');
  });
});

describe('storage.getNumber', () => {
  it('returns stored number', () => {
    storage.set('k', 42);
    expect(storage.getNumber('k')).toBe(42);
  });

  it('returns undefined for missing key', () => {
    expect(storage.getNumber('missing')).toBeUndefined();
  });

  it('returns defaultValue when stored value is not a number', () => {
    storage.set('k', 'notanumber');
    expect(storage.getNumber('k', 99)).toBe(99);
  });
});

describe('storage.getBool', () => {
  it('returns stored boolean', () => {
    storage.set('k', true);
    expect(storage.getBool('k')).toBe(true);
  });

  it('returns undefined for missing key', () => {
    expect(storage.getBool('missing')).toBeUndefined();
  });

  it('returns defaultValue when stored value is not a boolean', () => {
    storage.set('k', 'yes');
    expect(storage.getBool('k', false)).toBe(false);
  });
});

describe('storage.getJSON', () => {
  it('returns stored object', () => {
    storage.set('k', { a: 1 });
    expect(storage.getJSON('k')).toEqual({ a: 1 });
  });

  it('returns undefined for missing key', () => {
    expect(storage.getJSON('missing')).toBeUndefined();
  });

  it('returns undefined for non-JSON value', () => {
    localStorage.setItem('k', 'not-json');
    expect(storage.getJSON('k')).toBeUndefined();
  });
});

describe('storage.set', () => {
  it('stores values as JSON', () => {
    storage.set('k', { x: 'y' });
    expect(localStorage.getItem('k')).toBe('{"x":"y"}');
  });

  it('removes key when value is undefined', () => {
    storage.set('k', 'value');
    expect(localStorage.getItem('k')).not.toBeNull();
    storage.set('k', undefined);
    expect(localStorage.getItem('k')).toBeNull();
  });
});
