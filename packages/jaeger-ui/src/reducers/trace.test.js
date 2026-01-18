// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as jaegerApiActions from '../actions/jaeger-api';
import * as fileReaderActions from '../actions/file-reader-api';
import { fetchedState } from '../constants';
import traceGenerator from '../demo/trace-generators';
import transformTraceData from '../model/transform-trace-data';
import traceReducer from './trace';

const ACTION_POSTFIX_FULFILLED = '_FULFILLED';
const ACTION_POSTFIX_PENDING = '_PENDING';
const ACTION_POSTFIX_REJECTED = '_REJECTED';

const trace = traceGenerator.trace({ numberOfSpans: 1 });
const { traceID: id } = trace;

const ignoreAsOtelTrace = traceData => {
  if (!traceData) return traceData;
  const { asOtelTrace, ...rest } = traceData;
  return rest;
};

describe('fetch a trace', () => {
  it('sets loading true on a fetch', () => {
    const state = traceReducer(undefined, {
      type: `${jaegerApiActions.fetchTrace}${ACTION_POSTFIX_PENDING}`,
      meta: { id },
    });
    const outcome = { [id]: { id, state: fetchedState.LOADING } };
    expect(state.traces).toEqual(outcome);
  });

  it('handles a successful FETCH_TRACE', () => {
    const state = traceReducer(undefined, {
      type: `${jaegerApiActions.fetchTrace}${ACTION_POSTFIX_FULFILLED}`,
      payload: { data: [trace] },
      meta: { id },
    });
    const expectedData = ignoreAsOtelTrace(transformTraceData(trace));
    const actualData = ignoreAsOtelTrace(state.traces[id].data);

    expect(state.traces[id].state).toBe(fetchedState.DONE);
    expect(state.traces[id].id).toBe(id);
    expect(actualData).toEqual(expectedData);
  });

  it('handles a failed FETCH_TRACE', () => {
    const error = new Error();
    const state = traceReducer(undefined, {
      type: `${jaegerApiActions.fetchTrace}${ACTION_POSTFIX_REJECTED}`,
      payload: error,
      meta: { id },
    });
    expect(state.traces).toEqual({ [id]: { error, id, state: fetchedState.ERROR } });
    expect(state.traces[id].error).toBe(error);
  });
});

describe('fetch multiple traces', () => {
  const traceB = traceGenerator.trace({ numberOfSpans: 1 });
  const { traceID: idB } = traceB;

  it('sets loading to true for all pending IDs', () => {
    const traces = { preExisting: 'this-trace-is-pre-existing' };
    const state = traceReducer(
      { traces },
      {
        type: `${jaegerApiActions.fetchMultipleTraces}${ACTION_POSTFIX_PENDING}`,
        meta: { ids: [id, idB] },
      }
    );
    const outcome = {
      ...traces,
      [id]: { id, state: fetchedState.LOADING },
      [idB]: { id: idB, state: fetchedState.LOADING },
    };
    expect(state.traces).toEqual(outcome);
  });

  describe('handles a successful request', () => {
    it('transforms and saves all trace data', () => {
      const traces = { preExisting: 'this-trace-is-pre-existing' };
      const state = traceReducer(
        { traces },
        {
          type: `${jaegerApiActions.fetchMultipleTraces}${ACTION_POSTFIX_FULFILLED}`,
          payload: { data: [trace, traceB] },
        }
      );

      const actualTraceA = state.traces[id];
      const actualTraceB = state.traces[idB];

      expect(actualTraceA.state).toBe(fetchedState.DONE);
      expect(ignoreAsOtelTrace(actualTraceA.data)).toEqual(ignoreAsOtelTrace(transformTraceData(trace)));

      expect(actualTraceB.state).toBe(fetchedState.DONE);
      expect(ignoreAsOtelTrace(actualTraceB.data)).toEqual(ignoreAsOtelTrace(transformTraceData(traceB)));

      // Check preservation of existing state
      expect(state.traces.preExisting).toBe(traces.preExisting);
    });

    it('saves all error data', () => {
      const msg = 'a-message';
      const traceID = 'a-trace-id';
      const traces = { preExisting: 'this-trace-is-pre-existing' };
      const state = traceReducer(
        { traces },
        {
          type: `${jaegerApiActions.fetchMultipleTraces}${ACTION_POSTFIX_FULFILLED}`,
          payload: { data: [], errors: [{ msg, traceID }] },
        }
      );
      const outcome = {
        ...traces,
        [traceID]: { id: traceID, error: expect.any(Error), state: fetchedState.ERROR },
      };
      expect(state.traces).toEqual(outcome);
    });

    it('process multiple references', () => {
      const multiRefTrace = traceGenerator.trace({ numberOfSpans: 7, maxDepth: 3, spansPerLevel: 4 });
      const { traceID, spanID: rootSpanId } = multiRefTrace.spans[0];
      const [willGainRef, willNotChange] = multiRefTrace.spans.filter(
        span => span.references.length > 0 && span.references[0].spanID !== rootSpanId
      );
      const { spanID: existingRefID } = willGainRef.references[0];
      const { spanID: willBeReferencedID } = willNotChange.references[0];

      willGainRef.references.push({
        refType: 'CHILD_OF',
        traceID,
        spanID: willBeReferencedID,
      });
      const tTrace = transformTraceData(multiRefTrace);
      const multiReference = tTrace.spans.filter(span => span.references && span.references.length > 1);

      expect(multiReference.length).toEqual(1);
      expect(new Set(multiReference[0].references)).toEqual(
        new Set([
          expect.objectContaining({ spanID: willBeReferencedID }),
          expect.objectContaining({ spanID: existingRefID }),
        ])
      );
      const hasReferral = tTrace.spans.filter(
        span => span.subsidiarilyReferencedBy && span.subsidiarilyReferencedBy.length > 0
      );
      expect(new Set(hasReferral[0].subsidiarilyReferencedBy)).toEqual(
        new Set([expect.objectContaining({ spanID: willGainRef.spanID })])
      );
    });
  });

  it('handles a failed request', () => {
    const error = 'error-info';
    const traces = { preExisting: 'this-trace-is-pre-existing' };
    const state = traceReducer(
      { traces },
      {
        type: `${jaegerApiActions.fetchMultipleTraces}${ACTION_POSTFIX_REJECTED}`,
        payload: error,
        meta: { ids: [id, idB] },
      }
    );
    const outcome = {
      ...traces,
      [id]: { id, error, state: fetchedState.ERROR },
      [idB]: { id: idB, error, state: fetchedState.ERROR },
    };
    expect(state.traces).toEqual(outcome);
  });
});

