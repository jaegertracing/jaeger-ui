// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';
import { matchPath } from 'react-router-dom';

import getValidState from './getValidState';
import TTraceDiffState from '../../types/TTraceDiffState';
import prefixUrl from '../../utils/prefix-url';

export type TDiffRouteParams = {
  a?: string | undefined;
  b?: string | undefined;
};

export const ROUTE_PATH = prefixUrl('/trace/:a?\\..\\.:b?');

export function matches(path: string) {
  return Boolean(matchPath({ path: ROUTE_PATH, end: true }, path));
}

export function getUrl(state: TTraceDiffState) {
  const { a = undefined, b = undefined, cohort } = getValidState(state);
  const search = queryString.stringify({ cohort });
  return prefixUrl(`/trace/${a || ''}...${b || ''}${search ? '?' : ''}${search}`);
}
