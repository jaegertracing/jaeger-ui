// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as constants from '../../constants/search-form';
import { trackEvent } from '../../utils/tracking';

export const ACTION_SET = 'set';
export const ACTION_CLEAR = 'clear';
export const ACTION_DEFAULT = 'default';

export const CATEGORY_SORTBY = `jaeger/ux/search/results/sortby`;
export const FORM_CATEGORY_BASE = 'jaeger/ux/search/form';
export const CATEGORY_OPERATION = `${FORM_CATEGORY_BASE}/operation`;
export const CATEGORY_LOOKBACK = `${FORM_CATEGORY_BASE}/lookback`;
export const CATEGORY_TAGS = `${FORM_CATEGORY_BASE}/tags`;
export const CATEGORY_MIN_DURATION = `${FORM_CATEGORY_BASE}/min_duration`;
export const CATEGORY_MAX_DURATION = `${FORM_CATEGORY_BASE}/max_duration`;
export const CATEGORY_LIMIT = `${FORM_CATEGORY_BASE}/limit`;
export const CATEGORY_SERVICE = `${FORM_CATEGORY_BASE}/serviceName`;
export function trackFormInput(
  resultsLimit: number,
  operation: string,
  tags: string,
  minDuration: string | undefined,
  maxDuration: string | undefined,
  lookback: string,
  serviceName: string
) {
  trackEvent(CATEGORY_OPERATION, operation === constants.DEFAULT_OPERATION ? ACTION_DEFAULT : ACTION_SET);
  trackEvent(CATEGORY_LIMIT, resultsLimit === constants.DEFAULT_LIMIT ? ACTION_DEFAULT : ACTION_SET);
  trackEvent(CATEGORY_MAX_DURATION, maxDuration ? ACTION_SET : ACTION_CLEAR);
  trackEvent(CATEGORY_MIN_DURATION, minDuration ? ACTION_SET : ACTION_CLEAR);
  trackEvent(CATEGORY_TAGS, tags ? ACTION_SET : ACTION_CLEAR);
  trackEvent(CATEGORY_LOOKBACK, lookback);
  trackEvent(CATEGORY_SERVICE, serviceName);
}

export function trackSortByChange(sortBy: string) {
  trackEvent(CATEGORY_SORTBY, sortBy);
}
