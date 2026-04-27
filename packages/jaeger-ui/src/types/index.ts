// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ApiError } from './api-error';
import { Config } from './config';
import { SearchQuery } from './search';
import TDdgState from './TDdgState';
import tNil from './TNil';
import { Trace } from './trace';
import TPathAgnosticDecorationsState from './TPathAgnosticDecorationsState';
import TTraceTimeline from './TTraceTimeline';
import { MetricsReduxState } from './metrics';

export type TNil = tNil;

export type FetchedState = 'FETCH_DONE' | 'FETCH_ERROR' | 'FETCH_LOADING';

export type FetchedTrace<T = Trace> = {
  data?: T;
  error?: ApiError;
  id: string;
  state?: FetchedState;
};

export type LocationState = {
  fromSearch?: string;
};

export type ReduxState = {
  type: string;
  config: Config;
  ddg: TDdgState;
  dependencies: {
    dependencies: { parent: string; child: string; callCount: number }[];
    loading: boolean;
    error: ApiError | TNil;
  };
  pathAgnosticDecorations: TPathAgnosticDecorationsState;
  trace: {
    traces: Record<string, FetchedTrace>;
    search: {
      error?: ApiError;
      results: string[];
      state?: FetchedState;
      query?: SearchQuery;
    };
  };
  traceTimeline: TTraceTimeline;
  metrics: MetricsReduxState;
};
