// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as trackingUtils from '../../../utils/tracking';
import {
  CATEGORY_DECORATION_SELECTION,
  CATEGORY_DECORATION_VIEW_DETAILS,
  ACTION_CLEAR,
  ACTION_SET,
  trackDecorationSelected,
  trackDecorationViewDetails,
} from './index.track';

describe('PAD SidePanel tracking', () => {
  let trackEvent;

  beforeAll(() => {
    trackEvent = jest.spyOn(trackingUtils, 'trackEvent').mockImplementation();
  });

  beforeEach(() => {
    trackEvent.mockClear();
  });

  describe('trackDecorationSelected', () => {
    it('tracks decoration selection with label', () => {
      const decoration = 'test decoration ID';
      trackDecorationSelected(decoration);
      expect(trackEvent).toHaveBeenCalledWith(CATEGORY_DECORATION_SELECTION, ACTION_SET, decoration);
    });

    it('tracks decoration cleared', () => {
      trackDecorationSelected();
      expect(trackEvent).toHaveBeenCalledWith(CATEGORY_DECORATION_SELECTION, ACTION_CLEAR);
    });
  });

  describe('trackDecorationViewDetails', () => {
    it('tracks details viewed', () => {
      const truthyArg = { service: 'svc', operation: 'op' };
      trackDecorationViewDetails(truthyArg);
      expect(trackEvent).toHaveBeenCalledWith(CATEGORY_DECORATION_VIEW_DETAILS, ACTION_SET);
    });

    it('tracks details closed', () => {
      trackDecorationViewDetails();
      expect(trackEvent).toHaveBeenCalledWith(CATEGORY_DECORATION_VIEW_DETAILS, ACTION_CLEAR);
    });
  });
});
