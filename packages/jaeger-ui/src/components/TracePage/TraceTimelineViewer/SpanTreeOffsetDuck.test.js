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

import { createStore } from 'redux';

import reducer, { actions, newInitialState } from './SpanTreeOffsetDuck';

describe('SpanTreeOffsetDuck', () => {
  const existingSpanId = 'existingSpanId';
  const newSpanId = 'newSpanId';

  let store;

  beforeEach(() => {
    store = createStore(reducer, newInitialState());
  });

  it('the initial state has an empty set of hoverSpanIds', () => {
    const state = store.getState();
    expect(state.hoverSpanIds).toEqual(new Set());
  });

  it('adds a spanID to an initial state', () => {
    const action = actions.addSpanId(newSpanId);
    store.dispatch(action);
    expect(store.getState().hoverSpanIds).toEqual(new Set([newSpanId]));
  });

  it('adds a spanID to a populated state', () => {
    store = createStore(reducer, {
      hoverSpanIds: new Set([existingSpanId]),
    });
    const action = actions.addSpanId(newSpanId);
    store.dispatch(action);
    expect(store.getState().hoverSpanIds).toEqual(new Set([existingSpanId, newSpanId]));
  });

  it('should not error when removing a spanID from an initial state', () => {
    const action = actions.removeSpanId(newSpanId);
    store.dispatch(action);
    expect(store.getState().hoverSpanIds).toEqual(new Set());
  });

  it('remove a spanID from a populated state', () => {
    const secondExistingSpanId = 'secondExistingSpanId';
    store = createStore(reducer, {
      hoverSpanIds: new Set([existingSpanId, secondExistingSpanId]),
    });
    const action = actions.removeSpanId(existingSpanId);
    store.dispatch(action);
    expect(store.getState().hoverSpanIds).toEqual(new Set([secondExistingSpanId]));
  });
});
