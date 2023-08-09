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

export const TOP_NAV_HEIGHT = 46 as const;

export const FALLBACK_DAG_MAX_NUM_SERVICES = 100 as const;
export const FALLBACK_TRACE_NAME = '<trace-without-root-span>' as const;

export const FETCH_DONE = 'FETCH_DONE' as const;
export const FETCH_ERROR = 'FETCH_ERROR' as const;
export const FETCH_LOADING = 'FETCH_LOADING' as const;

export const fetchedState = {
  DONE: FETCH_DONE,
  ERROR: FETCH_ERROR,
  LOADING: FETCH_LOADING,
};
