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

import { formatDuration, ONE_MILLISECOND, ONE_SECOND, ONE_MINUTE, ONE_DAY } from './date.tsx';

describe('formatDuration', () => {
  it('keeps microseconds the same', () => {
    expect(formatDuration(1)).toBe('1μs');
  });

  it('formats values in different durations', () => {
    const input = 13 * ONE_SECOND + 256 * ONE_MILLISECOND + 777;
    expect(formatDuration(input)).toBe('13s 256ms 777μs');
  });

  it('rounds the number of microseconds', () => {
    const input = 256 * ONE_MILLISECOND + 0.7;
    expect(formatDuration(input)).toBe('256ms 1μs');
  });

  it('displays a maximum of 3 units and rounds the last one', () => {
    const input = 10 * ONE_MINUTE + 13 * ONE_SECOND + 256 * ONE_MILLISECOND + 777;
    expect(formatDuration(input)).toBe('10m 13s 257ms');
  });

  it('skips units that are empty', () => {
    const input = 2 * ONE_DAY + 5 * ONE_MINUTE;
    expect(formatDuration(input)).toBe('2d 5m');
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
