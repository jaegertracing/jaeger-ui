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

import { middlewareHooks as spanDetails } from '../components/TracePage/TraceTimelineViewer/SpanDetail/index.track';
import { middlewareHooks as spanBarRow } from '../components/TracePage/TraceTimelineViewer/SpanBarRow.track';
import { middlewareHooks as spanDetailRow } from '../components/TracePage/TraceTimelineViewer/SpanDetailRow.track';
import { middlewareHooks as headerRow } from '../components/TracePage/TraceTimelineViewer/TimelineHeaderRow/TimelineHeaderRow.track';
import { isGaEnabled } from '../utils/tracking';

const trackFns = { ...spanDetails, ...spanBarRow, ...spanDetailRow, ...headerRow };

const keysCount = [spanDetails, spanBarRow, spanDetailRow, headerRow].reduce(
  (total, middleware) => total + Object.keys(middleware).length,
  0
);

if (Object.keys(trackFns).length !== keysCount) {
  // eslint-disable-next-line no-console
  console.warn('a redux action type has more than one matching tracker middleware');
}

function trackingMiddleware(store: { getState: () => any }) {
  return function inner(next: any => void) {
    return function core(action: any) {
      const { type } = action;
      if (typeof trackFns[type] === 'function') {
        trackFns[type](store, action);
      }
      return next(action);
    };
  };
}

export default (isGaEnabled ? trackingMiddleware : undefined);
