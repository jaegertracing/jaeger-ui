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

import * as trackingUtils from '../../../../utils/tracking';
import {
  CATEGORY_VIEW_TRACES,
  CATEGORY_SORT_OPERATIONS,
  trackSortOperations,
  trackViewTraces,
} from './index.track';

describe('operationDetailsTable tracking', () => {
  let trackEvent;

  beforeAll(() => {
    trackEvent = jest.spyOn(trackingUtils, 'trackEvent').mockImplementation();
  });

  beforeEach(() => {
    trackEvent.mockClear();
  });

  it('trackViewTraces calls trackEvent with the match category and show action', () => {
    const traceName = 'trace-name';
    trackViewTraces(traceName);
    expect(trackEvent).toHaveBeenCalledWith(CATEGORY_VIEW_TRACES, traceName);
  });

  it('trackSortOperations calls trackEvent with the match category and show action', () => {
    const sortColumn = 'some-column';
    trackSortOperations(sortColumn);
    expect(trackEvent).toHaveBeenCalledWith(CATEGORY_SORT_OPERATIONS, sortColumn);
  });
});
