// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

jest.mock('../../utils/tracking');

import {
  trackFormInput,
  CATEGORY_LIMIT,
  CATEGORY_LOOKBACK,
  CATEGORY_MAX_DURATION,
  CATEGORY_MIN_DURATION,
  CATEGORY_OPERATION,
  CATEGORY_SORTBY,
  CATEGORY_TAGS,
  CATEGORY_SERVICE,
  trackSortByChange,
} from './SearchForm.track';
import { trackEvent } from '../../utils/tracking';

describe('GA tracking', () => {
  it('tracks changing sort criteria', () => {
    trackEvent.mockClear();
    trackSortByChange('MOST_RECENT');
    expect(trackEvent).toHaveBeenCalledWith(CATEGORY_SORTBY, 'MOST_RECENT');
  });

  it('sends form input to GA', () => {
    trackEvent.mockClear();
    trackFormInput(0, '', {}, 0, 0, '', '');
    expect(trackEvent.mock.calls.length).toBe(7);
    const categoriesTracked = trackEvent.mock.calls.map(call => call[0]).sort();
    expect(categoriesTracked).toEqual(
      [
        CATEGORY_OPERATION,
        CATEGORY_LIMIT,
        CATEGORY_TAGS,
        CATEGORY_MAX_DURATION,
        CATEGORY_MIN_DURATION,
        CATEGORY_LOOKBACK,
        CATEGORY_SERVICE,
      ].sort()
    );
  });
});
