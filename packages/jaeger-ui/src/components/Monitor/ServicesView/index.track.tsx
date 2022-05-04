// Copyright (c) 2017 The Jaeger Authors.
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

import _debounce from 'lodash/debounce';
import { trackEvent } from '../../../utils/tracking';

const CATEGORY_SPM = 'jaeger/ux/trace/spm';

const ACTION_SELECT_SERVICE = 'select-service';
const ACTION_SELECT_TIMEFRAME = 'select-timeframe';
const ACTION_VIEW_ALL_TRACES = 'view-all-traces';
const ACTION_SEARCH_OPERATION = 'search-operation';

export const trackViewAllTraces = () => trackEvent(CATEGORY_SPM, ACTION_VIEW_ALL_TRACES);
export const trackSelectService = (service: string) =>
  trackEvent(CATEGORY_SPM, ACTION_SELECT_SERVICE, service);
export const trackSelectTimeframe = (timeframe: string) =>
  trackEvent(CATEGORY_SPM, ACTION_SELECT_TIMEFRAME, timeframe);

export const trackSearchOperationDebounced = _debounce(
  (searchQuery: string) => trackEvent(CATEGORY_SPM, ACTION_SEARCH_OPERATION, searchQuery),
  1500
);
