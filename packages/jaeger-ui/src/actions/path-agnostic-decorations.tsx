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
import _identity from 'lodash/identity';
import _memoize from 'lodash/memoize';
import _set from 'lodash/set';
import { createActions, ActionFunctionAny, Action } from 'redux-actions';

import { TNewData, TPathAgnosticDecorationSchema } from '../model/path-agnostic-decorations/types';
import { getConfigValue } from '../utils/config/get-config';
import generateActionTypes from '../utils/generate-action-types';

export const actionTypes = generateActionTypes('@jaeger-ui/PATH_AGNOSTIC_DECORATIONS', [
  'GET_DECORATION',
]);

// TODO new home
export const getDecorationSchema = _memoize((id: string): TPathAgnosticDecorationSchema | undefined => {
  const schemas = getConfigValue('pathAgnosticDecorations') as TPathAgnosticDecorationSchema[];
  if (!schemas) return undefined;
  return schemas.find(s => s.id === id);
});

let doneCount: undefined | number;
let pendingCount: undefined | number;
let pendingData: undefined | TNewData;
let pendingPromise: undefined | Promise<TNewData>;
let resolve: undefined | ((arg: TNewData) => void);

function getDecoration(id: string, service: string, operation?: string) {
  const returnPromise = !resolve || !pendingPromise;
  if (returnPromise) {
    pendingPromise = new Promise<TNewData>(res => {
      resolve = res;
    });
  }

  const schema = getDecorationSchema(id);
  if (!schema) return;

  pendingCount = pendingCount ? pendingCount + 1 : 1;
  const { url, opUrl, valuePath, opValuePath } = schema;
  let promise: Promise<Record<string, any>>;
  let getPath: string;
  let setPath: string;
  if (opValuePath && opUrl && operation) {
    // const promise = fetch(stringSupplant(opUrl, { service, operation }));
    const arbitraryNum = operation.length + service.length;
    // getPath = stringSupplant(opValuePath, ({ service, operation }));
    getPath = opValuePath;
    setPath = `withoutOp.${service}.${operation}`;
    promise = new Promise(res => setTimeout(() => res({ opVal: arbitraryNum }), arbitraryNum * 100));
    // .then(res => _get(res, getPath, `${getPath} not found in response`));
  } else {
    // const promise = fetch(stringSupplant(url, { service }));
    const arbitraryNum = service.length;
    // getPath = stringSupplant(valuePath, ({ service }));
    getPath = valuePath;
    setPath = `withOp.${service}`;
    promise = new Promise(res => setTimeout(() => res({ val: arbitraryNum }), arbitraryNum * 100));
    // .then(res => _get(res, getPath, `${getPath} not found in response`));
  }

  promise.then(res => {
    return _get(res, getPath, `${getPath} not found in response`);
  }).catch(err => {
    return `Unable to fetch data, statusCode: ${err.statusCode}`;
  }).then(value => {
    if (!pendingData) pendingData = {};
    _set(pendingData, setPath, value);
    doneCount = doneCount ? doneCount + 1 : 1;
    if (doneCount === pendingCount) {
      if (resolve) resolve(pendingData);
      else throw new Error('`resolve` unexpectedly undefined');

      doneCount = pendingCount = pendingData = pendingPromise = resolve = undefined;
    };
  });

  if (returnPromise) return pendingPromise;
}

const fullActions = createActions<Promise<TNewData> | undefined>({
  [actionTypes.GET_DECORATION]: getDecoration,
});

export default (fullActions as any).jaegerUi.pathAgnosticDecorations as Record<
  string,
  ActionFunctionAny<Action<Promise<TNewData> | undefined>>
>;
