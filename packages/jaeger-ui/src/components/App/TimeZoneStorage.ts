// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { BROWSER_TIME_ZONE, TTimeZoneSetting, UTC_TIME_ZONE } from '../../utils/date';
import storage from '../../utils/storage';

export const TIME_ZONE_STORAGE_KEY = 'jaeger-ui-time-zone';

export function writeStoredTimeZone(timeZone: TTimeZoneSetting) {
  storage.set(TIME_ZONE_STORAGE_KEY, timeZone);
}

// Browser local time unless the user chose UTC.
export function getInitialTimeZone(): TTimeZoneSetting {
  return storage.getString(TIME_ZONE_STORAGE_KEY) === UTC_TIME_ZONE ? UTC_TIME_ZONE : BROWSER_TIME_ZONE;
}
