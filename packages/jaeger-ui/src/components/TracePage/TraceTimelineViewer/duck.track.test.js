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
jest.mock('../../../utils/tracking');

import DetailState from './SpanDetail/DetailState';
import * as track from './duck.track';
import { actionTypes as types } from './duck';
import { fetchedState } from '../../../constants';
import { trackEvent } from '../../../utils/tracking';

describe('middlewareHooks', () => {
  const traceID = 'ABC';
  const spanID = 'abc';
  const spanDepth = 123;
  const columnWidth = { real: 0.15, tracked: 150 };
  const payload = { spanID };
  const state = {
    trace: {
      traces: {
        [traceID]: {
          id: traceID,
          data: { spans: [{ spanID, depth: spanDepth }] },
          state: fetchedState.DONE,
        },
      },
    },
    traceTimeline: {
      traceID,
      childrenHiddenIDs: new Map(),
      detailStates: new Map([[spanID, new DetailState()]]),
    },
  };
  const store = {
    getState() {
      return state;
    },
  };

  beforeEach(trackEvent.mockClear);

  const cases = [
    {
      msg: 'tracks a GA event for resizing the span name column',
      type: types.SET_SPAN_NAME_COLUMN_WIDTH,
      payloadCustom: { width: columnWidth.real },
      category: track.CATEGORY_COLUMN,
      extraTrackArgs: [columnWidth.tracked],
    },
    {
      action: track.ACTION_COLLAPSE_ALL,
      category: track.CATEGORY_EXPAND_COLLAPSE,
      msg: 'tracks a GA event for collapsing all',
      type: types.COLLAPSE_ALL,
    },
    {
      action: track.ACTION_COLLAPSE_ONE,
      category: track.CATEGORY_EXPAND_COLLAPSE,
      msg: 'tracks a GA event for collapsing a level',
      type: types.COLLAPSE_ONE,
    },
    {
      msg: 'tracks a GA event for collapsing a parent',
      type: types.CHILDREN_TOGGLE,
      category: track.CATEGORY_PARENT,
      extraTrackArgs: [123],
    },
    {
      action: track.ACTION_EXPAND_ALL,
      category: track.CATEGORY_EXPAND_COLLAPSE,
      msg: 'tracks a GA event for expanding all',
      type: types.COLLAPSE_ALL,
    },
    {
      action: track.ACTION_EXPAND_ONE,
      category: track.CATEGORY_EXPAND_COLLAPSE,
      msg: 'tracks a GA event for expanding a level',
      type: types.COLLAPSE_ONE,
    },
    {
      msg: 'tracks a GA event for toggling a detail row',
      type: types.DETAIL_TOGGLE,
      category: track.CATEGORY_ROW,
    },
    {
      msg: 'tracks a GA event for toggling the span tags',
      type: types.DETAIL_TAGS_TOGGLE,
      category: track.CATEGORY_TAGS,
    },
    {
      msg: 'tracks a GA event for toggling the span tags',
      type: types.DETAIL_PROCESS_TOGGLE,
      category: track.CATEGORY_PROCESS,
    },
    {
      msg: 'tracks a GA event for toggling the span logs view',
      type: types.DETAIL_LOGS_TOGGLE,
      category: track.CATEGORY_LOGS,
    },
    {
      msg: 'tracks a GA event for toggling the span logs view',
      type: types.DETAIL_LOG_ITEM_TOGGLE,
      payloadCustom: { ...payload, logItem: {} },
      category: track.CATEGORY_LOGS_ITEM,
    },
  ];

  cases.forEach(
    ({ action = expect.any(String), msg, type, category, extraTrackArgs = [], payloadCustom = null }) => {
      it(msg, () => {
        const reduxAction = { type, payload: payloadCustom || payload };
        track.middlewareHooks[type](store, reduxAction);
        expect(trackEvent.mock.calls.length).toBe(1);
        expect(trackEvent.mock.calls[0]).toEqual([category, action, ...extraTrackArgs]);
      });
    }
  );

  it('has the correct keys and they refer to functions', () => {
    expect(Object.keys(track.middlewareHooks).sort()).toEqual(
      [
        types.CHILDREN_TOGGLE,
        types.COLLAPSE_ALL,
        types.COLLAPSE_ONE,
        types.DETAIL_TOGGLE,
        types.DETAIL_TAGS_TOGGLE,
        types.DETAIL_PROCESS_TOGGLE,
        types.DETAIL_LOGS_TOGGLE,
        types.DETAIL_LOG_ITEM_TOGGLE,
        types.EXPAND_ALL,
        types.EXPAND_ONE,
        types.SET_SPAN_NAME_COLUMN_WIDTH,
      ].sort()
    );
  });
});
