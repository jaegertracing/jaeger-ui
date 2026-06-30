// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from 'vitest';
import { useSearchResultsStore } from './store.search-results';

describe('useSearchResultsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSearchResultsStore.setState({ viewMode: 'table', startTimeDisplay: 'absolute' });
  });

  it('defaults startTimeDisplay to absolute', () => {
    expect(useSearchResultsStore.getState().startTimeDisplay).toBe('absolute');
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
