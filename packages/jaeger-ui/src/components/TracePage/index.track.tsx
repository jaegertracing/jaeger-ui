// Copyright (c) 2017 Uber Technologies, Inc.
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

import _throttle from 'lodash/throttle';

import { trackEvent } from '../../utils/tracking';

// export for tests
export const CATEGORY_RANGE = 'jaeger/ux/trace/range';
export const CATEGORY_FILTER = 'jaeger/ux/trace/filter';

// export for tests
export const ACTION_FILTER_SET = 'set';
export const ACTION_FILTER_CLEAR = 'clear';
export const ACTION_RANGE_REFRAME = 'reframe';
export const ACTION_RANGE_SHIFT = 'shift';

const trackFilterSet = _throttle(trackEvent.bind(null, CATEGORY_FILTER, ACTION_FILTER_SET), 750, {
  leading: false,
});

const trackFilterClear = _throttle(trackEvent.bind(null, CATEGORY_FILTER, ACTION_FILTER_CLEAR), 750, {
  leading: false,
});

export const trackFilter = (value: any) => (value ? trackFilterSet() : trackFilterClear());

function getRangeAction(current: [number, number], next: [number, number]) {
  const [curStart, curEnd] = current;
  const [nxStart, nxEnd] = next;
  if (curStart === nxStart || curEnd === nxEnd) {
    return ACTION_RANGE_SHIFT;
  }
  const dStart = (curStart - nxStart).toPrecision(7);
  const dEnd = (curEnd - nxEnd).toPrecision(7);
  if (dStart === dEnd) {
    return ACTION_RANGE_SHIFT;
  }
  return ACTION_RANGE_REFRAME;
}

export function trackRange(source: string, current: [number, number], next: [number, number]) {
  const action = getRangeAction(current, next);
  trackEvent(CATEGORY_RANGE, action, source);
}
