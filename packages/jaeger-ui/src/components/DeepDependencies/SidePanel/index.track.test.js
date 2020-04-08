// Copyright (c) 2020 Uber Technologies, Inc.
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
