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

import { createActions, handleActions } from 'redux-actions';

import generateActionTypes from '../../utils/generate-action-types';

// traceDiff {
//   a: id,
//   b: id
//   cohort: id[],
// }

export function newInitialState() {
  return {
    cohort: [],
    a: null,
    b: null,
  };
}

export const actionTypes = generateActionTypes('@jaeger-ui/trace-diff', [
  'COHORT_ADD_TRACE',
  'COHORT_REMOVE_TRACE',
  'DIFF_SET_A',
  'DIFF_SET_B',
  'FORCE_STATE',
]);

const fullActions = createActions({
  [actionTypes.COHORT_ADD_TRACE]: traceID => ({ traceID }),
  [actionTypes.COHORT_REMOVE_TRACE]: traceID => ({ traceID }),
  [actionTypes.DIFF_SET_A]: traceID => ({ traceID }),
  [actionTypes.DIFF_SET_B]: traceID => ({ traceID }),
  [actionTypes.FORCE_STATE]: newState => ({ newState }),
});

export const actions = fullActions.jaegerUi.traceDiff;

function cohortAddTrace(state, { payload }) {
  const { traceID } = payload;
  const cohort = state.cohort.slice();
  if (cohort.indexOf(traceID) >= 0) {
    return state;
  }
  cohort.push(traceID);
  return { ...state, cohort };
}

function cohortRemoveTrace(state, { payload }) {
  const { traceID } = payload;
  const cohort = state.cohort.slice();
  const i = cohort.indexOf(traceID);
  if (i < 0) {
    return state;
  }
  cohort.splice(i, 1);
  return { ...state, cohort };
}

function diffSetA(state, { payload }) {
  const a = payload.traceID;
  return { ...state, a };
}

function diffSetB(state, { payload }) {
  const b = payload.traceID;
  return { ...state, b };
}

function forceState(state, { payload }) {
  return payload.newState;
}

export default handleActions(
  {
    [actionTypes.COHORT_ADD_TRACE]: cohortAddTrace,
    [actionTypes.COHORT_REMOVE_TRACE]: cohortRemoveTrace,
    [actionTypes.DIFF_SET_A]: diffSetA,
    [actionTypes.DIFF_SET_B]: diffSetB,
    [actionTypes.FORCE_STATE]: forceState,
  },
  newInitialState()
);
