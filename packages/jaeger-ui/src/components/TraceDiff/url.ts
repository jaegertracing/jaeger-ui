// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';
import { matchPath } from 'react-router-dom-v5-compat';

import getValidState from './getValidState';
import TTraceDiffState from '../../types/TTraceDiffState';
import prefixUrl from '../../utils/prefix-url';

export type TDiffRouteParams = {
  a?: string | undefined;
  b?: string | undefined;
};

export const ROUTE_PATH = prefixUrl('/trace/:id');

export function matches(path: string) {
  const match = matchPath(ROUTE_PATH, path);
  if (!match) {
    return false;
  }
  // Single-trace and compare both use `/trace/:id`; only compare URLs contain "..." in the segment.
  return match.params?.id?.includes('...') ?? false;
}

export function getUrl(state: TTraceDiffState) {
  const { a = undefined, b = undefined, cohort } = getValidState(state);
  const search = queryString.stringify({ cohort });
  return prefixUrl(`/trace/${a || ''}...${b || ''}${search ? '?' : ''}${search}`);
}