describe('search traces', () => {
  const query = 'some-query';

  it('handles a pending request', () => {
    const state = traceReducer(undefined, {
      type: `${jaegerApiActions.searchTraces}${ACTION_POSTFIX_PENDING}`,
      meta: { query },
    });
    const outcome = {
      query,
      results: [],
      state: fetchedState.LOADING,
    };
    expect(state.search).toEqual(outcome);
  });

  it('handles a successful request', () => {
    const state = traceReducer(
      { search: { query } },
      {
        type: `${jaegerApiActions.searchTraces}${ACTION_POSTFIX_FULFILLED}`,
        payload: { data: [trace] },
        meta: { query },
      }
    );

    // Check search state
    expect(state.search).toEqual({
      query,
      state: fetchedState.DONE,
      results: [id],
    });

    // Check trace state
    const actualTrace = state.traces[id];
    expect(actualTrace.state).toBe(fetchedState.DONE);
    expect(actualTrace.id).toBe(id);
    expect(ignoreAsOtelTrace(actualTrace.data)).toEqual(ignoreAsOtelTrace(transformTraceData(trace)));

    // Check rawTraces
    expect(state.rawTraces).toEqual([trace]);
  });

  it('handles a failed request', () => {
    const error = 'some-error';
    const state = traceReducer(
      { search: { query } },
      {
        type: `${jaegerApiActions.searchTraces}${ACTION_POSTFIX_REJECTED}`,
        payload: error,
        meta: { query },
      }
    );
    const outcome = {
      error,
      query,
      results: [],
      state: fetchedState.ERROR,
    };
    expect(state.search).toEqual(outcome);
  });

  it('ignores the results with the wrong query', () => {
    const otherQuery = 'some-other-query';
    [ACTION_POSTFIX_FULFILLED, ACTION_POSTFIX_REJECTED].forEach(postfix => {
      const state = traceReducer(
        { search: { query } },
        {
          type: `${jaegerApiActions.searchTraces}${postfix}`,
          meta: { query: otherQuery },
        }
      );
      expect(state.search).toEqual({ query });
    });
  });
});

describe('load json traces', () => {
  it('handles a pending load json request', () => {
    const state = traceReducer(
      { search: { results: [id] } },
      {
        type: `${fileReaderActions.loadJsonTraces}${ACTION_POSTFIX_PENDING}`,
      }
    );
    const outcome = {
      results: [id],
      state: fetchedState.LOADING,
    };
    expect(state.search).toEqual(outcome);
  });

  it('handles a successful load json request', () => {
    const state = traceReducer(undefined, {
      type: `${fileReaderActions.loadJsonTraces}${ACTION_POSTFIX_FULFILLED}`,
      payload: { data: [trace] },
    });

    // Check search state
    expect(state.search).toEqual({
      query: null,
      state: fetchedState.DONE,
      results: [id],
    });

    // Check trace state
    const actualTrace = state.traces[id];
    expect(actualTrace.state).toBe(fetchedState.DONE);
    expect(actualTrace.id).toBe(id);
    expect(ignoreAsOtelTrace(actualTrace.data)).toEqual(ignoreAsOtelTrace(transformTraceData(trace)));
  });

  it('handles a failed load json request', () => {
    const error = 'some-error';
    const state = traceReducer(undefined, {
      type: `${fileReaderActions.loadJsonTraces}${ACTION_POSTFIX_REJECTED}`,
      payload: error,
      meta: { id },
    });
    const outcome = {
      error,
      query: null,
      results: [],
      state: fetchedState.ERROR,
    };
    expect(state.search).toEqual(outcome);
  });

  it('handles error when processing json trace data', () => {
    const initialState = {
      traces: {},
      search: {
        results: ['existing-trace-id'],
        state: fetchedState.LOADING,
      },
    };
    const corruptedTrace = {
      ...trace,
      spans: null,
    };

    const state = traceReducer(initialState, {
      type: `${fileReaderActions.loadJsonTraces}${ACTION_POSTFIX_FULFILLED}`,
      payload: { data: [corruptedTrace] },
    });

    expect(state.search).toEqual({
      error: expect.any(Error),
      results: [],
      state: fetchedState.ERROR,
    });
    expect(state.traces).toEqual({});
  });
});
