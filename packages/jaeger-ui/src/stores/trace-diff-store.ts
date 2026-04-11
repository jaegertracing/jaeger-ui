// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import TTraceDiffState from '../types/TTraceDiffState';

export function newInitialState(): TTraceDiffState {
  return {
    cohort: [],
    a: null,
    b: null,
  };
}

function cohortAddTraceState(state: TTraceDiffState, traceID: string): TTraceDiffState {
  if (state.cohort.indexOf(traceID) >= 0) {
    return state;
  }
  const cohort = state.cohort.slice();
  cohort.push(traceID);
  return { ...state, cohort };
}

function cohortRemoveTraceState(state: TTraceDiffState, traceID: string): TTraceDiffState {
  const i = state.cohort.indexOf(traceID);
  if (i < 0) {
    return state;
  }
  const cohort = state.cohort.slice();
  cohort.splice(i, 1);
  const a = state.a === traceID ? null : state.a;
  const b = state.b === traceID ? null : state.b;
  return { ...state, a, b, cohort };
}

function diffSetAState(state: TTraceDiffState, traceID: string): TTraceDiffState {
  return { ...state, a: traceID };
}

function diffSetBState(state: TTraceDiffState, traceID: string): TTraceDiffState {
  return { ...state, b: traceID };
}

export type TraceDiffStore = TTraceDiffState & {
  cohortAddTrace: (traceID: string) => void;
  cohortRemoveTrace: (traceID: string) => void;
  diffSetA: (traceID: string) => void;
  diffSetB: (traceID: string) => void;
  forceState: (newState: TTraceDiffState) => void;
};

function sliceOnly(s: TraceDiffStore): TTraceDiffState {
  return { a: s.a, b: s.b, cohort: s.cohort };
}

export const useTraceDiffStore = create<TraceDiffStore>((set, _get) => ({
  ...newInitialState(),
  cohortAddTrace: traceID => set(s => cohortAddTraceState(sliceOnly(s), traceID)),
  cohortRemoveTrace: traceID => set(s => cohortRemoveTraceState(sliceOnly(s), traceID)),
  diffSetA: traceID => set(s => diffSetAState(sliceOnly(s), traceID)),
  diffSetB: traceID => set(s => diffSetBState(sliceOnly(s), traceID)),
  forceState: newState =>
    set({
      a: newState.a ?? null,
      b: newState.b ?? null,
      cohort: Array.isArray(newState.cohort) ? [...newState.cohort] : [],
    }),
}));
