// Copyright (c) 2020 The Jaeger Authors
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

import {
  formatDuration,
  timeConversion,
  getSuitableTimeUnit,
  convertTimeUnitToShortTerm,
  convertToTimeUnit,
  ONE_MILLISECOND,
  ONE_SECOND,
  ONE_MINUTE,
  ONE_HOUR,
  ONE_DAY,
} from './date.tsx';

describe('formatDuration', () => {
  it('keeps microseconds the same', () => {
    expect(formatDuration(1)).toBe('1μs');
  });

  it('displays a maximum of 2 units and rounds the last one', () => {
    const input = 10 * ONE_DAY + 13 * ONE_HOUR + 30 * ONE_MINUTE;
    expect(formatDuration(input)).toBe('10d 14h');
  });

  it('skips units that are empty', () => {
    const input = 2 * ONE_DAY + 5 * ONE_MINUTE;
    expect(formatDuration(input)).toBe('2d');
  });

  it('displays milliseconds in decimals', () => {
    const input = 2 * ONE_MILLISECOND + 357;
    expect(formatDuration(input)).toBe('2.36ms');
  });

  it('displays seconds in decimals', () => {
    const input = 2 * ONE_SECOND + 357 * ONE_MILLISECOND;
    expect(formatDuration(input)).toBe('2.36s');
  });

  it('displays minutes in split units', () => {
    const input = 2 * ONE_MINUTE + 30 * ONE_SECOND + 555 * ONE_MILLISECOND;
    expect(formatDuration(input)).toBe('2m 31s');
  });

  it('displays hours in split units', () => {
    const input = 2 * ONE_HOUR + 30 * ONE_MINUTE + 30 * ONE_SECOND;
    expect(formatDuration(input)).toBe('2h 31m');
  });

  it('displays times less than a μs', () => {
    const input = 0.1;
    expect(formatDuration(input)).toBe('0.1μs');
  });

  it('displays times of 0', () => {
    const input = 0;
    expect(formatDuration(input)).toBe('0μs');
  });
});

describe('timeConversion', () => {
  it('displays time in nanoseconds', () => {
    const input = 999;
    expect(timeConversion(input)).toBe('999μs');
  });
  it('displays time in milliseconds ', () => {
    const input = 5000;
    expect(timeConversion(input)).toBe('5ms');
  });
  it('displays time in seconds', () => {
    const input = 5000000;
    expect(timeConversion(input)).toBe('5s');
  });
  it('displays time in minutes', () => {
    const input = 120000000;
    expect(timeConversion(input)).toBe('2m');
  });
  it('displays time in hours', () => {
    const input = 7200000000;
    expect(timeConversion(input)).toBe('2h');
  });
  it('displays time in days', () => {
    const input = 172800000000;
    expect(timeConversion(input)).toBe('2d');
  });
});

describe('getSuitableTimeUnit', () => {
  it('time unit should be microseconds', () => {
    const input = 999;
    expect(getSuitableTimeUnit(input)).toBe('microseconds');
  });
  it('time unit should be milliseconds ', () => {
    const input = 5000;
    expect(getSuitableTimeUnit(input)).toBe('milliseconds');
  });
  it('time unit should be seconds', () => {
    const input = 5000000;
    expect(getSuitableTimeUnit(input)).toBe('seconds');
  });
  it('time unit should be minutes', () => {
    const input = 120000000;
    expect(getSuitableTimeUnit(input)).toBe('minutes');
  });
  it('time unit should be hours', () => {
    const input = 7200000000;
    expect(getSuitableTimeUnit(input)).toBe('hours');
  });
  it('time unit should be days', () => {
    const input = 172800000000;
    expect(getSuitableTimeUnit(input)).toBe('days');
  });
});

describe('convertTimeUnitToShortTerm', () => {
  it('convert non-existent timeUnit ', () => {
    const input = 'aaa';
    expect(convertTimeUnitToShortTerm(input)).toBe('');
  });
  it('convert microseconds', () => {
    const input = 'microseconds';
    expect(convertTimeUnitToShortTerm(input)).toBe('μs');
  });

  it('convert milliseconds', () => {
    const input = 'milliseconds';
    expect(convertTimeUnitToShortTerm(input)).toBe('ms');
  });

  it('convert seconds', () => {
    const input = 'seconds';
    expect(convertTimeUnitToShortTerm(input)).toBe('s');
  });
  it('convert minutes', () => {
    const input = 'minutes';
    expect(convertTimeUnitToShortTerm(input)).toBe('m');
  });
  it('convert hours', () => {
    const input = 'hours';
    expect(convertTimeUnitToShortTerm(input)).toBe('h');
  });
  it('convert days', () => {
    const input = 'days';
    expect(convertTimeUnitToShortTerm(input)).toBe('d');
  });
});

describe('convertToTimeUnit', () => {
  it('convert duration to microseconds', () => {
    const input = 999;
    expect(convertToTimeUnit(input, 'microseconds')).toBe(999);
  });
  it('convert duration to milliseconds', () => {
    const input = 5000;
    expect(convertToTimeUnit(input, 'milliseconds')).toBe(5);
  });
  it('convert duration to seconds', () => {
    const input = 5000000;
    expect(convertToTimeUnit(input, 'seconds')).toBe(5);
  });
  it('convert duration to minutes', () => {
    const input = 120000000;
    expect(convertToTimeUnit(input, 'minutes')).toBe(2);
  });
  it('convert duration to hours', () => {
    const input = 7200000000;
    expect(convertToTimeUnit(input, 'hours')).toBe(2);
  });
  it('convert duration to days', () => {
    const input = 172800000000;
    expect(convertToTimeUnit(input, 'days')).toBe(2);
  });
});
