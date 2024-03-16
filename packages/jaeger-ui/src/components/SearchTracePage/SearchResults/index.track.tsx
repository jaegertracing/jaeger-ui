// Copyright (c) 2019 Uber Technologies, Inc.
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
