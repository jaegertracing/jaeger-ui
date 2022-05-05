// Copyright (c) 2019 Uber Technologies, Inc.
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
  ACTION_SEARCH_OPERATION,
  ACTION_SELECT_SERVICE,
  ACTION_SELECT_TIMEFRAME,
  ACTION_VIEW_ALL_TRACES,
  CATEGORY_SPM,
  trackSearchOperationDebounced,
  trackSelectService,
  trackSelectTimeframe,
  trackViewAllTraces,
} from './index.track';

describe('ServicesView tracking', () => {
  let trackEvent;

  beforeAll(() => {
    trackEvent = jest.spyOn(trackingUtils, 'trackEvent').mockImplementation();
  });

  beforeEach(() => {
    trackEvent.mockClear();
  });

  it('trackViewAllTraces calls trackEvent with the match category and show action', () => {
    trackViewAllTraces();
    expect(trackEvent).toHaveBeenCalledWith(CATEGORY_SPM, ACTION_VIEW_ALL_TRACES);
  });

  it('trackSelectService calls trackEvent with the match category and show action', () => {
    const serviceName = 'service-name';
    trackSelectService(serviceName);
    expect(trackEvent).toHaveBeenCalledWith(CATEGORY_SPM, ACTION_SELECT_SERVICE, serviceName);
  });

  it('trackSelectTimeframe calls trackEvent with the match category and show action', () => {
    const timeframe = 'some-timeframe';
    trackSelectTimeframe(timeframe);
    expect(trackEvent).toHaveBeenCalledWith(CATEGORY_SPM, ACTION_SELECT_TIMEFRAME, timeframe);
  });

  it('trackSearchOperationDebounced calls trackEvent just once with the match category and show action', async () => {
    const debounceTimeout = 1000;
    const searchQuery = 'name';

    for (let i = 0; i < 10; i++) {
      trackSearchOperationDebounced(searchQuery);
    }
    await new Promise(res => setTimeout(res, debounceTimeout));

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith(CATEGORY_SPM, ACTION_SEARCH_OPERATION, searchQuery);
  });
});
