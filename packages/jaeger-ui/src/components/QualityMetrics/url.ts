// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import memoizeOne from 'memoize-one';
import queryString from 'query-string';
import { matchPath } from 'react-router-dom';

import prefixUrl from '../../utils/prefix-url';

export const ROUTE_PATH = prefixUrl('/quality-metrics');

export function matches(path: string) {
  return Boolean(matchPath({ path: ROUTE_PATH, end: true }, path));
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
