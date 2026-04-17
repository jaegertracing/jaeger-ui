// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { handleActions } from 'redux-actions';

import { fetchDeepDependencyGraph } from '../actions/jaeger-api';
import { fetchedState } from '../constants';
import { ApiError } from '../types/api-error';
import getStateEntryKey from '../model/ddg/getStateEntryKey';
import transformDdgData from '../model/ddg/transformDdgData';
import { TDdgActionMeta, TDdgModel, TDdgPayload } from '../model/ddg/types';
import TDdgState from '../types/TDdgState';
import guardReducer, { guardReducerWithMeta } from '../utils/guardReducer';

interface IDoneState {
  state: typeof fetchedState.DONE;
  model: TDdgModel;
}

export function fetchDeepDependencyGraphStarted(state: TDdgState, { meta }: { meta: TDdgActionMeta }) {
  const { query } = meta;
  const key = getStateEntryKey(query);
  return {
    ...state,
    [key]: {
      state: fetchedState.LOADING,
    },
  };
}

export function fetchDeepDependencyGraphDone(
  state: TDdgState,
  { meta, payload }: { meta: TDdgActionMeta; payload: TDdgPayload }
) {
  const { query } = meta;
  const { service, operation } = query;
  const key = getStateEntryKey(query);
  return {
    ...state,
    [key]: {
      model: transformDdgData(payload, { service, operation }),
      state: fetchedState.DONE,
    },
  };
}

export function fetchDeepDependencyGraphErred(
  state: TDdgState,
  { meta, payload }: { meta: TDdgActionMeta; payload: ApiError }
) {
  const { query } = meta;
  const key = getStateEntryKey(query);
  return {
    ...state,
    [key]: {
      error: payload,
      state: fetchedState.ERROR,
    },
  };
}

export default handleActions<TDdgState, any>(
  {
    [`${fetchDeepDependencyGraph}_PENDING`]: fetchDeepDependencyGraphStarted as any,
    [`${fetchDeepDependencyGraph}_FULFILLED`]: guardReducerWithMeta<TDdgState, TDdgPayload, TDdgActionMeta>(
      fetchDeepDependencyGraphDone
    ),
    [`${fetchDeepDependencyGraph}_REJECTED`]: guardReducerWithMeta<TDdgState, ApiError, TDdgActionMeta>(
      fetchDeepDependencyGraphErred
    ),
  },
  {}
);
