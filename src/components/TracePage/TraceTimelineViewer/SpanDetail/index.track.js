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

import { actionTypes as types } from '../duck';
import { trackEvent } from '../../../../utils/tracking';

const baseContext = 'jaeger/ux/trace/timeline';

const tagsContext = `${baseContext}/tags`;
const processContext = `${baseContext}/process`;
const logsContext = `${baseContext}/logs`;
const logsItemContext = `${baseContext}/logs/item`;

function getCmd(isOpen: boolean) {
  return isOpen ? 'open' : 'close';
}

export function logs(isOpen: boolean) {
  trackEvent({
    category: logsContext,
    action: getCmd(isOpen),
  });
}

export function logsItem(isOpen: boolean) {
  trackEvent({
    category: logsItemContext,
    action: getCmd(isOpen),
  });
}

export function process(isOpen: boolean) {
  trackEvent({
    category: processContext,
    action: getCmd(isOpen),
  });
}

export function tags(isOpen: boolean) {
  trackEvent({
    category: tagsContext,
    action: getCmd(isOpen),
  });
}

const getDetail = (store, action) => store.getState().traceTimeline.detailStates.get(action.payload.spanID);

export const middlewareHooks = {
  [types.DETAIL_TAGS_TOGGLE]: (store, action) => tags(!getDetail(store, action).isTagsOpen),
  [types.DETAIL_PROCESS_TOGGLE]: (store, action) => process(!getDetail(store, action).isProcessOpen),
  [types.DETAIL_LOGS_TOGGLE]: (store, action) => logs(!getDetail(store, action).logs.isOpen),
  [types.DETAIL_LOG_ITEM_TOGGLE]: (store, action) => {
    const detail = getDetail(store, action);
    const { logItem } = action.payload;
    logsItem(!detail.logs.openedItems.has(logItem));
  },
};
