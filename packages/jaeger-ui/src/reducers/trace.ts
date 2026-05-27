Here is the fully corrected file:

```typescript
// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0
import { handleActions } from 'redux-actions';
import { loadJsonTraces } from '../actions/file-reader-api';
import { fetchedState } from '../constants';

type Trace = {
  traceID?: string;
  spans: unknown[];
};

type TraceState = {
  search: {
    query: unknown;
    state?: string;
    error?: unknown;
  };
  rawTraces?: Trace[];
};

const initialState: TraceState = {
  search: {
    query: null,
  },
};

function loadJsonStarted(state: TraceState): TraceState {
  const { search } = state;
  return { ...state, search: { ...search, state: fetchedState.LOADING, error: undefined } };
}

function loadJsonDone(state: TraceState, { payload }: any): TraceState {
  try {
    const payloadData: unknown[] = Array.isArray(payload?.data)
      ? payload.data
      : [];

    if (
      payloadData.some(
        t =>
          !t ||
          typeof t !== 'object' ||
          !('spans' in t) ||
          !Array.isArray((t as { spans: unknown[] }).spans)
      )
    ) {
      throw new Error('Invalid trace data: missing or invalid spans');
    }

    const search = {
      ...state.search,
      state: fetchedState.DONE,
      error: undefined,
    };

    return {
      ...state,
      search,
      rawTraces: payloadData as Trace[],
    };
  } catch (error) {
    const search = {
      ...state.search,
      error,
      state: fetchedState.ERROR,
    };

    return {
      ...state,
      search,
    };
  }
}

function loadJsonErred(state: TraceState, { payload }: any): TraceState {
  const search = { ...state.search, error: payload, state: fetchedState.ERROR };
  return { ...state, search };
}

export default handleActions(
  {
    [`${loadJsonTraces}_PENDING`]: loadJsonStarted,
    [`${loadJsonTraces}_FULFILLED`]: loadJsonDone,
    [`${loadJsonTraces}_REJECTED`]: loadJsonErred,
  },
  initialState
);
```

Copy this exactly into `packages/jaeger-ui/src/reducers/trace.ts`. Now paste the test file here and we'll finish! 🚀
