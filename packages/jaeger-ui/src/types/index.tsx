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

// TODO: Everett is this correct? Can't find ContextRouter
import { Router } from 'react-router-dom'; // eslint-disable-line no-unused-vars
import { History as RouterHistory, Location } from 'history'; // eslint-disable-line no-unused-vars

import { ApiError } from './api-error'; // eslint-disable-line no-unused-vars
import { TracesArchive } from './archive'; // eslint-disable-line no-unused-vars
import { Config } from './config'; // eslint-disable-line no-unused-vars
import { EmbeddedState } from './embedded'; // eslint-disable-line no-unused-vars
import TNullable from './nullable'; // eslint-disable-line no-unused-vars
import { SearchQuery } from './search'; // eslint-disable-line no-unused-vars
import { Trace } from './trace'; // eslint-disable-line no-unused-vars
import { TraceDiffState } from './trace-diff'; // eslint-disable-line no-unused-vars
import { TraceTimeline } from './trace-timeline'; // eslint-disable-line no-unused-vars

export type FetchedState = 'FETCH_DONE' | 'FETCH_ERROR' | 'FETCH_LOADING';

export type FetchedTrace = {
  data?: Trace;
  error?: ApiError;
  id: string;
  state?: FetchedState;
};

export type ReduxState = {
  archive: TracesArchive;
  config: Config;
  dependencies: {
    dependencies: { parent: string; child: string; callCount: number }[];
    loading: boolean;
    error: ApiError | TNullable;
  };
  embedded: EmbeddedState;
  router: Router & {
    location: Location;
  };
  services: {
    services: (string[]) | TNullable;
    operationsForService: Record<string, string[]>;
    loading: boolean;
    error: ApiError | TNullable;
  };
  trace: {
    traces: Record<string, FetchedTrace>;
    search: {
      error?: ApiError;
      results: string[];
      state?: FetchedState;
      query?: SearchQuery;
    };
  };
  traceDiff: TraceDiffState;
  traceTimeline: TraceTimeline;
};
