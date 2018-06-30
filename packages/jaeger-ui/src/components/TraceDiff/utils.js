// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
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

import prefixUrl from '../../utils/prefix-url';

export function getValidState(state: { a?: ?string, b?: ?string, cohort: string[] }) {
  const { a: stA, b: stB, cohort: stCohort } = state;
  const cohortSet = new Set([].concat(stA, stB, stCohort || []).filter(Boolean));
  const cohort: string[] = Array.from(cohortSet);
  const a = cohort[0];
  const b = cohort[1];
  return { a, b, cohort };
}

export function getDiffUrl(state: { a?: ?string, b?: ?string, cohort: string[] }) {
  const { a, b, cohort } = getValidState(state);
  const search = queryString.stringify({ b, cohort });
  return prefixUrl(`/trace/${a}:diff?${search}`);
}
