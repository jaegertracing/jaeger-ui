// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { trackAltView, CATEGORY_ALT_VIEW, EAltViewActions } from './index.track';
import * as trackingUtils from '../../../utils/tracking';

describe('SearchResults tracking', () => {
  let trackEvent;

  beforeAll(() => {
    trackEvent = jest.spyOn(trackingUtils, 'trackEvent').mockImplementation();
  });

  beforeEach(() => {
    trackEvent.mockClear();
  });

  it('tracks changes to view', () => {
    const actions = Object.values(EAltViewActions);
    // sanity check
    expect(actions.length).toBeGreaterThan(0);

    actions.forEach(action => {
      trackAltView(action);
      expect(trackEvent).toHaveBeenLastCalledWith(CATEGORY_ALT_VIEW, action);
    });
  });
});
