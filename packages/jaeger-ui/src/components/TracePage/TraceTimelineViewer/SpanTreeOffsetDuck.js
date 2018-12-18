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

import generateActionTypes from '../../../utils/generate-action-types';

export function newInitialState() {
  return {
    hoverSpanIds: new Set(),
  };
}

export const actionTypes = generateActionTypes('@jaeger-ui/span-tree-offset', [
  'ADD_SPAN_ID',
  'REMOVE_SPAN_ID',
]);

const fullActions = createActions({
  [actionTypes.ADD_SPAN_ID]: spanID => ({ spanID }),
  [actionTypes.REMOVE_SPAN_ID]: spanID => ({ spanID }),
});

export const actions = fullActions.jaegerUi.spanTreeOffset;

function addSpanId(state, { payload }) {
  const { spanID } = payload;
  const newHoverSpanIds = new Set(state.hoverSpanIds);
  newHoverSpanIds.add(spanID);

  return { hoverSpanIds: newHoverSpanIds };
}

function removeSpanId(state, { payload }) {
  const { spanID } = payload;
  const newHoverSpanIds = new Set(state.hoverSpanIds);
  newHoverSpanIds.delete(spanID);

  return { hoverSpanIds: newHoverSpanIds };
}

export default handleActions(
  {
    [actionTypes.ADD_SPAN_ID]: addSpanId,
    [actionTypes.REMOVE_SPAN_ID]: removeSpanId,
  },
  newInitialState()
);
