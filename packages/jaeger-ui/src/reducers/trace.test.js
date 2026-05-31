// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as fileReaderActions from '../actions/file-reader-api';
import { fetchedState } from '../constants';
import traceGenerator from '../demo/trace-generators';
import transformTraceData from '../model/transform-trace-data';
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
