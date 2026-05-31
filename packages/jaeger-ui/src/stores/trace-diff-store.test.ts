// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { newInitialState, useTraceDiffStore } from './trace-diff-store';
import type { TraceSummary } from '../types/trace-summary';

function makeSummary(traceID: string): TraceSummary {
  return {
    traceID,
    traceName: 'svc: op',
    rootServiceName: 'svc',
    rootOperationName: 'op',
    startTime: 0,
    duration: 100,
    spanCount: 1,
    errorSpanCount: 0,
    orphanSpanCount: 0,
    services: [],
  } as unknown as TraceSummary;
}

describe('trace-diff-store', () => {
  const initialCohort = ['trace-id-0', 'trace-id-1', 'trace-id-2'];
  const newTraceId = 'new-trace-id';

  beforeEach(() => {
    useTraceDiffStore.setState({
      a: initialCohort[0],
      b: initialCohort[1],
      cohort: [...initialCohort],
      cohortSummaries: new Map(),
    });
  });

  describe('newInitialState', () => {
    it('creates an empty set', () => {
      expect(newInitialState()).toEqual({
        a: null,
        b: null,
        cohort: [],
      });
    });
  });

  describe('cohortAddTrace', () => {
    it('adds trace that does not already exist in state', () => {
      const oldCohort = useTraceDiffStore.getState().cohort;
      expect(oldCohort.includes(newTraceId)).toBe(false);

      useTraceDiffStore.getState().cohortAddTrace(makeSummary(newTraceId));
      const newCohort = useTraceDiffStore.getState().cohort;
      expect(newCohort).not.toBe(oldCohort);
      expect(newCohort.includes(newTraceId)).toBe(true);
      expect(newCohort).toEqual(expect.arrayContaining(oldCohort));
    });

    it('returns original cohort if traceID already exists in state', () => {
      useTraceDiffStore.getState().cohortAddTrace(makeSummary(initialCohort[0]));
      const cohort = useTraceDiffStore.getState().cohort;
      expect(cohort).toEqual(initialCohort);
    });

    it('stores the summary in cohortSummaries keyed by traceID', () => {
      const summary = makeSummary(newTraceId);
      useTraceDiffStore.getState().cohortAddTrace(summary);
      expect(useTraceDiffStore.getState().cohortSummaries.get(newTraceId)).toEqual(summary);
    });

    it('updates the summary even when traceID is already in the cohort', () => {
      const original = makeSummary(initialCohort[0]);
      useTraceDiffStore.getState().cohortAddTrace(original);
      const updated = { ...original, spanCount: 999 };
      useTraceDiffStore.getState().cohortAddTrace(updated);
      expect(useTraceDiffStore.getState().cohortSummaries.get(initialCohort[0])).toEqual(updated);
    });
  });

  describe('cohortRemoveTrace', () => {
    it('removes trace that exists in state.cohort', () => {
      const oldCohort = useTraceDiffStore.getState().cohort;
      useTraceDiffStore.getState().cohortRemoveTrace(initialCohort[2]);
      const newCohort = useTraceDiffStore.getState().cohort;
      expect(newCohort).not.toBe(oldCohort);
      expect(newCohort.includes(initialCohort[2])).toBe(false);
      expect(newCohort).toEqual(oldCohort.slice(0, 2));
      expect(useTraceDiffStore.getState().cohortSummaries.has(initialCohort[2])).toBe(false);
    });

    it('removes state.a', () => {
      const oldState = useTraceDiffStore.getState();
      const oldCohort = oldState.cohort;
      useTraceDiffStore.getState().cohortRemoveTrace(oldState.a!);
      const newState = useTraceDiffStore.getState();
      const newCohort = newState.cohort;
      expect(newState.a).toBe(null);
      expect(newCohort).not.toBe(oldCohort);
      expect(newCohort.includes(oldState.a!)).toBe(false);
      expect(newCohort).toEqual(oldCohort.slice(1));
    });

    it('removes state.b', () => {
      const oldState = useTraceDiffStore.getState();
      const oldCohort = oldState.cohort;
      useTraceDiffStore.getState().cohortRemoveTrace(oldState.b!);
      const newState = useTraceDiffStore.getState();
      const newCohort = newState.cohort;
      expect(newState.b).toBe(null);
      expect(newCohort).not.toBe(oldCohort);
      expect(newCohort.includes(oldState.b!)).toBe(false);
      expect(newCohort).toEqual(oldCohort.filter(entry => entry !== oldState.b));
    });

    it('returns original cohort if traceID not in state', () => {
      const cohortBefore = [...useTraceDiffStore.getState().cohort];
      useTraceDiffStore.getState().cohortRemoveTrace(newTraceId);
      expect(useTraceDiffStore.getState().cohort).toEqual(cohortBefore);
    });
  });

  describe('diffSetA', () => {
    it('set a to provided traceId', () => {
      useTraceDiffStore.getState().diffSetA(newTraceId);
      expect(useTraceDiffStore.getState().a).toBe(newTraceId);
    });
  });

  describe('diffSetB', () => {
    it('set b to provided traceId', () => {
      useTraceDiffStore.getState().diffSetB(newTraceId);
      expect(useTraceDiffStore.getState().b).toBe(newTraceId);
    });
  });

  describe('forceState', () => {
    it('replaces a, b, cohort', () => {
      const newState = newInitialState();
      useTraceDiffStore.getState().forceState(newState);
      expect(useTraceDiffStore.getState().a).toBe(null);
      expect(useTraceDiffStore.getState().b).toBe(null);
      expect(useTraceDiffStore.getState().cohort).toEqual([]);
      expect(useTraceDiffStore.getState().cohortSummaries.size).toBe(0);
    });

    it('keeps cohortSummaries only for IDs in the new cohort', () => {
      const summary0 = makeSummary(initialCohort[0]);
      const summary1 = makeSummary(initialCohort[1]);
      const summary2 = makeSummary(initialCohort[2]);
      useTraceDiffStore.setState({
        cohort: [...initialCohort],
        cohortSummaries: new Map([
          [initialCohort[0], summary0],
          [initialCohort[1], summary1],
          [initialCohort[2], summary2],
        ]),
      });

      useTraceDiffStore.getState().forceState({
        cohort: [initialCohort[0], initialCohort[2]],
        a: initialCohort[0],
        b: initialCohort[2],
      });

      const { cohortSummaries } = useTraceDiffStore.getState();
      expect(cohortSummaries.size).toBe(2);
      expect(cohortSummaries.get(initialCohort[0])).toEqual(summary0);
      expect(cohortSummaries.get(initialCohort[2])).toEqual(summary2);
      expect(cohortSummaries.has(initialCohort[1])).toBe(false);
    });
  });
});
