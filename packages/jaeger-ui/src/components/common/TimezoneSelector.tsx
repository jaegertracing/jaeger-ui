// Copyright (c) 2023 The Jaeger Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as React from 'react';
import { Select, Tooltip } from 'antd';
import { IoTimeOutline } from 'react-icons/io5';
import dayjs from 'dayjs';
import { useTimezone } from '../../utils/timezone-context';

import './TimezoneSelector.css';

// Common timezone options
const COMMON_TIMEZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
];

// Get the browser's local timezone
const LOCAL_TIMEZONE = (() => {
  try {
    return dayjs.tz.guess() || 'UTC';
  } catch (e) {
    return 'UTC';
  }
})();

// Add the local timezone to the list if it's not already there
const TIMEZONE_OPTIONS = COMMON_TIMEZONES.includes(LOCAL_TIMEZONE)
  ? COMMON_TIMEZONES
  : [LOCAL_TIMEZONE, ...COMMON_TIMEZONES];

export default function TimezoneSelector() {
  const { timezone, setTimezone } = useTimezone();

  const formatTimezoneOption = (tz: string) => {
    const now = dayjs().tz(tz);
    const offset = now.format('Z');
    const label = tz === LOCAL_TIMEZONE ? `${tz} (Local)` : tz;
    return {
      value: tz,
      label: `${label} (UTC${offset})`,
    };
  };

  return (
    <div className="TimezoneSelector">
      <Tooltip title="Select timezone for displaying timestamps">
        <IoTimeOutline className="TimezoneSelector--icon" />
      </Tooltip>
      <Select
        className="TimezoneSelector--select"
        value={timezone}
        onChange={setTimezone}
        options={TIMEZONE_OPTIONS.map(formatTimezoneOption)}
        dropdownMatchSelectWidth={false}
      />
    </div>
  );
}