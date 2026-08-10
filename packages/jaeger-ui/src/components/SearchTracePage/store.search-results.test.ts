// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSearchResultsStore } from './store.search-results';

// Exercises the store's real initial state via a fresh module import, rather than
// asserting against a value the test itself set up — the singleton store created at
// module load time is shared (and mutated) across the other tests in this file.
describe('useSearchResultsStore — default state', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('defaults startTimeDisplay to absolute on a fresh store', async () => {
    const { useSearchResultsStore: freshStore } = await import('./store.search-results');
    expect(freshStore.getState().startTimeDisplay).toBe('absolute');
  });
});

describe('useSearchResultsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSearchResultsStore.setState({ viewMode: 'table', startTimeDisplay: 'absolute' });
  });

  it('setStartTimeDisplay updates startTimeDisplay', () => {
    useSearchResultsStore.getState().setStartTimeDisplay('relative');
    expect(useSearchResultsStore.getState().startTimeDisplay).toBe('relative');
  });

  it('setStartTimeDisplay persists to localStorage', () => {
    useSearchResultsStore.getState().setStartTimeDisplay('relative');
    const stored = JSON.parse(localStorage.getItem('jaeger.search-results.mode') ?? '{}');
    expect(stored.state.startTimeDisplay).toBe('relative');
  });

  it('persists startTimeDisplay independently of viewMode', () => {
    useSearchResultsStore.getState().setViewMode('list');
    useSearchResultsStore.getState().setStartTimeDisplay('relative');
    const stored = JSON.parse(localStorage.getItem('jaeger.search-results.mode') ?? '{}');
    expect(stored.state.viewMode).toBe('list');
    expect(stored.state.startTimeDisplay).toBe('relative');
  });
});
