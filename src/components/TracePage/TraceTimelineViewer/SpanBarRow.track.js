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

import type { Store } from 'redux';

import { actionTypes as types } from './duck';
import { trackEvent } from '../../../utils/tracking';

const context = 'jaeger/ux/trace/timeline/parent';

function trackParent(store: Store, action: any) {
  const st = store.getState();
  const { spanID } = action.payload;
  const traceID = st.traceTimeline.traceID;
  const isHidden = st.traceTimeline.childrenHiddenIDs.has(spanID);
  const span = st.trace.traces[traceID].spans.find(sp => sp.spanID === spanID);
  if (span) {
    trackEvent({
      category: context,
      action: isHidden ? 'open' : 'close',
      value: span.depth,
    });
  }
}

// eslint-disable-next-line import/prefer-default-export
export const middlewareHooks = {
  [types.CHILDREN_TOGGLE]: trackParent,
};
