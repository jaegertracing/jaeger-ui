// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getTimeFormatWithSeconds, getTimeFormatWithoutSeconds } from './time-format';

jest.mock('./config/get-config', () => ({
  getConfigValue: jest.fn(),
}));

import { getConfigValue } from './config/get-config';

describe('time-format utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTimeFormatWithSeconds', () => {
    it('returns 24-hour format when config is "24h"', () => {
      (getConfigValue as jest.Mock).mockReturnValue('24h');
      expect(getTimeFormatWithSeconds()).toBe('HH:mm:ss');
    });

    it('returns 12-hour format when config is "12h"', () => {
      (getConfigValue as jest.Mock).mockReturnValue('12h');
      expect(getTimeFormatWithSeconds()).toBe('hh:mm:ss a');
    });

    it('is case-insensitive and accepts "24H"', () => {
      (getConfigValue as jest.Mock).mockReturnValue('24H');
      expect(getTimeFormatWithSeconds()).toBe('HH:mm:ss');
    });

    it('defaults to 12-hour format when config value is missing', () => {
      (getConfigValue as jest.Mock).mockReturnValue(undefined);
      expect(getTimeFormatWithSeconds()).toBe('hh:mm:ss a');
    });

    it('defaults to 12-hour format for unknown config values', () => {
      (getConfigValue as jest.Mock).mockReturnValue('invalid');
      expect(getTimeFormatWithSeconds()).toBe('hh:mm:ss a');
    });
  });

  describe('getTimeFormatWithoutSeconds', () => {
    it('returns short 24-hour format when config is "24h"', () => {
      (getConfigValue as jest.Mock).mockReturnValue('24h');
      expect(getTimeFormatWithoutSeconds()).toBe('HH:mm');
    });

    it('returns short 12-hour format when config is "12h"', () => {
      (getConfigValue as jest.Mock).mockReturnValue('12h');
      expect(getTimeFormatWithoutSeconds()).toBe('hh:mm a');
    });

    it('is case-insensitive and accepts "24H"', () => {
      (getConfigValue as jest.Mock).mockReturnValue('24H');
      expect(getTimeFormatWithoutSeconds()).toBe('HH:mm');
    });

    it('defaults to short 12-hour format when config is missing', () => {
      (getConfigValue as jest.Mock).mockReturnValue(undefined);
      expect(getTimeFormatWithoutSeconds()).toBe('hh:mm a');
    });
  });
});
