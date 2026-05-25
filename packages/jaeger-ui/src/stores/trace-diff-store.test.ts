// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { newInitialState, useTraceDiffStore } from './trace-diff-store';
import type { TraceSummary } from '../types/trace-summary';

describe('trace-diff-store', () => {
  const initialCohort = ['trace-id-0', 'trace-id-1', 'trace-id-2'];
  const newTraceId = 'new-trace-id';

  beforeEach(() => {
    useTraceDiffStore.setState({
      a: initialCohort[0],
      b: initialCohort[1],
      cohort: [...initialCohort],
      cohortSummaries: {},
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

      useTraceDiffStore.getState().cohortAddTrace(newTraceId);
      const newCohort = useTraceDiffStore.getState().cohort;
      expect(newCohort).not.toBe(oldCohort);
      expect(newCohort.includes(newTraceId)).toBe(true);
      expect(newCohort).toEqual(expect.arrayContaining(oldCohort));
    });

    it('returns original cohort if traceID already exists in state', () => {
      useTraceDiffStore.getState().cohortAddTrace(initialCohort[0]);
      const cohort = useTraceDiffStore.getState().cohort;
      expect(cohort).toEqual(initialCohort);
    });

    it('stores summary when provided', () => {
      const summary = {
        traceID: newTraceId,
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
      useTraceDiffStore.getState().cohortAddTrace(newTraceId, summary);
      expect(useTraceDiffStore.getState().cohortSummaries[newTraceId]).toEqual(summary);
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
      expect(useTraceDiffStore.getState().cohortSummaries[initialCohort[2]]).toBeUndefined();
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
      expect(useTraceDiffStore.getState().cohortSummaries).toEqual({});
    });
  });
});
