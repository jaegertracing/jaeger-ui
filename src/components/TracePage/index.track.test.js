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

/* eslint-disable import/first */

jest.mock('lodash/throttle', () => jest.fn(fn => fn));
jest.mock('../../utils/tracking');

import _throttle from 'lodash/throttle';

import {
  ACTION_FILTER_CLEAR,
  ACTION_FILTER_SET,
  ACTION_RANGE_REFRAME,
  ACTION_RANGE_SHIFT,
  CATEGORY_FILTER,
  CATEGORY_RANGE,
  trackFilter,
  trackRange,
} from './index.track';
import { trackEvent } from '../../utils/tracking';

describe('trackFilter', () => {
  beforeEach(() => {
    trackEvent.mockClear();
  });

  it('uses lodash throttle with 750ms and leading: false', () => {
    const calls = _throttle.mock.calls;
    expect(calls.length).toBe(2);
    expect(calls).toEqual([
      [expect.any(Function), 750, { leading: false }],
      [expect.any(Function), 750, { leading: false }],
    ]);
  });

  it('tracks filter set when setting values', () => {
    expect(trackEvent.mock.calls.length).toBe(0);
    trackFilter('abc');
    expect(trackEvent.mock.calls.length).toBe(1);
    expect(trackEvent.mock.calls[0]).toEqual([CATEGORY_FILTER, ACTION_FILTER_SET]);
  });

  it('tracks filter clear when clearing the value', () => {
    expect(trackEvent.mock.calls.length).toBe(0);
    trackFilter();
    expect(trackEvent.mock.calls.length).toBe(1);
    expect(trackEvent.mock.calls[0]).toEqual([CATEGORY_FILTER, ACTION_FILTER_CLEAR]);
  });
});

describe('trackRange', () => {
  beforeEach(() => {
    trackEvent.mockClear();
  });

  const cases = [
    {
      msg: 'returns shift if start is unchanged',
      rangeType: ACTION_RANGE_SHIFT,
      source: `${Math.random()}`,
      from: [0, 0.5],
      to: [0, 0.6],
    },
    {
      msg: 'returns shift if end is unchanged',
      rangeType: ACTION_RANGE_SHIFT,
      source: `${Math.random()}`,
      from: [0, 0.5],
      to: [0.1, 0.5],
    },
    {
      msg: 'returns shift if increasing start and end by same amount',
      rangeType: ACTION_RANGE_SHIFT,
      source: `${Math.random()}`,
      from: [0.25, 0.75],
      to: [0.5, 1],
    },
    {
      msg: 'returns shift if decreasing start and end by same amount',
      rangeType: ACTION_RANGE_SHIFT,
      source: `${Math.random()}`,
      from: [0.25, 0.75],
      to: [0, 0.5],
    },
    {
      msg: 'returns reframe if increasing start and end by different amounts',
      rangeType: ACTION_RANGE_REFRAME,
      source: `${Math.random()}`,
      from: [0.25, 0.75],
      to: [0.35, 1],
    },
    {
      msg: 'returns reframe if decreasing start and end by different amounts',
      rangeType: ACTION_RANGE_REFRAME,
      source: `${Math.random()}`,
      from: [0.25, 0.75],
      to: [0, 0.65],
    },
    {
      msg: 'returns reframe when widening to a superset',
      rangeType: ACTION_RANGE_REFRAME,
      source: `${Math.random()}`,
      from: [0.25, 0.75],
      to: [0, 1],
    },
    {
      msg: 'returns reframe when contracting to a subset',
      rangeType: ACTION_RANGE_REFRAME,
      source: `${Math.random()}`,
      from: [0.25, 0.75],
      to: [0.45, 0.55],
    },
  ];

  cases.forEach(_case => {
    const { msg, rangeType, source, from, to } = _case;

    it(msg, () => {
      expect(trackEvent.mock.calls.length).toBe(0);
      trackRange(source, from, to);
      expect(trackEvent.mock.calls.length).toBe(1);
      expect(trackEvent.mock.calls[0]).toEqual([CATEGORY_RANGE, rangeType, source]);
    });
  });
});
