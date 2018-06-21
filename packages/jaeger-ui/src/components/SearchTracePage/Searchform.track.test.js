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

/* eslint-disable import/first */
jest.mock('../../utils/tracking');

import { trackEvent } from '../../utils/tracking';
import * as track from '../SearchTracePage/SearchForm.track';

describe('middlewareHooks', () => {
  it('tracks a GA event for changing sort criteria', () => {
    const action = { meta: { form: 'sortBy' }, payload: 'MOST_RECENT' };
    track.middlewareHooks[track.FORM_CHANGE_ACTION_TYPE]({}, action);
    expect(trackEvent.mock.calls.length).toBe(1);
    expect(trackEvent.mock.calls[0]).toEqual([track.CATEGORY_SORTBY, expect.any(String)]);
  });
});
