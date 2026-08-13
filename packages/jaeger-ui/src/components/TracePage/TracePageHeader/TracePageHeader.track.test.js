// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

vi.mock('../../../utils/tracking');

import {
  trackViewChange,
  trackJsonView,
  trackRawJsonView,
  trackSlimHeaderToggle,
  CATEGORY_ALT_VIEW,
  CATEGORY_SLIM_HEADER,
} from './TracePageHeader.track';
import { ETraceViewType } from '../types';
import { trackEvent } from '../../../utils/tracking';
import { OPEN, CLOSE } from '../../../utils/tracking/common';

describe('TracePageHeader.track', () => {
  beforeEach(trackEvent.mockClear);

  it.each(Object.values(ETraceViewType))(
    'trackViewChange(%s) tracks event with enum value as action',
    viewType => {
      trackViewChange(viewType);
      expect(trackEvent).toHaveBeenCalledWith(CATEGORY_ALT_VIEW, viewType);
    }
  );

  it('trackJsonView tracks json action', () => {
    trackJsonView();
    expect(trackEvent).toHaveBeenCalledWith(CATEGORY_ALT_VIEW, 'json');
  });

  it('trackRawJsonView tracks rawJson action', () => {
    trackRawJsonView();
    expect(trackEvent).toHaveBeenCalledWith(CATEGORY_ALT_VIEW, 'rawJson');
  });

  it('trackSlimHeaderToggle tracks open', () => {
    trackSlimHeaderToggle(false);
    expect(trackEvent).toHaveBeenCalledWith(CATEGORY_SLIM_HEADER, OPEN);
  });

  it('trackSlimHeaderToggle tracks close', () => {
    trackSlimHeaderToggle(true);
    expect(trackEvent).toHaveBeenCalledWith(CATEGORY_SLIM_HEADER, CLOSE);
  });
});
