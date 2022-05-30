// Copyright (c) 2022 The Jaeger Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { trackEvent } from '../../../utils/tracking';

const SPM_CATEGORY_BASE = 'jaeger/ux/trace/spm';

export const CATEGORY_VIEW_ALL_TRACES = `${SPM_CATEGORY_BASE}/view-all-traces`;
export const CATEGORY_SELECT_SERVICE = `${SPM_CATEGORY_BASE}/select-service`;
export const CATEGORY_SELECT_TIMEFRAME = `${SPM_CATEGORY_BASE}/select-timeframe`;
export const CATEGORY_SEARCH_OPERATION = `${SPM_CATEGORY_BASE}/search-operation`;

export const trackViewAllTraces = () => trackEvent(CATEGORY_VIEW_ALL_TRACES, 'click');
export const trackSelectService = (service: string) => trackEvent(CATEGORY_SELECT_SERVICE, service);
export const trackSelectTimeframe = (timeframe: string) => trackEvent(CATEGORY_SELECT_TIMEFRAME, timeframe);
export const trackSearchOperation = (searchQuery: string) =>
  trackEvent(CATEGORY_SEARCH_OPERATION, searchQuery);
