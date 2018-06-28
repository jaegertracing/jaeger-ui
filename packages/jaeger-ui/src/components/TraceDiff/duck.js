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
//   selectedForComparison: id[],
//   a: id,
//   b: id
// }

export function newInitialState() {
  return {
    selectedForComparison: [],
    a: null,
    b: null,
  };
}

export const actionTypes = generateActionTypes('@jaeger-ui/trace-diff', [
  'ADD_COMPARISON',
  'REMOVE_COMPARISON',
  'SET_A',
  'SET_B',
]);

const fullActions = createActions({
  [actionTypes.ADD_COMPARISON]: traceID => ({ traceID }),
  [actionTypes.REMOVE_COMPARISON]: traceID => ({ traceID }),
  [actionTypes.SET_A]: traceID => ({ traceID }),
  [actionTypes.SET_B]: traceID => ({ traceID }),
});

export const actions = fullActions.jaegerUi.traceDiff;

function addComparison(state, { payload }) {
  const { traceID } = payload;
  const selectedForComparison = state.selectedForComparison.slice();
  if (selectedForComparison.indexOf(traceID) >= 0) {
    return state;
  }
  selectedForComparison.push(traceID);
  return { ...state, selectedForComparison };
}

function removeComparison(state, { payload }) {
  const { traceID } = payload;
  const selectedForComparison = state.selectedForComparison.slice();
  const i = selectedForComparison.indexOf(traceID);
  if (i < 0) {
    return state;
  }
  selectedForComparison.splice(i, 1);
  return { ...state, selectedForComparison };
}

function setA(state, { payload }) {
  const a = payload.traceID;
  return { ...state, a };
}

function setB(state, { payload }) {
  const b = payload.traceID;
  return { ...state, b };
}

export default handleActions(
  {
    [actionTypes.ADD_COMPARISON]: addComparison,
    [actionTypes.REMOVE_COMPARISON]: removeComparison,
    [actionTypes.SET_A]: setA,
    [actionTypes.SET_B]: setB,
  },
  newInitialState()
);
