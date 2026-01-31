// Copyright (c) 2022 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

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
