// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ApiError } from './api-error';
import { SearchQuery } from './search';
import tNil from './TNil';
import { IOtelTrace } from './otel';
import TTraceTimeline from './TTraceTimeline';

export type TNil = tNil;

export type FetchedState = 'FETCH_DONE' | 'FETCH_ERROR' | 'FETCH_LOADING';

export type FetchedTrace<T = IOtelTrace> = {
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
  trace: {
    search: {
      error?: ApiError;
      results: string[];
      state?: FetchedState;
      query?: SearchQuery;
    };
    rawTraces?: unknown[];
  };
  traceTimeline: TTraceTimeline;
};
