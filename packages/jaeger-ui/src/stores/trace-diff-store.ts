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

type TCohortSummaries = Record<string, TraceSummary>;

function cohortSummariesForCohort(summaries: TCohortSummaries, cohortIDs: string[]): TCohortSummaries {
  const next: TCohortSummaries = {};
  cohort.forEach(id => {
    if (summaries[id]) {
      next[id] = summaries[id];
    }
  });
  return next;
}

function cohortAddTraceState(
  state: TTraceDiffState & { cohortSummaries: TCohortSummaries },
  traceID: string,
  summary?: TraceSummary
): TTraceDiffState & { cohortSummaries: TCohortSummaries } {
  const cohortSummaries = summary ? { ...state.cohortSummaries, [traceID]: summary } : state.cohortSummaries;
  if (state.cohort.indexOf(traceID) >= 0) {
    return summary ? { ...state, cohortSummaries } : state;
  }
  const cohort = state.cohort.slice();
  cohort.push(traceID);
  return { ...state, cohort, cohortSummaries };
}

function cohortRemoveTraceState(
  state: TTraceDiffState & { cohortSummaries: TCohortSummaries },
  traceID: string
): TTraceDiffState & { cohortSummaries: TCohortSummaries } {
  const i = state.cohort.indexOf(traceID);
  if (i < 0) {
    return state;
  }
  const cohort = state.cohort.slice();
  cohort.splice(i, 1);
  const a = state.a === traceID ? null : state.a;
  const b = state.b === traceID ? null : state.b;
  const { [traceID]: _removed, ...cohortSummaries } = state.cohortSummaries;
  return { ...state, a, b, cohort, cohortSummaries };
}

function diffSetAState(state: TTraceDiffState, traceID: string): TTraceDiffState {
  return { ...state, a: traceID };
}

function diffSetBState(state: TTraceDiffState, traceID: string): TTraceDiffState {
  return { ...state, b: traceID };
}

type TraceDiffStore = TTraceDiffState & {
  cohortSummaries: TCohortSummaries;
  cohortAddTrace: (traceID: string, summary?: TraceSummary) => void;
  cohortRemoveTrace: (traceID: string) => void;
  diffSetA: (traceID: string) => void;
  diffSetB: (traceID: string) => void;
  forceState: (newState: TTraceDiffState) => void;
};

function sliceOnly(s: TraceDiffStore): TTraceDiffState & { cohortSummaries: TCohortSummaries } {
  return { a: s.a, b: s.b, cohort: s.cohort, cohortSummaries: s.cohortSummaries };
}

export const useTraceDiffStore = create<TraceDiffStore>((set, _get) => ({
  ...newInitialState(),
  cohortSummaries: {},
  cohortAddTrace: (traceID, summary) => set(s => cohortAddTraceState(sliceOnly(s), traceID, summary)),
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
