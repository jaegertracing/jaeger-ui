// @flow

// Copyright (c) 2018 Uber Technologies, Inc.
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

import queryString from 'query-string';
import { matchPath } from 'react-router-dom';

import getValidState from './getValidState';
import prefixUrl from '../../utils/prefix-url';

export const ROUTE_PATH = prefixUrl('/trace/:a?\\.\\.\\.:b?');

const ROUTE_MATCHER = { path: ROUTE_PATH, strict: true, exact: true };

export function matches(path: string) {
  return Boolean(matchPath(path, ROUTE_MATCHER));
}

export function getUrl(state?: ?{ a?: ?string, b?: ?string, cohort: string[] }) {
  const { a, b, cohort } = getValidState(state);
  const search = queryString.stringify({ cohort });
  return prefixUrl(`/trace/${a || ''}...${b || ''}${search ? '?' : ''}${search}`);
}
