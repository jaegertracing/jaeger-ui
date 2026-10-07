// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import getConfig from '../../utils/config/get-config';
import { BROWSER_TIME_ZONE } from '../../utils/date';
import storage from '../../utils/storage';

export const TIME_ZONE_STORAGE_KEY = 'jaeger-ui-time-zone';

export function readStoredTimeZone(): string | null {
  return storage.getString(TIME_ZONE_STORAGE_KEY) || null;
}

export function writeStoredTimeZone(timeZone: string) {
  storage.set(TIME_ZONE_STORAGE_KEY, timeZone);
}

// The user's choice wins over the configured default.
export function getInitialTimeZone(): string {
  return readStoredTimeZone() || getConfig().timeZone || BROWSER_TIME_ZONE;
}
