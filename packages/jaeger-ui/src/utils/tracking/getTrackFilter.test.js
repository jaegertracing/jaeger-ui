// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

vi.mock('lodash/throttle', () => mockDefault(jest.fn(fn => fn)));
vi.mock('../../utils/tracking');

import _throttle from 'lodash/throttle';

import getTrackFilter, { ACTION_FILTER_CLEAR, ACTION_FILTER_SET } from './getTrackFilter';
import { trackEvent } from '.';

describe('getTrackFilter', () => {
  const CATEGORY_FILTER = 'test category filter';
  let trackFilter;

  // Vitest clears mock call history before each test, so the tracker has to be
  // built inside a hook for the throttle calls it makes to stay observable.
  beforeEach(() => {
    trackFilter = getTrackFilter(CATEGORY_FILTER);
  });

  it('uses lodash throttle with 750ms and leading: false', () => {
    expect(_throttle.mock.calls).toEqual([
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
