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

export function matches(path: string) {
  const match = matchPath(ROUTE_PATH, path);
  if (!match) {
    return false;
  }
  // Single-trace and compare both use `/trace/:id`; only compare URLs contain "..." in the segment.
  return match.params?.id?.includes('...') ?? false;
}

export function getUploadedTraceIds(search: string): string[] {
  return new URLSearchParams(search).getAll('upload');
}

export function getUrl(state: TTraceDiffState, uploadedTraceIDs: readonly string[] = []) {
  const { a = undefined, b = undefined, cohort } = getValidState(state);
  const cohortSet = new Set(cohort);
  const upload = uploadedTraceIDs.filter(id => cohortSet.has(id));
  const search = queryString.stringify({ cohort, upload: upload.length ? upload : undefined });
  return prefixUrl(`/trace/${a || ''}...${b || ''}${search ? '?' : ''}${search}`);
}
