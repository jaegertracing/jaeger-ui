// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import dayjs, { ConfigType, Dayjs } from 'dayjs';
import _dropWhile from 'lodash/dropWhile';
import _round from 'lodash/round';
import _duration, { DurationUnitType } from 'dayjs/plugin/duration';
import _relativeTime from 'dayjs/plugin/relativeTime';
import _timezone from 'dayjs/plugin/timezone';
import _utc from 'dayjs/plugin/utc';

import { toFloatPrecision } from './number';
import { Microseconds } from '../types/units';

dayjs.extend(_duration);
dayjs.extend(_relativeTime);
dayjs.extend(_utc);
dayjs.extend(_timezone);

/** Time zone setting values: 'browser', 'utc', or an IANA name such as 'Europe/Berlin'. */
export const BROWSER_TIME_ZONE = 'browser';
export const UTC_TIME_ZONE = 'utc';

// The zone timestamps are displayed in. null means the browser's local zone,
// which is what dayjs uses by default.
let displayTimeZone: string | null = null;

export function isValidTimeZone(zone: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Sets the zone used by all timestamp formatting helpers. Unknown zone names
 * fall back to the browser's local zone.
 */
export function setDisplayTimeZone(setting?: string | null): void {
  const normalized = setting?.trim().toLowerCase();
  if (!normalized || normalized === BROWSER_TIME_ZONE) {
    displayTimeZone = null;
  } else if (normalized === UTC_TIME_ZONE) {
    displayTimeZone = 'UTC';
  } else if (setting && isValidTimeZone(setting.trim())) {
    displayTimeZone = setting.trim();
  } else {
    // eslint-disable-next-line no-console
    console.warn(`Unknown time zone "${setting}", using the browser's time zone`);
    displayTimeZone = null;
  }
}

/** @return the IANA name of the display zone, or null for the browser's local zone */
export function getDisplayTimeZone(): string | null {
  return displayTimeZone;
}

/** @return the browser's local IANA zone name, e.g. 'Europe/Berlin' */
export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Converts a timestamp in milliseconds (or anything dayjs accepts) into a
 * dayjs object in the display time zone. Omit the value for the current time.
 */
export function toDisplayTime(value?: ConfigType): Dayjs {
  const m = dayjs.isDayjs(value) ? value : dayjs(value);
  if (displayTimeZone === null) {
    return m;
  }
  if (displayTimeZone === 'UTC') {
    return m.utc();
  }
  return m.tz(displayTimeZone);
}

/** Parses a wall-clock string such as '2026-10-07 13:45' as a time in the display time zone. */
export function parseDisplayTime(text: string): Dayjs {
  if (displayTimeZone === null) {
    return dayjs(text);
  }
  if (displayTimeZone === 'UTC') {
    return dayjs.utc(text);
  }
  return dayjs.tz(text, displayTimeZone);
}

/**
 * @param value - timestamp in milliseconds, defaults to now (the offset can differ with DST)
 * @return the display zone's UTC offset, e.g. 'UTC' or 'UTC+05:30'
 */
export function formatTimeZoneOffset(value?: ConfigType): string {
  if (displayTimeZone === 'UTC') {
    return 'UTC';
  }
  return `UTC${toDisplayTime(value).format('Z')}`;
}

/**
 * @param value - timestamp in milliseconds, defaults to now
 * @return the display zone's name and offset, e.g. 'Asia/Kolkata (UTC+05:30)'
 */
export function formatTimeZoneLabel(value?: ConfigType): string {
  if (displayTimeZone === 'UTC') {
    return 'UTC';
  }
  return `${displayTimeZone ?? getBrowserTimeZone()} (${formatTimeZoneOffset(value)})`;
}

const TODAY = 'Today';
const YESTERDAY = 'Yesterday';

export const STANDARD_DATE_FORMAT = 'YYYY-MM-DD';
export const STANDARD_TIME_FORMAT = 'HH:mm';
export const STANDARD_DATETIME_FORMAT = 'MMMM D YYYY, HH:mm:ss.SSS';

/** @constant 1ms as the number of microseconds, which is the precision of Jaeger timestamps */
export const ONE_MILLISECOND = 1000 * 1;

const ONE_SECOND = 1000 * ONE_MILLISECOND;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

const DEFAULT_MS_PRECISION = Math.log10(ONE_MILLISECOND);

const UNIT_STEPS: { unit: string; microseconds: number; ofPrevious: number }[] = [
  { unit: 'd', microseconds: ONE_DAY, ofPrevious: 24 },
  { unit: 'h', microseconds: ONE_HOUR, ofPrevious: 60 },
  { unit: 'm', microseconds: ONE_MINUTE, ofPrevious: 60 },
  { unit: 's', microseconds: ONE_SECOND, ofPrevious: 1000 },
  { unit: 'ms', microseconds: ONE_MILLISECOND, ofPrevious: 1000 },
  { unit: 'μs', microseconds: 1, ofPrevious: 1000 },
];

type ShortTimeUnit = 'μs' | 'ms' | 's' | 'm' | 'h' | 'd';
type LongTimeUnit = 'microseconds' | 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days';

const timeUnitToShortTermMapper: {
  [key in LongTimeUnit]: ShortTimeUnit;
} = {
  microseconds: 'μs',
  milliseconds: 'ms',
  seconds: 's',
  minutes: 'm',
  hours: 'h',
  days: 'd',
} as const;

/**
 * @param {number} timestamp
 * @param {number} initialTimestamp
 * @param {number} totalDuration
 * @return {number} 0-100 percentage
 */
export function getPercentageOfDuration(duration: number, totalDuration: number): number {
  return (duration / totalDuration) * 100;
}

const quantizeDuration = (duration: number, floatPrecision: number, conversionFactor: number): number =>
  toFloatPrecision(duration / conversionFactor, floatPrecision) * conversionFactor;

/**
 * @param {number} duration - Unix Time
 * @return {string} formatted, unit-labelled string with time in milliseconds
 *
 * @example
 * ```
 * formatDate(0) // => 1970-01-01
 * ```
 */
export function formatDate(duration: number): string {
  return toDisplayTime(duration / ONE_MILLISECOND).format(STANDARD_DATE_FORMAT);
}

/**
 * @param {number} duration - Unix Time
 * @return {string} formatted, unit-labelled string with time in milliseconds
 *
 * @example
 * ```
 * formatTime(0) // => 00:00
 * ```
 */
export function formatTime(duration: number): string {
  return toDisplayTime(duration / ONE_MILLISECOND).format(STANDARD_TIME_FORMAT);
}

/**
 * @param {number} duration - Unix Time
 * @return {string} formatted, unit-labelled string with time in milliseconds
 *
 * @example
 * ```
 * formatDatetime(0) // => January 1 1970, 00:00:00.000
 * ```
 */
export function formatDatetime(duration: number): string {
  return toDisplayTime(duration / ONE_MILLISECOND).format(STANDARD_DATETIME_FORMAT);
}

/**
 * @param duration - Unix timestamp in microseconds
 * @return relative, human-readable time string
 *
 * @example
 * ```
 * formatRelativeTime(Date.now() * 1000) // => 'a few seconds ago'
 * ```
 */
export function formatRelativeTime(duration: Microseconds): string {
  return dayjs(duration / ONE_MILLISECOND).fromNow();
}

/**
 * @param {number} duration - Unix Time
 * @return {string} formatted, unit-labelled string with time in milliseconds
 *
 * @example
 * ```
 * formatMillisecondTime(1_000) // => 1ms
 * formatMillisecondTime(10_000) // => 10ms
 * ```
 */
export function formatMillisecondTime(duration: number): string {
  const targetDuration = quantizeDuration(duration, DEFAULT_MS_PRECISION, ONE_MILLISECOND);
  return `${dayjs.duration(targetDuration / ONE_MILLISECOND).asMilliseconds()}ms`;
}

/**
 * @param {number} duration - Unix Time
 * @return {string} formatted, unit-labelled string with time in seconds
 *
 * @example
 * ```
 * formatSecondTime(1_000_000) // => 1s
 * formatSecondTime(10_000_000) // => 10s
 * ```
 */
export function formatSecondTime(duration: number): string {
  const targetDuration = quantizeDuration(duration, DEFAULT_MS_PRECISION, ONE_SECOND);
  return `${dayjs.duration(targetDuration / ONE_MILLISECOND).asSeconds()}s`;
}

/**
 * Humanizes a duration for display with up to two units.
 * Shows both primary and secondary units when applicable (e.g., "2d 3h").
 * For decimal-based units (μs, ms, s), displays as a decimal (e.g., "2.36ms").
 *
 * Use this function ONLY when maximum precision matters — specifically for relative
 * offset comparisons where small differences between consecutive values are meaningful
 * (e.g., event timestamps, relative start times shown side-by-side). For standalone
 * latency measurements (span durations, trace durations, axis labels), use
 * `formatDurationCompact` instead.
 *
 * @param duration - Duration in microseconds
 * @returns Formatted string with up to 2 units (e.g., "2.36ms", "2d 3h")
 *
 * @example
 * formatDuration(2357) // => "2.36ms"
 * formatDuration(183840000000) // => "2d 3h"
 */
export function formatDuration(duration: Microseconds): string {
  const selectUnits = (value: number) =>
    _dropWhile(
      UNIT_STEPS,
      ({ microseconds }, index) => index < UNIT_STEPS.length - 1 && microseconds > value
    );

  const [primaryUnit, secondaryUnit] = selectUnits(duration);

  if (primaryUnit.ofPrevious === 1000) {
    return `${_round(duration / primaryUnit.microseconds, 2)}${primaryUnit.unit}`;
  }

  const roundedDuration = Math.round(duration / secondaryUnit.microseconds) * secondaryUnit.microseconds;
  const [carriedPrimaryUnit, carriedSecondaryUnit] = selectUnits(roundedDuration);

  const primaryValue = Math.floor(roundedDuration / carriedPrimaryUnit.microseconds);
  const primaryUnitString = `${primaryValue}${carriedPrimaryUnit.unit}`;
  const secondaryValue =
    Math.round(roundedDuration / carriedSecondaryUnit.microseconds) % carriedPrimaryUnit.ofPrevious;
  const secondaryUnitString = `${secondaryValue}${carriedSecondaryUnit.unit}`;
  return secondaryValue === 0 ? primaryUnitString : `${primaryUnitString} ${secondaryUnitString}`;
}

export function formatRelativeDate(value: ConfigType, fullMonthName = false): string {
  const m = toDisplayTime(value);
  const now = toDisplayTime();

  const monthFormat = fullMonthName ? 'MMMM' : 'MMM';
  if (now.year() !== m.year()) {
    return m.format(`${monthFormat} D, YYYY`);
  }
  const day = m.format(STANDARD_DATE_FORMAT);
  if (day === now.format(STANDARD_DATE_FORMAT)) {
    return TODAY;
  }
  if (day === now.subtract(1, 'day').format(STANDARD_DATE_FORMAT)) {
    return YESTERDAY;
  }
  return m.format(`${monthFormat} D`);
}

export const getSuitableTimeUnit = (microseconds: number): LongTimeUnit => {
  if (microseconds < 1000) {
    return 'microseconds';
  }

  const durationInMilliseconds = dayjs.duration(microseconds / 1000, 'ms');

  const longUnitsDescending: Exclude<LongTimeUnit, 'microseconds'>[] = [
    'days',
    'hours',
    'minutes',
    'seconds',
    'milliseconds',
  ];

  return longUnitsDescending.find(timeUnit => {
    const durationInTimeUnit = durationInMilliseconds.as(timeUnit);

    return durationInTimeUnit >= 1;
  })!;
};

export function convertTimeUnitToShortTerm(timeUnit: LongTimeUnit): ShortTimeUnit | '' {
  return timeUnitToShortTermMapper[timeUnit] ?? '';
}

export function convertToTimeUnit(microseconds: number, targetTimeUnit: string): number {
  if (microseconds < 1000) {
    return microseconds;
  }

  return dayjs.duration(microseconds / 1000, 'ms').as(targetTimeUnit as DurationUnitType);
}

/**
 * Formats a duration in microseconds to a compact string with 3 significant digits.
 * Use this for all standalone latency displays: span durations, trace durations, axis
 * labels, table cells. Prefer this over `formatDuration` unless you specifically need
 * the higher precision for relative offset comparisons.
 *
 * @param microseconds - Duration in microseconds
 * @returns Formatted string with 3 significant digits and appropriate unit (μs, ms, s, m)
 *
 * @example
 * formatDurationCompact(123) // => "123μs"
 * formatDurationCompact(13835) // => "13.8ms"
 * formatDurationCompact(135842) // => "136ms"
 * formatDurationCompact(1835200) // => "1.84s"
 */
export function formatDurationCompact(microseconds: Microseconds): string {
  if (microseconds < 1000) {
    return `${Math.round(microseconds)}μs`;
  }

  const ms = microseconds / 1000;
  if (ms < 1000) {
    // Format to 3 significant digits
    const formatted = ms < 10 ? ms.toPrecision(2) : ms < 100 ? ms.toPrecision(3) : Math.round(ms);
    return `${formatted}ms`;
  }

  const s = ms / 1000;
  if (s < 60) {
    const formatted = s < 10 ? s.toPrecision(2) : s < 100 ? s.toPrecision(3) : Math.round(s);
    return `${formatted}s`;
  }

  const m = s / 60;
  const formatted = m < 10 ? m.toPrecision(2) : m < 100 ? m.toPrecision(3) : Math.round(m);
  return `${formatted}m`;
}
