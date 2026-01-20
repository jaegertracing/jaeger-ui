// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { trackEvent } from '../../../utils/tracking';

// export for tests
export const CATEGORY_DECORATION_SELECTION = 'jaeger/ux/ddg/decoration-selection';
export const CATEGORY_DECORATION_VIEW_DETAILS = 'jaeger/ux/ddg/decoration-view-details';

// export for tests
export const ACTION_CLEAR = 'clear';
export const ACTION_SET = 'set';

export function trackDecorationSelected(decoration?: string) {
  if (decoration) trackEvent(CATEGORY_DECORATION_SELECTION, ACTION_SET, decoration);
  else trackEvent(CATEGORY_DECORATION_SELECTION, ACTION_CLEAR);
}

export function trackDecorationViewDetails(value?: unknown) {
  if (value) trackEvent(CATEGORY_DECORATION_VIEW_DETAILS, ACTION_SET);
  else trackEvent(CATEGORY_DECORATION_VIEW_DETAILS, ACTION_CLEAR);
}
