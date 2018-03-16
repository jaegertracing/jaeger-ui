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

import _get from 'lodash/get';

import type { Store } from 'redux';

import { actionTypes as types } from './duck';
import { trackEvent } from '../../../utils/tracking';
import { getToggleValue } from '../../../utils/tracking/common';
import getEventTracker from '../../../utils/tracking/get-event-tracker';

const ACTION_RESIZE = 'resize';

const CATEGORY_BASE = 'jaeger/ux/trace/timeline';
// export for tests
export const CATEGORY_TAGS = `${CATEGORY_BASE}/tags`;
export const CATEGORY_PROCESS = `${CATEGORY_BASE}/process`;
export const CATEGORY_LOGS = `${CATEGORY_BASE}/logs`;
export const CATEGORY_LOGS_ITEM = `${CATEGORY_BASE}/logs/item`;
export const CATEGORY_COLUMN = `${CATEGORY_BASE}/column`;
export const CATEGORY_PARENT = `${CATEGORY_BASE}parent`;
export const CATEGORY_ROW = `${CATEGORY_BASE}/row`;

const isLogItemOpen = (openedItems, reduxAction) => openedItems.has(reduxAction.payload.logItem);

function getDetailStateConverter(detailPath, transformer: (...any) => boolean = Boolean) {
  return function getAction(store, reduxAction) {
    const { spanID } = reduxAction.payload;
    const detail = store.getState().traceTimeline.detailStates.get(spanID);
    const detailItem = _get(detail, detailPath);
    return getToggleValue(transformer(detailItem, reduxAction));
  };
}

const getColumnWidth = (_, action): number => Math.round(action.payload.width * 1000);

function getDetailRowToggleAction(store, action) {
  const detailIsOpen = store.getState().traceTimeline.detailStates.has(action.payload.spanID);
  return getToggleValue(detailIsOpen);
}

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

export const middlewareHooks = {
  [types.CHILDREN_TOGGLE]: trackParent,
  [types.DETAIL_TOGGLE]: getEventTracker(CATEGORY_ROW, getDetailRowToggleAction),
  [types.DETAIL_TAGS_TOGGLE]: getEventTracker(CATEGORY_TAGS, getDetailStateConverter('isTagsOpen')),
  [types.DETAIL_PROCESS_TOGGLE]: getEventTracker(CATEGORY_PROCESS, getDetailStateConverter('isProcessOpen')),
  [types.DETAIL_LOGS_TOGGLE]: getEventTracker(CATEGORY_LOGS, getDetailStateConverter('logs.isOpen')),
  [types.DETAIL_LOG_ITEM_TOGGLE]: getEventTracker(
    CATEGORY_LOGS_ITEM,
    getDetailStateConverter('logs.openedItems', isLogItemOpen)
  ),
  [types.SET_SPAN_NAME_COLUMN_WIDTH]: getEventTracker(CATEGORY_COLUMN, ACTION_RESIZE, getColumnWidth),
};
