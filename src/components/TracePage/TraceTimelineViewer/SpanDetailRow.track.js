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

import { actionTypes as types } from './duck';
import { trackEvent } from '../../../utils/tracking';

const context = 'jaeger/ux/trace/timeline/row';

export default function trackRow(isOpen: boolean) {
  trackEvent({
    category: context,
    action: isOpen ? 'open' : 'close',
  });
}

export const middlewareHooks = {
  [types.DETAIL_TOGGLE]: (store, action) =>
    trackRow(!store.getState().traceTimeline.detailStates.has(action.payload.spanID)),
};
