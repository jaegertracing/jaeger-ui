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

import memoizeOne from 'memoize-one';
import queryString from 'query-string';
import { matchPath } from 'react-router-dom';

import prefixUrl from '../../utils/prefix-url';

export const ROUTE_PATH = prefixUrl('/quality-metrics');

const ROUTE_MATCHER = { path: ROUTE_PATH, strict: true, exact: true };

export function matches(path: string) {
  return Boolean(matchPath(path, ROUTE_MATCHER));
}

export function getUrl(queryParams?: Record<string, string | number>) {
  if (!queryParams) return ROUTE_PATH;

  return `${ROUTE_PATH}?${queryString.stringify(queryParams)}`;
}

type TReturnValue = {
  lookback: number;
  service?: string;
};

export const getUrlState = memoizeOne(function getUrlState(search: string): TReturnValue {
  const { lookback: lookbackFromUrl, service: serviceFromUrl } = queryString.parse(search);
  const service = Array.isArray(serviceFromUrl) ? serviceFromUrl[0] : serviceFromUrl;
  const lookbackStr = Array.isArray(lookbackFromUrl) ? lookbackFromUrl[0] : lookbackFromUrl;
  const lookback = lookbackStr && Number.parseInt(lookbackStr, 10);
  const rv: TReturnValue = {
    lookback: 48,
  };
  if (service) rv.service = service;
  if (lookback) rv.lookback = lookback;
  return rv;
});
