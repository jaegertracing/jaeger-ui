// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { trackAltView, trackSearchLatency, CATEGORY_ALT_VIEW, EAltViewActions } from './index.track';
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

  it('tracks search latency as a numeric value', () => {
    trackSearchLatency(1234);
    expect(trackEvent).toHaveBeenLastCalledWith('jaeger/ux/search/results', 'latency', 1234);
  });
});
