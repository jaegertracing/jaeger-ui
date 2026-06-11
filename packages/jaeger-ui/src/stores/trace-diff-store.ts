// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import TTraceDiffState from '../types/TTraceDiffState';
import type { TraceSummary } from '../types/trace-summary';

// Trace comparison ("diff") state. The store holds:
//   - `cohort`: trace IDs the user has marked for comparison from SearchResults.
//   - `cohortSummaries`: a keyed cache of TraceSummary objects so the diff
//     view can render row info for cohort entries without re-fetching.
//   - `a`, `b`: the two cohort entries currently selected as the left/right
//     sides of the diff view.
//
// Data-flow:
//   - On the Search page, clicking the row checkbox calls `addTraceToCohort`
//     / `removeTraceFromCohort`. These are the only direct writes to `cohort`
//     and `cohortSummaries`.
//   - On the TraceDiff page, `a`, `b`, and `cohort` are derived from the URL
//     (`mapStateToProps` in `TraceDiff.tsx`) and pushed into the store via
//     `hydrateCohort` so other components (e.g. TopNav's "Compare" link) can
//     observe them. The URL is the source of truth on that page; the store
//     is downstream.

export function newInitialState(): TTraceDiffState {
  // Empty state for a fresh app load (no cohort, no diff selection).
  // Exported so tests and the URL-restoration code can build a known-empty
  // snapshot without depending on store internals.
  return {
    cohort: [],
    a: null,
    b: null,
  };
}

type TTraceDiffStateWithSummaries = TTraceDiffState & {
  cohortSummaries: Map<string, TraceSummary>;
};

// When `hydrateCohort` replaces the cohort wholesale, summaries for trace
// IDs no longer in the cohort would otherwise leak. Keep only the entries
// whose key is still in the new cohort. IDs that appear in the new cohort
// but have no cached summary are silently skipped here — the user will see
// a placeholder row on the diff page until they navigate back to Search
// and the summary gets fetched again.
function filterSummariesForCohort(
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

// Pure state transform for "user added trace to comparison cohort".
//
// Appends `summary.traceID` to `cohort` (no-op if already present) AND
// inserts/updates the summary in `cohortSummaries`. Both writes happen
// unconditionally so the store invariant — `cohort.includes(id)` iff
// `cohortSummaries.has(id)` — holds after every call. Re-adding an existing
// ID is the path that updates a summary in-place when the underlying trace
// summary changes (e.g. uploaded data refresh).
function addTraceToCohort(
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

// Pure state transform for "user removed trace from comparison cohort".
//
// Drops the trace ID from `cohort`, drops its summary, and — critically —
// clears it from `a` and/or `b` if it was currently selected for the diff.
// If the diff page is later opened, those slots will be repopulated from
// the URL. No-op if the ID isn't in the cohort to begin with.
function removeTraceFromCohort(
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

type TraceDiffStore = TTraceDiffStateWithSummaries & {
  addTraceToCohort: (summary: TraceSummary) => void;
  removeTraceFromCohort: (traceID: string) => void;
  hydrateCohort: (newState: TTraceDiffState) => void;
};

// Strips the action functions off the store object so the pure
// state-transform helpers operate on just the state slice. Without this,
// the `set()` calls below would spread the actions through the helpers and
// back into the store, which works but obscures the data flow.
function pickState(s: TraceDiffStore): TTraceDiffStateWithSummaries {
  return { a: s.a, b: s.b, cohort: s.cohort, cohortSummaries: s.cohortSummaries };
}

export const useTraceDiffStore = create<TraceDiffStore>((set, _get) => ({
  ...newInitialState(),
  cohortSummaries: new Map(),

  // See the `addTraceToCohort` state-transform above. Called from the
  // SearchResults row checkbox to add a trace (with its summary) to the
  // comparison cohort.
  addTraceToCohort: summary => set(s => addTraceToCohort(pickState(s), summary)),

  // See the `removeTraceFromCohort` state-transform above. Called from the
  // SearchResults row checkbox and the "Clear all" button on the diff
  // selection panel.
  removeTraceFromCohort: traceID => set(s => removeTraceFromCohort(pickState(s), traceID)),

  // URL-driven cohort restoration. The TraceDiff page is the only writer
  // for `a` and `b`: when the URL changes, it derives `{ a, b, cohort }`
  // from the URL and calls `hydrateCohort` to push the snapshot into the
  // store. This is the only path that writes `a` / `b` — the previous
  // `selectDiffA` / `selectDiffB` direct setters existed but were never
  // called, since the diff page is URL-driven (clicking changes the URL,
  // not the store).
  //
  // Summaries are filtered down to entries still in the new cohort to
  // avoid leaking stale ones across navigations.
  hydrateCohort: newState =>
    set(s => {
      const cohort = Array.isArray(newState.cohort) ? [...newState.cohort] : [];
      return {
        a: newState.a ?? null,
        b: newState.b ?? null,
        cohort,
        cohortSummaries: filterSummariesForCohort(s.cohortSummaries, cohort),
      };
    }),
}));
