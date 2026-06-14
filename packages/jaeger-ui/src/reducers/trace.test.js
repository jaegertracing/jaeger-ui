// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as fileReaderActions from '../actions/file-reader-api';
import { fetchedState } from '../constants';
import traceGenerator from '../demo/trace-generators';
import traceReducer from './trace';

const ACTION_POSTFIX_FULFILLED = '_FULFILLED';
const ACTION_POSTFIX_PENDING = '_PENDING';
const ACTION_POSTFIX_REJECTED = '_REJECTED';

const trace = traceGenerator.trace({ numberOfSpans: 1 });

describe('load json traces', () => {
  it('handles a pending load json request', () => {
    const state = traceReducer(undefined, {
      type: `${fileReaderActions.loadJsonTraces}${ACTION_POSTFIX_PENDING}`,
    });
    expect(state.search.state).toBe(fetchedState.LOADING);
  });

  it('handles a successful load json request', () => {
    const state = traceReducer(undefined, {
      type: `${fileReaderActions.loadJsonTraces}${ACTION_POSTFIX_FULFILLED}`,
      payload: { data: [trace] },
    });
    expect(state.search.state).toBe(fetchedState.DONE);
    // Loaded traces are not stored in Redux — they live in the React Query
    // cache managed by useUploadedTraces. The reducer only tracks load status.
    expect(state).not.toHaveProperty('rawTraces');
    expect(state.search).not.toHaveProperty('results');
  });

  it('handles a failed load json request', () => {
    const error = 'some-error';
    const state = traceReducer(undefined, {
      type: `${fileReaderActions.loadJsonTraces}${ACTION_POSTFIX_REJECTED}`,
      payload: error,
    });
    expect(state.search.state).toBe(fetchedState.ERROR);
    expect(state.search.error).toBe(error);
  });

  it('handles error when processing json trace data', () => {
    const corruptedTrace = { ...trace, spans: null };
    const state = traceReducer(undefined, {
      type: `${fileReaderActions.loadJsonTraces}${ACTION_POSTFIX_FULFILLED}`,
      payload: { data: [corruptedTrace] },
    });
    expect(state.search.state).toBe(fetchedState.ERROR);
    expect(state.search.error).toBeInstanceOf(Error);
  });
});
