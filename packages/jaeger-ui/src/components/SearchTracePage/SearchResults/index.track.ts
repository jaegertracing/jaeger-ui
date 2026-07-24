// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { trackEvent } from '../../../utils/tracking';
import type { Microseconds } from '../../../types/units';

export const CATEGORY_ALT_VIEW = 'jaeger/ux/search-results/alt-view';
const CATEGORY_CONVERSIONS = 'jaeger/ux/search-results/conversions';
const CATEGORY_RESULTS = 'jaeger/ux/search/results';
const ACTION_LATENCY = 'latency';

export enum EAltViewActions {
  Ddg = 'ddg',
  Traces = 'traces',
}

export function trackAltView(view: EAltViewActions) {
  trackEvent(CATEGORY_ALT_VIEW, view);
}

export function trackConversions(view: EAltViewActions) {
  trackEvent(CATEGORY_CONVERSIONS, view);
}

/** Report the wall-clock latency of a completed trace search request. */
export function trackSearchLatency(latency: Microseconds) {
  trackEvent(CATEGORY_RESULTS, ACTION_LATENCY, latency);
}
