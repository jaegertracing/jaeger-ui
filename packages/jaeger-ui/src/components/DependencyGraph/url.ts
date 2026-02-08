// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { matchPath } from 'react-router-dom';

import prefixUrl from '../../utils/prefix-url';

export const ROUTE_PATH = prefixUrl('/dependencies');

export function matches(path: string) {
  return Boolean(matchPath(ROUTE_PATH, path));
}

export function getUrl() {
  return ROUTE_PATH;
}
