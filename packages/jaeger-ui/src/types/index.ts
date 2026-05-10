// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ApiError } from './api-error';
import { SearchQuery } from './search';
import TDdgState from './TDdgState';
import tNil from './TNil';
import { Trace } from './trace';
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

// Router state carried in history entries when navigating to the trace page.
// Not visible in the URL — survives back/forward navigation but is lost on a hard reload.
export type LocationState = {
  // The full search-results URL (pathname + query string) the user came from,
  // e.g. '/search?service=frontend&operation=GET%20%2F'.
  // When present, TracePageHeader renders a back button that returns to this URL.
  fromSearch?: string;
};

export type ReduxState = {
  type: string;
  ddg: TDdgState;
  dependencies: {
    dependencies: { parent: string; child: string; callCount: number }[];
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
  traceTimeline: TTraceTimeline;
  metrics: MetricsReduxState;
};
