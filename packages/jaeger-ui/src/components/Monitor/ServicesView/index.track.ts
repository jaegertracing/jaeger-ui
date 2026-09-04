// Copyright (c) 2022 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { trackEvent } from '../../../utils/tracking';

const SPM_CATEGORY_BASE = 'jaeger/ux/trace/spm';

export const CATEGORY_VIEW_ALL_TRACES = `${SPM_CATEGORY_BASE}/view-all-traces`;
export const CATEGORY_SELECT_SERVICE = `${SPM_CATEGORY_BASE}/select-service`;
export const CATEGORY_SELECT_SPAN_KIND = `${SPM_CATEGORY_BASE}/select-span-kind`;
export const CATEGORY_SELECT_TIMEFRAME = `${SPM_CATEGORY_BASE}/select-timeframe`;
export const CATEGORY_SELECT_TAGS = `${SPM_CATEGORY_BASE}/select-tags`;
export const CATEGORY_SEARCH_OPERATION = `${SPM_CATEGORY_BASE}/search-operation`;

export const trackViewAllTraces = () => trackEvent(CATEGORY_VIEW_ALL_TRACES, 'click');
export const trackSelectService = (service: string) => trackEvent(CATEGORY_SELECT_SERVICE, service);
export const trackSelectSpanKind = (spanKind: string) => trackEvent(CATEGORY_SELECT_SPAN_KIND, spanKind);
export const trackSelectTimeframe = (timeframe: string) => trackEvent(CATEGORY_SELECT_TIMEFRAME, timeframe);
export const trackSelectTags = (tags: string) => trackEvent(CATEGORY_SELECT_TAGS, tags);
export const trackSearchOperation = (searchQuery: string) =>
  trackEvent(CATEGORY_SEARCH_OPERATION, searchQuery);
