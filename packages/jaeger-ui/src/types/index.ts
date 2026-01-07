// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RouterState } from 'redux-first-history';
import { Location } from 'history';

import { ApiError } from './api-error';
import { TracesArchive } from './archive';
import { Config } from './config';
import { EmbeddedState } from './embedded';
import { SearchQuery } from './search';
import TDdgState from './TDdgState';
import tNil from './TNil';
import iWebAnalytics from './tracking';
import { Trace } from './trace';
import TTraceDiffState from './TTraceDiffState';
import TTraceTimeline from './TTraceTimeline';
import { MetricsReduxState } from './metrics';

export type TNil = tNil;
export type IWebAnalytics = iWebAnalytics;

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
  archive: TracesArchive;
  type: string;
  config: Config;
  ddg: TDdgState;
  dependencies: {
    dependencies: { parent: string; child: string; callCount: number }[];
    loading: boolean;
    error: ApiError | TNil;
  };
  embedded: EmbeddedState;
  router: any;
  services: {
    services: string[] | TNil;
    serverOpsForService: Record<string, string[]>;
    operationsForService: Record<string, string[]>;
    loading: boolean;
    error: ApiError | TNil;
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
  traceDiff: TTraceDiffState;
  traceTimeline: TTraceTimeline;
  metrics: MetricsReduxState;
};
