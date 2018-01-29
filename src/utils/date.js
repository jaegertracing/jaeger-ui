// Copyright (c) 2017 Uber Technologies, Inc.
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

import moment from 'moment';
import _ from 'lodash';

import { toFloatPrecision } from './number';

const TODAY = 'Today';
const YESTERDAY = 'Yesterday';

export const STANDARD_DATE_FORMAT = 'YYYY-MM-DD';
export const STANDARD_TIME_FORMAT = 'HH:mm';
export const STANDARD_DATETIME_FORMAT = 'LLL';
export const ONE_MILLISECOND = 1000;
export const ONE_SECOND = 1000 * ONE_MILLISECOND;
export const DEFAULT_MS_PRECISION = Math.log10(ONE_MILLISECOND);

/**
 * @param {number} timestamp
 * @param {number} initialTimestamp
 * @param {number} totalDuration
 * @return {number} 0-100 percentage
 */
export function getPercentageOfDuration(duration, totalDuration) {
  return duration / totalDuration * 100;
}

const quantizeDuration = (duration, floatPrecision, conversionFactor) =>
  toFloatPrecision(duration / conversionFactor, floatPrecision) * conversionFactor;

/**
 * @param {number} duration (in microseconds)
 * @return {string} formatted, unit-labelled string with time in milliseconds
 */
export function formatDate(duration) {
  return moment(duration / ONE_MILLISECOND).format(STANDARD_DATE_FORMAT);
}

/**
 * @param {number} duration (in microseconds)
 * @return {string} formatted, unit-labelled string with time in milliseconds
 */
export function formatTime(duration) {
  return moment(duration / ONE_MILLISECOND).format(STANDARD_TIME_FORMAT);
}

/**
 * @param {number} duration (in microseconds)
 * @return {string} formatted, unit-labelled string with time in milliseconds
 */
export function formatDatetime(duration) {
  return moment(duration / ONE_MILLISECOND).format(STANDARD_DATETIME_FORMAT);
}

/**
 * @param {number} duration (in microseconds)
 * @return {string} formatted, unit-labelled string with time in milliseconds
 */
export function formatMillisecondTime(duration) {
  const targetDuration = quantizeDuration(duration, DEFAULT_MS_PRECISION, ONE_MILLISECOND);
  return `${moment.duration(targetDuration / ONE_MILLISECOND).asMilliseconds()}ms`;
}

/**
 * @param {number} duration (in microseconds)
 * @return {string} formatted, unit-labelled string with time in seconds
 */
export function formatSecondTime(duration) {
  const targetDuration = quantizeDuration(duration, DEFAULT_MS_PRECISION, ONE_SECOND);
  return `${moment.duration(targetDuration / ONE_MILLISECOND).asSeconds()}s`;
}

/**
 * Humanizes the duration based on the inputUnit
 *
 * Example:
 * 5000ms => 5s
 * 1000μs => 1ms
 */
export function formatDuration(duration, inputUnit = 'microseconds') {
  let d = duration;
  if (inputUnit === 'microseconds') {
    d = duration / 1000;
  }
  let units = 'ms';
  if (d >= 1000) {
    units = 's';
    d /= 1000;
  }
  return _.round(d, 2) + units;
}

export function formatRelativeDate(value) {
  const m = !(value instanceof moment) ? moment(value) : value;
  const dt = new Date();
  if (dt.getFullYear() !== m.year()) {
    return m.format('MMM D, YYYY');
  }
  const mMonth = m.month();
  const mDate = m.date();
  const date = dt.getDate();
  if (mMonth === dt.getMonth() && mDate === date) {
    return TODAY;
  }
  dt.setDate(date - 1);
  if (mMonth === dt.getMonth() && mDate === dt.getDate()) {
    return YESTERDAY;
  }
  return m.format('MMM D');
}
