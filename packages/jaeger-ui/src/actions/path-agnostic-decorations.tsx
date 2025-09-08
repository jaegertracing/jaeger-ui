// Copyright (c) 2020 Uber Technologies, Inc.
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
import _memoize from 'lodash/memoize';
import _set from 'lodash/set';
import memoize from 'lru-memoize';
import { createActions, ActionFunctionAny, Action } from 'redux-actions';

import JaegerAPI from '../api/jaeger';
import { TNewData, TPathAgnosticDecorationSchema } from '../model/path-agnostic-decorations/types';
import { getConfigValue } from '../utils/config/get-config';
import generateActionTypes from '../utils/generate-action-types';
import stringSupplant from '../utils/stringSupplant';

// wrapping JaegerAPI.fetchDecoration is necessary for tests to properly mock inside memoization
const fetchDecoration = memoize(10)((url: string) => JaegerAPI.fetchDecoration(url));

export const actionTypes = generateActionTypes('@jaeger-ui/PATH_AGNOSTIC_DECORATIONS', ['GET_DECORATION']);

export const getDecorationSchema = _memoize((id: string): TPathAgnosticDecorationSchema | undefined => {
  const schemas = getConfigValue('pathAgnosticDecorations') as TPathAgnosticDecorationSchema[] | undefined;
  if (!schemas) return undefined;
  return schemas.find(s => s.id === id);
});

let doneCount: undefined | number;
let pendingCount: undefined | number;
let pendingData: undefined | TNewData;
let pendingPromise: undefined | Promise<TNewData>;
let resolve: undefined | ((arg: TNewData) => void);

// Bespoke memoization-adjacent solution necessary as this should return `undefined`, not an old promise, on
// duplicate calls
// exported for tests
export const _processed = new Map<string, Map<string, Set<string | undefined>>>();

export function getDecoration(
  id: string,
  service: string,
  operation?: string
): Promise<TNewData> | undefined {
  const processedID = _processed.get(id);
  if (!processedID) {
    _processed.set(id, new Map<string, Set<string | undefined>>([[service, new Set([operation])]]));
  } else {
    const processedService = processedID.get(service);
    if (!processedService) processedID.set(service, new Set([operation]));
    else if (!processedService.has(operation)) processedService.add(operation);
    else return undefined;
  }

  const schema = getDecorationSchema(id);
  if (!schema) return undefined;

  const returnPromise = !resolve || !pendingPromise;
  if (returnPromise) {
    pendingPromise = new Promise<TNewData>(res => {
      resolve = res;
    });
  }

  pendingCount = pendingCount ? pendingCount + 1 : 1;
  const { summaryUrl, opSummaryUrl, summaryPath, opSummaryPath } = schema;
  let promise: Promise<Record<string, unknown>>;
  let getPath: string;
  let setPath: string;
  if (opSummaryPath && opSummaryUrl && operation) {
    promise = fetchDecoration(stringSupplant(opSummaryUrl, { service, operation }));
    getPath = stringSupplant(opSummaryPath, { service, operation });
    setPath = `${id}.withOp.${service}.${operation}`;
  } else {
    promise = fetchDecoration(stringSupplant(summaryUrl, { service }));
    getPath = stringSupplant(summaryPath, { service });
    setPath = `${id}.withoutOp.${service}`;
  }

  promise
    .then(res => {
      return _get(res, getPath, `\`${getPath}\` not found in response`);
    })
    .catch(err => {
      return `Unable to fetch decoration: ${err.message || err}`;
    })
    .then(value => {
      if (!pendingData) pendingData = {};
      _set(pendingData, setPath, value);
      doneCount = doneCount ? doneCount + 1 : 1;

      if (doneCount === pendingCount) {
        if (resolve) resolve(pendingData);
        // istanbul ignore next : Unreachable error to appease TS, resolve made to exist at top at function
        else throw new Error('`resolve` unexpectedly undefined');

        doneCount = pendingCount = pendingData = pendingPromise = resolve = undefined;
      }
    });

  if (returnPromise) return pendingPromise;
  return undefined;
}

const fullActions = createActions<Promise<TNewData> | undefined>({
  [actionTypes.GET_DECORATION]: getDecoration,
});

export default (
  fullActions as unknown as {
    jaegerUi: {
      pathAgnosticDecorations: Record<string, ActionFunctionAny<Action<Promise<TNewData> | undefined>>>;
    };
  }
).jaegerUi.pathAgnosticDecorations;
