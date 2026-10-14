// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import {
  getInitialTimeZone,
  readStoredTimeZone,
  TIME_ZONE_STORAGE_KEY,
  writeStoredTimeZone,
} from './TimeZoneStorage';
import getConfig from '../../utils/config/get-config';

vi.mock('../../utils/config/get-config', () => ({
  default: vi.fn(() => ({})),
}));

const getConfigMock = getConfig as unknown as ReturnType<typeof vi.fn>;

describe('TimeZoneStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    getConfigMock.mockReturnValue({});
  });

  it('reads and writes the stored time zone', () => {
    expect(readStoredTimeZone()).toBeNull();
    writeStoredTimeZone('utc');
    expect(readStoredTimeZone()).toBe('utc');
    expect(localStorage.getItem(TIME_ZONE_STORAGE_KEY)).toBe('"utc"');
  });

  it('defaults to the browser time zone', () => {
    expect(getInitialTimeZone()).toBe('browser');
  });

  it('uses the configured time zone when nothing is stored', () => {
    getConfigMock.mockReturnValue({ timeZone: 'Europe/Berlin' });
    expect(getInitialTimeZone()).toBe('Europe/Berlin');
  });

  it('prefers the stored time zone over the configured one', () => {
    getConfigMock.mockReturnValue({ timeZone: 'Europe/Berlin' });
    writeStoredTimeZone('utc');
    expect(getInitialTimeZone()).toBe('utc');
  });
});
