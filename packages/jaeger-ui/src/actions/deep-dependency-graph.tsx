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

import _identity from 'lodash/identity';
import { createActions } from 'redux-actions';

import { TDdgAddStylePayload, TDdgClearStylePayload } from '../model/ddg/types';
import generateActionTypes from '../utils/generate-action-types';

export const actionTypes = generateActionTypes('@jaeger-ui/DEEP-DEPENDENCY-GRAPH', [
  'ADD_STYLE_STATE',
  'CLEAR_STYLE_STATE',
]);

const addStyleState: (kwarg: TDdgAddStylePayload) => TDdgAddStylePayload = _identity;
const clearStyleState: (kwarg: TDdgClearStylePayload) => TDdgClearStylePayload = _identity;

export const actions = createActions<TDdgAddStylePayload | TDdgClearStylePayload>({
  [actionTypes.ADD_STYLE_STATE]: addStyleState,
  [actionTypes.CLEAR_STYLE_STATE]: clearStyleState,
});
