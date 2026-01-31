// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

jest.mock('lodash/throttle', () => jest.fn(fn => fn));
jest.mock('../../utils/tracking');

import _throttle from 'lodash/throttle';

import getTrackFilter, { ACTION_FILTER_CLEAR, ACTION_FILTER_SET } from './getTrackFilter';
import { trackEvent } from '.';

describe('getTrackFilter', () => {
  const CATEGORY_FILTER = 'test category filter';
  const trackFilter = getTrackFilter(CATEGORY_FILTER);

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
