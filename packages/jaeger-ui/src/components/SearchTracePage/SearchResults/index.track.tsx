// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { trackEvent } from '../../../utils/tracking';

// export for tests
export const CATEGORY_ALT_VIEW = 'jaeger/ux/search-results/alt-view';
export const CATEGORY_CONVERSIONS = 'jaeger/ux/search-results/conversions';

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
