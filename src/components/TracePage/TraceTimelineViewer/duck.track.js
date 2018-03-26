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
import { getToggleValue } from '../../../utils/tracking/common';

const ACTION_RESIZE = 'resize';

const CATEGORY_BASE = 'jaeger/ux/trace/timeline';
// export for tests
export const CATEGORY_TAGS = `${CATEGORY_BASE}/tags`;
export const CATEGORY_PROCESS = `${CATEGORY_BASE}/process`;
export const CATEGORY_LOGS = `${CATEGORY_BASE}/logs`;
export const CATEGORY_LOGS_ITEM = `${CATEGORY_BASE}/logs/item`;
export const CATEGORY_COLUMN = `${CATEGORY_BASE}/column`;
export const CATEGORY_PARENT = `${CATEGORY_BASE}/parent`;
export const CATEGORY_ROW = `${CATEGORY_BASE}/row`;

function trackParent(store: Store, action: any) {
  const st = store.getState();
  const { spanID } = action.payload;
  const traceID = st.traceTimeline.traceID;
  const isHidden = st.traceTimeline.childrenHiddenIDs.has(spanID);
  const span = st.trace.traces[traceID].spans.find(sp => sp.spanID === spanID);
  if (span) {
    trackEvent(CATEGORY_PARENT, getToggleValue(!isHidden), span.depth);
  }
}

const logs = (isOpen: boolean) => trackEvent(CATEGORY_LOGS, getToggleValue(isOpen));
const logsItem = (isOpen: boolean) => trackEvent(CATEGORY_LOGS_ITEM, getToggleValue(isOpen));
const process = (isOpen: boolean) => trackEvent(CATEGORY_PROCESS, getToggleValue(isOpen));
const tags = (isOpen: boolean) => trackEvent(CATEGORY_TAGS, getToggleValue(isOpen));
const detailRow = (isOpen: boolean) => trackEvent(CATEGORY_ROW, getToggleValue(isOpen));
const columnWidth = (_, action) =>
  trackEvent(CATEGORY_COLUMN, ACTION_RESIZE, Math.round(action.payload.width * 1000));

const getDetail = (store, action) => store.getState().traceTimeline.detailStates.get(action.payload.spanID);

export const middlewareHooks = {
  [types.CHILDREN_TOGGLE]: trackParent,
  [types.DETAIL_TOGGLE]: (store, action) => detailRow(Boolean(getDetail(store, action))),
  [types.DETAIL_TAGS_TOGGLE]: (store, action) => tags(getDetail(store, action).isTagsOpen),
  [types.DETAIL_PROCESS_TOGGLE]: (store, action) => process(getDetail(store, action).isProcessOpen),
  [types.DETAIL_LOGS_TOGGLE]: (store, action) => logs(getDetail(store, action).logs.isOpen),
  [types.DETAIL_LOG_ITEM_TOGGLE]: (store, action) => {
    const detail = getDetail(store, action);
    const { logItem } = action.payload;
    logsItem(detail.logs.openedItems.has(logItem));
  },
  [types.SET_SPAN_NAME_COLUMN_WIDTH]: columnWidth,
};
