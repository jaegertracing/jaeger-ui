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

const cmd = 'resize';
const context = 'jaeger/ux/trace/timeline/column';

export default function track(value: number) {
  trackEvent({
    category: context,
    action: cmd,
    value: Math.round(value * 1000),
  });
}

export const middlewareHooks = {
  [types.SET_SPAN_NAME_COLUMN_WIDTH]: (_, action) => track(action.payload.width),
};
