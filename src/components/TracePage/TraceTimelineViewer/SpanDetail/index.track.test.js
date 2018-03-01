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
jest.mock('../../../../utils/tracking');

import DetailState from './DetailState';
import * as track from './index.track';
import { actionTypes as types } from '../duck';
import { trackEvent } from '../../../../utils/tracking';

describe('middlewareHooks', () => {
  const spanID = 'abc';
  const state = {
    traceTimeline: {
      detailStates: new Map([[spanID, new DetailState()]]),
    },
  };
  const store = {
    getState() {
      return state;
    },
  };
  const payload = { spanID };

  beforeEach(() => {
    trackEvent.mockClear();
  });

  const cases = [
    {
      msg: 'tracks a GA event for toggling the span tags',
      type: types.DETAIL_TAGS_TOGGLE,
      category: track.tagsContext,
    },
    {
      msg: 'tracks a GA event for toggling the span tags',
      type: types.DETAIL_PROCESS_TOGGLE,
      category: track.processContext,
    },
    {
      msg: 'tracks a GA event for toggling the span logs view',
      type: types.DETAIL_LOGS_TOGGLE,
      category: track.logsContext,
    },
    {
      msg: 'tracks a GA event for toggling the span logs view',
      type: types.DETAIL_LOG_ITEM_TOGGLE,
      payloadCustom: { ...payload, logItem: {} },
      category: track.logsItemContext,
    },
  ];

  it('has the correct keys and they refer to functions', () => {
    expect(Object.keys(track.middlewareHooks).sort()).toEqual(
      [
        types.DETAIL_TAGS_TOGGLE,
        types.DETAIL_PROCESS_TOGGLE,
        types.DETAIL_LOGS_TOGGLE,
        types.DETAIL_LOG_ITEM_TOGGLE,
      ].sort()
    );
  });

  cases.forEach(_case => {
    const { msg, type, category, payloadCustom = null } = _case;
    it(msg, () => {
      const action = { type, payload: payloadCustom || payload };
      track.middlewareHooks[type](store, action);
      expect(trackEvent.mock.calls.length).toBe(1);
      expect(trackEvent.mock.calls[0]).toEqual([
        {
          category,
          action: jasmine.any(String),
        },
      ]);
    });
  });
});
