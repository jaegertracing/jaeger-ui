// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

jest.mock('../../../utils/tracking');

import * as track from './TracePageHeader.track'; /* {
  CATEGORY_ALT_VIEW,
  CATEGORY_SLIM_HEADER,
  ACTION_GANTT,
  ACTION_GRAPH,
  ACTION_JSON,
  ACTION_RAW_JSON,
} from './index.track'; */
import { trackEvent } from '../../../utils/tracking';
import { OPEN, CLOSE } from '../../../utils/tracking/common';

describe('TracePageHeader.track', () => {
  beforeEach(trackEvent.mockClear);

  const cases = [
    {
      action: track.ACTION_GANTT,
      category: track.CATEGORY_ALT_VIEW,
      msg: 'tracks a GA event for viewing gantt chart',
      fn: 'trackGanttView',
    },
    {
      action: track.ACTION_GRAPH,
      category: track.CATEGORY_ALT_VIEW,
      msg: 'tracks a GA event for viewing trace graph',
      fn: 'trackGraphView',
    },
    {
      action: track.ACTION_JSON,
      category: track.CATEGORY_ALT_VIEW,
      msg: 'tracks a GA event for viewing trace JSON',
      fn: 'trackJsonView',
    },
    {
      action: track.ACTION_RAW_JSON,
      category: track.CATEGORY_ALT_VIEW,
      msg: 'tracks a GA event for viewing trace JSON (raw)',
      fn: 'trackRawJsonView',
    },
    {
      action: track.ACTION_STATISTICS,
      category: track.CATEGORY_ALT_VIEW,
      msg: 'tracks a GA event for viewing trace statistics',
      fn: 'trackStatisticsView',
    },
    {
      action: track.ACTION_TRACE_SPANS_VIEW,
      category: track.CATEGORY_ALT_VIEW,
      msg: 'tracks a GA event for viewing trace spans table',
      fn: 'trackTraceSpansView',
    },
    {
      action: OPEN,
      arg: false,
      category: track.CATEGORY_SLIM_HEADER,
      msg: 'tracks a GA event for opening slim header',
      fn: 'trackSlimHeaderToggle',
    },
    {
      action: CLOSE,
      arg: true,
      category: track.CATEGORY_SLIM_HEADER,
      msg: 'tracks a GA event for closing slim header',
      fn: 'trackSlimHeaderToggle',
    },
  ];

  cases.forEach(({ action, arg, msg, fn, category }) => {
    it(msg, () => {
      track[fn](arg);
      expect(trackEvent.mock.calls.length).toBe(1);
      expect(trackEvent.mock.calls[0]).toEqual([category, action]);
    });
  });
});
