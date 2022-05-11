// Copyright (c) 2022 Uber Technologies, Inc.
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
  CATEGORY_SEARCH_OPERATION,
  CATEGORY_SELECT_SERVICE,
  CATEGORY_SELECT_TIMEFRAME,
  CATEGORY_VIEW_ALL_TRACES,
  trackSelectService,
  trackSelectTimeframe,
  trackViewAllTraces,
  trackSearchOperation,
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
    expect(trackEvent).toHaveBeenCalledWith(CATEGORY_VIEW_ALL_TRACES, expect.any(String));
  });

  it('trackSelectService calls trackEvent with the match category and show action', () => {
    const serviceName = 'service-name';
    trackSelectService(serviceName);
    expect(trackEvent).toHaveBeenCalledWith(CATEGORY_SELECT_SERVICE, serviceName);
  });

  it('trackSelectTimeframe calls trackEvent with the match category and show action', () => {
    const timeframe = 'some-timeframe';
    trackSelectTimeframe(timeframe);
    expect(trackEvent).toHaveBeenCalledWith(CATEGORY_SELECT_TIMEFRAME, timeframe);
  });

  it('trackSearchOperation calls trackEvent with the match category and show action', async () => {
    const searchQuery = 'name';
    trackSearchOperation(searchQuery);
    expect(trackEvent).toHaveBeenCalledWith(CATEGORY_SEARCH_OPERATION, searchQuery);
  });
});
