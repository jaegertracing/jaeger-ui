// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getInitialTimeZone, TIME_ZONE_STORAGE_KEY, writeStoredTimeZone } from './TimeZoneStorage';

describe('TimeZoneStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to the browser time zone', () => {
    expect(getInitialTimeZone()).toBe('browser');
  });

  it('remembers the chosen time zone', () => {
    writeStoredTimeZone('utc');
    expect(localStorage.getItem(TIME_ZONE_STORAGE_KEY)).toBe('"utc"');
    expect(getInitialTimeZone()).toBe('utc');
  });

  it('ignores unknown stored values', () => {
    localStorage.setItem(TIME_ZONE_STORAGE_KEY, '"Europe/Berlin"');
    expect(getInitialTimeZone()).toBe('browser');
  });
});
