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
import * as constants from '../../constants/search-form';
import { trackEvent } from '../../utils/tracking';

export function trackFormInput(
  resultsLimit: number,
  operation: string,
  tags: any,
  minDuration: number,
  maxDuration: number,
  lookback: string
) {
  trackEvent(
    constants.CATEGORY_OPERATION,
    operation === constants.DEFAULT_OPERATION ? constants.ACTION_DEFAULT : constants.ACTION_SET,
    operation
  );
  trackEvent(
    constants.CATEGORY_LIMIT,
    resultsLimit === constants.DEFAULT_LIMIT ? constants.ACTION_DEFAULT : constants.ACTION_SET,
    resultsLimit
  );
  trackEvent(
    constants.CATEGORY_MAX_DURATION,
    maxDuration ? constants.ACTION_SET : constants.ACTION_CLEAR,
    maxDuration
  );
  trackEvent(
    constants.CATEGORY_MIN_DURATION,
    minDuration ? constants.ACTION_SET : constants.ACTION_CLEAR,
    minDuration
  );
  trackEvent(constants.CATEGORY_TAGS, tags ? constants.ACTION_SET : constants.ACTION_CLEAR, tags);
  trackEvent(constants.CATEGORY_LOOKBACK, lookback);
}

export const middlewareHooks = {
  [constants.FORM_CHANGE_ACTION_TYPE]: (store: Store, action: any) => {
    if (action.meta.form === 'sortBy') {
      trackEvent(constants.CATEGORY_SORTBY, action.payload);
    }
  },
};
