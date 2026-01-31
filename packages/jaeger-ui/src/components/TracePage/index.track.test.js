// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

jest.mock('../../utils/tracking');

import {
  ACTION_FOCUS,
  ACTION_NEXT,
  ACTION_PREV,
  ACTION_RANGE_REFRAME,
  ACTION_RANGE_SHIFT,
  CATEGORY_MATCH_INTERACTIONS,
  CATEGORY_RANGE,
  trackFocusMatches,
  trackNextMatch,
  trackPrevMatch,
  trackRange,
} from './index.track';
import { trackEvent } from '../../utils/tracking';

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

describe('track match interactions', () => {
  const cases = [
    ['focusing matches', ACTION_FOCUS, trackFocusMatches],
    ['viewing next match', ACTION_NEXT, trackNextMatch],
    ['viewing previous match', ACTION_PREV, trackPrevMatch],
  ];

  it.each(cases)('tracks %s', (_msg, action, trackFn) => {
    trackFn();
    expect(trackEvent).toHaveBeenLastCalledWith(CATEGORY_MATCH_INTERACTIONS, action);
  });
});
