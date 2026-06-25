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

export const ROUTE_PATH = prefixUrl('/trace/:id');

/** Returns true when `id` is a diff URL segment (contains "..."). */
export function isDiffUrl(id: string | undefined): boolean {
  return Boolean(id?.includes('...'));
}

export function matches(path: string) {
  const match = matchPath(ROUTE_PATH, path);
  if (!match) {
    return false;
  }
  // Single-trace and compare both use `/trace/:id`; only compare URLs contain "..." in the segment.
  return isDiffUrl(match.params?.id);
}

export function getUrl(state: TTraceDiffState) {
  const { a = undefined, b = undefined, cohort } = getValidState(state);
  const search = queryString.stringify({ cohort });
  return prefixUrl(`/trace/${a || ''}...${b || ''}${search ? '?' : ''}${search}`);
}
/**
 * Splits a diff URL id segment (e.g. "abc...def") into its two trace IDs.
 * Returns an empty object when `id` is undefined or does not contain "...".
 */
export function getDiffIds(id: string | undefined): TDiffRouteParams {
  if (isDiffUrl(id)) {
    // isDiffUrl guarantees id is a non-empty string containing '...'
    const parts = (id as string).split('...');
    return {
      a: parts[0] || undefined,
      b: parts[1] || undefined,
    };
  }
  return {};
}
