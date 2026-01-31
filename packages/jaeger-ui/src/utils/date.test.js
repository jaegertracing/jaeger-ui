// Copyright (c) 2020 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import {
  formatDuration,
  getSuitableTimeUnit,
  convertTimeUnitToShortTerm,
  convertToTimeUnit,
  formatRelativeDate,
  ONE_MILLISECOND,
  formatDate,
  formatTime,
  formatDatetime,
  formatMillisecondTime,
  formatSecondTime,
  formatDurationCompact,
} from './date';

const ONE_SECOND = 1000 * ONE_MILLISECOND;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

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

describe('formatRelativeDate', () => {
  let currentTimestamp;
  let currentDate;
  beforeEach(() => {
    // Set a fixed date to avoid issues like https://github.com/jaegertracing/jaeger-ui/issues/2090.
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2023, 7, 19, 10, 30));

    currentTimestamp = Date.now();
    currentDate = new Date(currentTimestamp);
  });

  it('Displays Date MMM-DD-YYYY (Different Year) ', () => {
    const input = new Date(currentTimestamp);
    input.setFullYear(currentDate.getFullYear() - 2);
    expect(formatRelativeDate(input)).toBe('Aug 19, 2021');
  });
  it('Displays Today (Todays date)', () => {
    expect(formatRelativeDate(currentDate)).toBe('Today');
  });
  it('Displays YESTERDAY (Yesterday date)', () => {
    const input = new Date(currentTimestamp);
    input.setDate(currentDate.getDate() - 1);
    expect(formatRelativeDate(input)).toBe('Yesterday');
  });
  it('Displays MMM-DD (Same month different date)', () => {
    const input = new Date(currentTimestamp);
    input.setDate(currentDate.getDate() - 4);
    expect(formatRelativeDate(input)).toBe('Aug 15');
  });
});

describe('format microseconds', () => {
  const dateStr = 'January 1 2000, 10:00:00.000';
  const dateInMilliseconds = Date.parse(dateStr);

  it('formateDate formats microseconds to date', () => {
    const dateInMicroseconds = dateInMilliseconds * ONE_MILLISECOND;
    expect(formatDate(dateInMicroseconds)).toBe('2000-01-01');
  });

  it('formatTime formats microseconds to time', () => {
    const dateInMicroseconds = dateInMilliseconds * ONE_MILLISECOND;
    expect(formatTime(dateInMicroseconds)).toBe('10:00');
  });

  it('formatDateTime formats microseconds to standard date format', () => {
    const dateInMicroseconds = dateInMilliseconds * ONE_MILLISECOND;
    expect(formatDatetime(dateInMicroseconds)).toBe('January 1 2000, 10:00:00.000');
  });

  it('formatMillisecondTime formats microseconds to milliseconds', () => {
    const durationInMicroseconds = 1000 * ONE_MILLISECOND;
    expect(formatMillisecondTime(durationInMicroseconds)).toBe('1000ms');
  });

  it('formatSecondTime formats microseconds to seconds', () => {
    const durationInMicroseconds = 1000 * ONE_MILLISECOND;
    expect(formatSecondTime(durationInMicroseconds)).toBe('1s');
  });
});

describe('formatDurationCompact', () => {
  describe('microseconds', () => {
    it('formats values < 1μs', () => {
      expect(formatDurationCompact(0)).toBe('0μs');
      expect(formatDurationCompact(0.5)).toBe('1μs'); // rounds up
    });

    it('formats small microsecond values', () => {
      expect(formatDurationCompact(1)).toBe('1μs');
      expect(formatDurationCompact(123)).toBe('123μs');
      expect(formatDurationCompact(999)).toBe('999μs');
    });
  });

  describe('milliseconds', () => {
    it('formats values 1-10ms with 2 significant digits', () => {
      expect(formatDurationCompact(1000)).toBe('1.0ms');
      expect(formatDurationCompact(1500)).toBe('1.5ms');
      expect(formatDurationCompact(9999)).toBe('10ms'); // rounds to 10
    });

    it('formats values 10-100ms with 3 significant digits', () => {
      expect(formatDurationCompact(13835)).toBe('13.8ms');
      expect(formatDurationCompact(50000)).toBe('50.0ms');
      expect(formatDurationCompact(99999)).toBe('100ms'); // rounds to 100
    });

    it('formats values 100-1000ms with rounding', () => {
      expect(formatDurationCompact(135842)).toBe('136ms');
      expect(formatDurationCompact(500000)).toBe('500ms');
      expect(formatDurationCompact(999000)).toBe('999ms');
    });
  });

  describe('seconds', () => {
    it('formats values 1-10s with 2 significant digits', () => {
      expect(formatDurationCompact(1000000)).toBe('1.0s');
      expect(formatDurationCompact(1835200)).toBe('1.8s');
      expect(formatDurationCompact(9999000)).toBe('10s');
    });

    it('formats values 10-60s with 3 significant digits', () => {
      expect(formatDurationCompact(15000000)).toBe('15.0s');
      expect(formatDurationCompact(45678000)).toBe('45.7s');
      expect(formatDurationCompact(59999000)).toBe('60.0s');
    });
  });

  describe('minutes', () => {
    it('formats values >= 60s as minutes', () => {
      expect(formatDurationCompact(60000000)).toBe('1.0m');
      expect(formatDurationCompact(150000000)).toBe('2.5m');
      expect(formatDurationCompact(600000000)).toBe('10.0m'); // toPrecision(3) = "10.0"
    });

    it('formats large minute values with appropriate precision', () => {
      expect(formatDurationCompact(3600000000)).toBe('60.0m'); // 1 hour, toPrecision(3) = "60.0"
      expect(formatDurationCompact(7200000000)).toBe('120m'); // 2 hours, rounds
    });
  });

  describe('edge cases', () => {
    it('handles unit boundaries correctly', () => {
      expect(formatDurationCompact(999)).toBe('999μs');
      expect(formatDurationCompact(1000)).toBe('1.0ms');
      expect(formatDurationCompact(999999)).toBe('1000ms');
      expect(formatDurationCompact(1000000)).toBe('1.0s');
    });
  });
});
