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
import queryString from 'query-string';
import { createActions } from 'redux-actions';

import { TDdgActionMeta, TDdgAddStyleAction, TDdgClearStyleAction } from '../model/ddg/types';
import generateActionTypes from '../utils/generate-action-types';

type TActionTypes = TDdgAddStyleAction | TDdgClearStyleAction;

export const actionTypes = generateActionTypes('@jaeger-ui/DEEP-DEPENDENCY-GRAPH', [
  'ADD_STYLE_STATE',
  'CLEAR_STYLE_STATE',
]);

const addStyleState: (kwarg: TDdgAddStyleAction) => TDdgAddStyleAction = _identity;
const clearStyleState: (kwarg: TDdgClearStyleAction) => TDdgClearStyleAction = _identity;

function firstParam(arg: string | string[]): string {
  if (Array.isArray(arg)) {
    const returnVal = arg[0];
    console.warn(`Found multiple query parameters: "${arg}", using "${returnVal}"`); // eslint-disable-line no-console
    return returnVal;
  }
  return arg;
}

export const extractMeta = (): TDdgActionMeta => {
  const { service, operation, start, end } = queryString.parse(window.location.search);
  if (service == null) {
    throw new Error('Service name unavailable when trying to change style state');
  }
  if (start == null) {
    throw new Error('Start time unavailable when trying to change style state');
  }
  if (end == null) {
    throw new Error('End time unavailable when trying to change style state');
  }
  return {
    query: {
      service: firstParam(service),
      operation: operation && firstParam(operation),
      start: Number.parseInt(firstParam(start), 10),
      end: Number.parseInt(firstParam(end), 10),
    },
  };
};

export const actions = createActions<TActionTypes, TDdgActionMeta>({
  [actionTypes.ADD_STYLE_STATE]: [addStyleState, extractMeta],
  [actionTypes.CLEAR_STYLE_STATE]: [clearStyleState, extractMeta],
});
