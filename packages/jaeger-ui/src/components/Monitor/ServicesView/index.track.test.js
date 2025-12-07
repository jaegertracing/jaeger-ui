// Copyright (c) 2022 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as trackingUtils from '../../../utils/tracking';
import {
  CATEGORY_SEARCH_OPERATION,
  CATEGORY_SELECT_SERVICE,
  CATEGORY_SELECT_TIMEFRAME,
  CATEGORY_VIEW_ALL_TRACES,
  CATEGORY_SELECT_SPAN_KIND,
  trackSelectService,
  trackSelectSpanKind,
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

  it('trackSelectSpanKind calls trackEvent with the match category and show action', () => {
    const spanKind = 'producer';
    trackSelectSpanKind(spanKind);
    expect(trackEvent).toHaveBeenCalledWith(CATEGORY_SELECT_SPAN_KIND, spanKind);
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
