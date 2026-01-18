// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getToggleValue } from '../../../utils/tracking/common';
import { trackEvent } from '../../../utils/tracking';

// export for tests
export const CATEGORY_ALT_VIEW = 'jaeger/ux/trace/alt-view';
export const CATEGORY_SLIM_HEADER = 'jaeger/ux/trace/slim-header';

// export for tests
export const ACTION_GANTT = 'gantt';
export const ACTION_GRAPH = 'graph';
export const ACTION_JSON = 'json';
export const ACTION_RAW_JSON = 'rawJson';
export const ACTION_STATISTICS = 'traceStatistics';
export const ACTION_TRACE_SPANS_VIEW = 'tracesSpansView';

// use a closure instead of bind to prevent forwarding any arguments to trackEvent()
export const trackGanttView = () => trackEvent(CATEGORY_ALT_VIEW, ACTION_GANTT);
export const trackGraphView = () => trackEvent(CATEGORY_ALT_VIEW, ACTION_GRAPH);
export const trackJsonView = () => trackEvent(CATEGORY_ALT_VIEW, ACTION_JSON);
export const trackRawJsonView = () => trackEvent(CATEGORY_ALT_VIEW, ACTION_RAW_JSON);
export const trackStatisticsView = () => trackEvent(CATEGORY_ALT_VIEW, ACTION_STATISTICS);
export const trackTraceSpansView = () => trackEvent(CATEGORY_ALT_VIEW, ACTION_TRACE_SPANS_VIEW);

export const trackSlimHeaderToggle = (isOpen: boolean) =>
  trackEvent(CATEGORY_SLIM_HEADER, getToggleValue(isOpen));
