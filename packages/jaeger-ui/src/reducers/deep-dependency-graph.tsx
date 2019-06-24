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
import { handleActions } from 'redux-actions';

import { actionTypes } from '../actions/deep-dependency-graph';
import { fetchDeepDependencyGraph } from '../actions/jaeger-api';
import { fetchedState } from '../constants';
import { ApiError } from '../types/api-error';
import transformDdgData from '../model/ddg/transformDdgData';
import {
  TDdgActionMeta,
  TDdgAddStylePayload,
  TDdgClearStylePayload,
  TDdgPayload,
  TDdgState,
  TDdgStateEntry,
} from '../model/ddg/types';
import guardReducer, { guardReducerWithMeta } from '../utils/guardReducer';

function newState(
  state: TDdgState,
  service: string,
  operation: string,
  start: number,
  end: number,
  value: TDdgStateEntry
): TDdgState {
  return {
    ...state,
    [service]: {
      ..._get(state, service),
      [operation]: {
        ..._get(state, [service, operation]),
        [start]: {
          ..._get(state, [service, operation, start]),
          [end]: value,
        },
      },
    },
  };
}

export function addStyleState(state: TDdgState, { payload }: { payload: TDdgAddStylePayload }) {
  const { service, operation = '*', start, end, visibilityIndices, style } = payload;
  const stateEntry: TDdgStateEntry | undefined = _get(state, [service, operation, start, end]);
  if (!stateEntry || stateEntry.state !== fetchedState.DONE) {
    console.warn('Cannot set style state for unloaded Deep Dependency Graph'); // eslint-disable-line no-console
    return state;
  }
  const styleStates = new Map(stateEntry.styleStates);
  visibilityIndices.forEach(idx => {
    styleStates.set(idx, (styleStates.get(idx) || 0) | style); // eslint-disable-line no-bitwise
  });
  return newState(state, service, operation, start, end, {
    ...stateEntry,
    styleStates,
  });
}

export function clearStyleState(state: TDdgState, { payload }: { payload: TDdgClearStylePayload }) {
  const { service, operation = '*', start, end, visibilityIndices, style } = payload;
  const stateEntry: TDdgStateEntry | undefined = _get(state, [service, operation, start, end]);
  if (!stateEntry || stateEntry.state !== fetchedState.DONE) {
    console.warn('Cannot change style state for unloaded Deep Dependency Graph'); // eslint-disable-line no-console
    return state;
  }
  const styleStates = new Map(stateEntry.styleStates);
  (visibilityIndices || Array.from(styleStates.keys())).forEach(idx => {
    if (style == null) {
      styleStates.delete(idx);
    } else {
      styleStates.set(idx, (styleStates.get(idx) || 0) & ~style); // eslint-disable-line no-bitwise
      if (styleStates.get(idx) === 0) styleStates.delete(idx);
    }
  });
  return newState(state, service, operation, start, end, {
    ...stateEntry,
    styleStates,
  });
}

export function fetchDeepDependencyGraphStarted(state: TDdgState, { meta }: { meta: TDdgActionMeta }) {
  const { query } = meta;
  const { service, operation = '*', start, end } = query;
  return newState(state, service, operation, start, end, { state: fetchedState.LOADING });
}

export function fetchDeepDependencyGraphDone(
  state: TDdgState,
  { meta, payload }: { meta: TDdgActionMeta; payload: TDdgPayload }
) {
  const { query } = meta;
  const { service, operation, start, end } = query;
  return newState(state, service, operation || '*', start, end, {
    model: transformDdgData(payload, { service, operation }),
    state: fetchedState.DONE,
    styleStates: new Map(),
  });
}

export function fetchDeepDependencyGraphErred(
  state: TDdgState,
  { meta, payload }: { meta: TDdgActionMeta; payload: ApiError }
) {
  const { query } = meta;
  const { service, operation = '*', start, end } = query;
  return newState(state, service, operation, start, end, {
    error: payload,
    state: fetchedState.ERROR,
  });
}

export default handleActions(
  {
    [`${fetchDeepDependencyGraph}_PENDING`]: fetchDeepDependencyGraphStarted,
    [`${fetchDeepDependencyGraph}_FULFILLED`]: guardReducerWithMeta<TDdgState, TDdgPayload, TDdgActionMeta>(
      fetchDeepDependencyGraphDone
    ),
    [`${fetchDeepDependencyGraph}_REJECTED`]: guardReducerWithMeta<TDdgState, ApiError, TDdgActionMeta>(
      fetchDeepDependencyGraphErred
    ),

    [actionTypes.ADD_STYLE_STATE]: guardReducer<TDdgState, { payload: TDdgAddStylePayload }>(addStyleState),
    [actionTypes.CLEAR_STYLE_STATE]: guardReducer<TDdgState, { payload: TDdgClearStylePayload }>(
      clearStyleState
    ),
  },
  {}
);
