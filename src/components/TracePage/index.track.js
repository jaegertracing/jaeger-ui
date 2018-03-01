// @flow

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
export const rangeContext = 'jaeger/ux/trace/range';
export const filterContext = 'jaeger/ux/trace/range';

// export for tests
export const FILTER_SET = 'set';
export const FILTER_CLEAR = 'clear';
// export for tests
export const RANGE_REFRAME = 'reframe';
export const RANGE_SCROLL = 'scroll';
export const RANGE_SHIFT = 'shift';

const rangeCmds = [RANGE_REFRAME, RANGE_SCROLL, RANGE_SHIFT];

function trackFilterImpl(cmd: string) {
  trackEvent({
    category: filterContext,
    action: cmd,
  });
}

const trackFilterSet = _throttle(() => trackFilterImpl(FILTER_SET), 750, { leading: false });

const trackFilterClear = _throttle(() => trackFilterImpl(FILTER_CLEAR), 750, { leading: false });

export function trackFilter(value: any) {
  if (value) {
    trackFilterSet();
  } else {
    trackFilterClear();
  }
}

export function getRangeCmd(current: [number, number], next: [number, number]) {
  const [curStart, curEnd] = current;
  const [nxStart, nxEnd] = next;
  if (curStart === nxStart || curEnd === nxEnd) {
    return RANGE_SHIFT;
  }
  const dStart = (curStart - nxStart).toPrecision(7);
  const dEnd = (curEnd - nxEnd).toPrecision(7);
  if (dStart === dEnd) {
    return RANGE_SHIFT;
  }
  return RANGE_REFRAME;
}

export function trackRange(cmd: string, src: string) {
  if (rangeCmds.indexOf(cmd) < 0) {
    // eslint-disable-next-line no-console
    console.error(`Invalid track cmd: ${cmd}`);
    return;
  }
  trackEvent({
    category: rangeContext,
    action: cmd,
    label: src,
  });
}
