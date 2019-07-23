// Copyright (c) 2019 Uber Technologies, Inc.
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

import _isEmpty from 'lodash/isEmpty';
import queryString from 'query-string';
import { matchPath } from 'react-router-dom';

import { TDdgSparseUrlState } from '../../model/ddg/types';
import prefixUrl from '../../utils/prefix-url';

export const ROUTE_PATH = prefixUrl('/deep-dependencies');

const ROUTE_MATCHER = { path: ROUTE_PATH, strict: true, exact: true };

export function matches(path: string) {
  return Boolean(matchPath(path, ROUTE_MATCHER));
}

export function getUrl(args?: { [key: string]: unknown }) {
  if (args && !_isEmpty(args)) {
    return `${ROUTE_PATH}?${queryString.stringify(args)}`;
  }
  return ROUTE_PATH;
}

function firstParam(arg: string | string[]): string {
  if (Array.isArray(arg)) {
    const returnVal = arg[0];
    console.warn(`Found multiple query parameters: "${arg}", using "${returnVal}"`); // eslint-disable-line no-console
    return returnVal;
  }
  return arg;
}

export function getUrlState(search: string): TDdgSparseUrlState {
  const { service, operation, start, end, visEncoding } = queryString.parse(search);
  const rv: TDdgSparseUrlState = {};
  if (service) {
    rv.service = firstParam(service);
  }
  if (operation) {
    rv.operation = firstParam(operation);
  }
  if (start) {
    rv.start = Number.parseInt(firstParam(start), 10);
  }
  if (end) {
    rv.end = Number.parseInt(firstParam(end), 10);
  }
  if (visEncoding) {
    rv.visEncoding = firstParam(visEncoding);
  }
  return rv;
}
