// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Action } from 'redux-actions';

export default function guardReducer<TState, TPayload>(fn: (state: TState, value: TPayload) => TState) {
  return function reducer(state: TState, { payload }: Action<TPayload>) {
    if (!payload) {
      return state;
    }
    return fn(state, payload);
  };
}

export function guardReducerWithMeta<TState, TPayload, TMeta>(
  fn: (state: TState, action: { meta: TMeta; payload: TPayload }) => TState
) {
  return function reducer(state: TState, action: Action<TPayload> & { meta: TMeta }) {
    if (!action.payload || !action.meta) {
      return state;
    }
    return fn(state, action as { meta: TMeta; payload: TPayload });
  };
}
