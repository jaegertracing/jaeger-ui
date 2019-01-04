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

import type { ContextRouter } from 'react-router-dom';

import type { ApiError } from './api-error';
import type { TracesArchive } from './archive';
import type { Config } from './config';
import type { Trace } from './trace';
import type { TraceDiffState } from './trace-diff';
import type { TraceTimeline } from './trace-timeline';

export type FetchedState = 'FETCH_DONE' | 'FETCH_ERROR' | 'FETCH_LOADING';

export type FetchedTrace = {
  data?: Trace,
  error?: ApiError,
  id: string,
  state?: FetchedState,
};

export type ReduxState = {
  archive: TracesArchive,
  config: Config,
  dependencies: {
    dependencies: { parent: string, child: string, callCount: number }[],
    loading: boolean,
    error: ?ApiError,
  },
  router: ContextRouter,
  services: {
    services: ?(string[]),
    operationsForService: { [string]: string[] },
    loading: boolean,
    error: ?ApiError,
  },
  trace: {
    traces: { [string]: FetchedTrace },
    search: {
      error?: ApiError,
      results: string[],
      state?: FetchedState,
    },
  },
  traceDiff: TraceDiffState,
  traceTimeline: TraceTimeline,
};
