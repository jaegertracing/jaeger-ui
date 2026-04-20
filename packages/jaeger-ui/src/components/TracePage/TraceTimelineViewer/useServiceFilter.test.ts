// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../url/svcFilter', () => ({
  decodeSvcFilter: vi.fn(() => null),
  encodeSvcFilter: vi.fn(() => null),
  getSortedServiceNames: vi.fn(() => []),
}));

import { decodeSvcFilter, encodeSvcFilter } from '../url/svcFilter';
import { resolveInitialFilter, buildFilterSearch } from './useServiceFilter';

describe('resolveInitialFilter', () => {
  beforeEach(() => {
    vi.mocked(decodeSvcFilter).mockReturnValue(null);
    localStorage.clear();
  });

  it('returns empty pruned set when no svcFilter in URL and no localStorage', () => {
    const result = resolveInitialFilter('', ['svc-a', 'svc-b']);
    expect(result.pruned.size).toBe(0);
    expect(result.cleanSearch).toBeUndefined();
  });

  it('decodes svcFilter from URL when valid', () => {
    vi.mocked(decodeSvcFilter).mockReturnValue({
      visibleServices: new Set(['svc-a']),
      stale: false,
    });
    const result = resolveInitialFilter('?svcFilter=abc.1', ['svc-a', 'svc-b']);
    expect(result.pruned).toEqual(new Set(['svc-b']));
    expect(result.cleanSearch).toBeUndefined();
  });

  it('returns cleanSearch when svcFilter is stale', () => {
    vi.mocked(decodeSvcFilter).mockReturnValue({ visibleServices: new Set(), stale: true });
    const result = resolveInitialFilter('?svcFilter=stale.ff&uiFind=foo', ['svc-a', 'svc-b']);
    expect(result.pruned.size).toBe(0);
    expect(result.cleanSearch).toBe('?uiFind=foo');
  });

  it('returns empty cleanSearch when stale svcFilter is the only param', () => {
    vi.mocked(decodeSvcFilter).mockReturnValue({ visibleServices: new Set(), stale: true });
    const result = resolveInitialFilter('?svcFilter=stale.ff', ['svc-a']);
    expect(result.cleanSearch).toBe('');
  });

  it('reads localStorage defaults when no svcFilter in URL', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    const result = resolveInitialFilter('', ['svc-a', 'svc-b', 'svc-c']);
    expect(result.pruned).toEqual(new Set(['svc-b']));
  });

  it('ignores localStorage defaults that prune unknown services', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['unknown'] }));
    const result = resolveInitialFilter('', ['svc-a', 'svc-b']);
    expect(result.pruned.size).toBe(0);
  });

  it('ignores localStorage defaults that would prune all services', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-a', 'svc-b'] }));
    const result = resolveInitialFilter('', ['svc-a', 'svc-b']);
    expect(result.pruned.size).toBe(0);
  });

  it('ignores malformed localStorage', () => {
    localStorage.setItem('svcFilter.defaults', 'not-json');
    const result = resolveInitialFilter('', ['svc-a']);
    expect(result.pruned.size).toBe(0);
  });
});

describe('buildFilterSearch', () => {
  beforeEach(() => {
    vi.mocked(encodeSvcFilter).mockReturnValue(null);
  });

  it('removes svcFilter when no services are pruned', () => {
    const search = buildFilterSearch('?svcFilter=old.1&uiFind=foo', ['svc-a', 'svc-b'], new Set());
    expect(search).toBe('?uiFind=foo');
  });

  it('returns empty string when clearing the only param', () => {
    const search = buildFilterSearch('?svcFilter=old.1', ['svc-a'], new Set());
    expect(search).toBe('');
  });

  it('sets svcFilter when services are pruned', () => {
    vi.mocked(encodeSvcFilter).mockReturnValue('abc.1');
    const search = buildFilterSearch('', ['svc-a', 'svc-b'], new Set(['svc-b']));
    expect(search).toBe('?svcFilter=abc.1');
  });

  it('preserves existing URL params alongside svcFilter', () => {
    vi.mocked(encodeSvcFilter).mockReturnValue('abc.1');
    const search = buildFilterSearch('?uiFind=hello', ['svc-a', 'svc-b'], new Set(['svc-b']));
    expect(search).toContain('uiFind=hello');
    expect(search).toContain('svcFilter=abc.1');
  });

  it('removes svcFilter when encodeSvcFilter returns null', () => {
    vi.mocked(encodeSvcFilter).mockReturnValue(null);
    const search = buildFilterSearch('?svcFilter=old.1', ['svc-a'], new Set(['svc-a']));
    expect(search).toBe('');
  });
});
