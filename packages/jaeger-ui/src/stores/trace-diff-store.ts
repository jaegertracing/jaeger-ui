// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import TTraceDiffState from '../types/TTraceDiffState';
import type { TraceSummary } from '../types/trace-summary';

export function newInitialState(): TTraceDiffState {
  return {
    cohort: [],
    a: null,
    b: null,
  };
}

type TTraceDiffStateWithSummaries = TTraceDiffState & {
  cohortSummaries: Map<string, TraceSummary>;
};

function cohortSummariesForCohort(
  summaries: Map<string, TraceSummary>,
  cohortIDs: string[]
): Map<string, TraceSummary> {
  const next = new Map<string, TraceSummary>();
  cohortIDs.forEach(id => {
    const summary = summaries.get(id);
    if (summary) {
      next.set(id, summary);
    }
  });
  return next;
}

function cohortAddTraceState(
  state: TTraceDiffStateWithSummaries,
  summary: TraceSummary
): TTraceDiffStateWithSummaries {
  const { traceID } = summary;
  const cohortSummaries = new Map(state.cohortSummaries);
  cohortSummaries.set(traceID, summary);
  if (state.cohort.indexOf(traceID) >= 0) {
    return { ...state, cohortSummaries };
  }
  const cohort = [...state.cohort, traceID];
  return { ...state, cohort, cohortSummaries };
}

function cohortRemoveTraceState(
  state: TTraceDiffStateWithSummaries,
  traceID: string
): TTraceDiffStateWithSummaries {
  const i = state.cohort.indexOf(traceID);
  if (i < 0) {
    return state;
  }
  const cohort = state.cohort.slice();
  cohort.splice(i, 1);
  const a = state.a === traceID ? null : state.a;
  const b = state.b === traceID ? null : state.b;
  const cohortSummaries = new Map(state.cohortSummaries);
  cohortSummaries.delete(traceID);
  return { ...state, a, b, cohort, cohortSummaries };
}

function diffSetAState(state: TTraceDiffState, traceID: string): TTraceDiffState {
  return { ...state, a: traceID };
}

function diffSetBState(state: TTraceDiffState, traceID: string): TTraceDiffState {
  return { ...state, b: traceID };
}

type TraceDiffStore = TTraceDiffStateWithSummaries & {
  cohortAddTrace: (summary: TraceSummary) => void;
  cohortRemoveTrace: (traceID: string) => void;
  diffSetA: (traceID: string) => void;
  diffSetB: (traceID: string) => void;
  forceState: (newState: TTraceDiffState) => void;
};

function sliceOnly(s: TraceDiffStore): TTraceDiffStateWithSummaries {
  return { a: s.a, b: s.b, cohort: s.cohort, cohortSummaries: s.cohortSummaries };
}

export const useTraceDiffStore = create<TraceDiffStore>((set, _get) => ({
  ...newInitialState(),
  cohortSummaries: new Map(),
  cohortAddTrace: summary => set(s => cohortAddTraceState(sliceOnly(s), summary)),
  cohortRemoveTrace: traceID => set(s => cohortRemoveTraceState(sliceOnly(s), traceID)),
  diffSetA: traceID => set(s => diffSetAState(sliceOnly(s), traceID)),
  diffSetB: traceID => set(s => diffSetBState(sliceOnly(s), traceID)),
  forceState: newState =>
    set(s => {
      const cohort = Array.isArray(newState.cohort) ? [...newState.cohort] : [];
      return {
        a: newState.a ?? null,
        b: newState.b ?? null,
        cohort,
        cohortSummaries: cohortSummariesForCohort(s.cohortSummaries, cohort),
      };
    }),
}));
