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
  const roots = new Set(['svc-a']);

  beforeEach(() => {
    vi.mocked(decodeSvcFilter).mockReturnValue(null);
    localStorage.clear();
  });

  it('returns empty pruned set when no svcFilter in URL and no localStorage', () => {
    const result = resolveInitialFilter('', ['svc-a', 'svc-b'], roots);
    expect(result.pruned.size).toBe(0);
    expect(result.cleanSearch).toBeUndefined();
  });

  it('decodes svcFilter from URL when valid', () => {
    vi.mocked(decodeSvcFilter).mockReturnValue({
      visibleServices: new Set(['svc-a']),
      stale: false,
    });
    const result = resolveInitialFilter('?svcFilter=abc.1', ['svc-a', 'svc-b'], roots);
    expect(result.pruned).toEqual(new Set(['svc-b']));
    expect(result.cleanSearch).toBeUndefined();
  });

  it('returns cleanSearch when svcFilter is stale', () => {
    vi.mocked(decodeSvcFilter).mockReturnValue({ visibleServices: new Set(), stale: true });
    const result = resolveInitialFilter('?svcFilter=stale.ff&uiFind=foo', ['svc-a', 'svc-b'], roots);
    expect(result.pruned.size).toBe(0);
    expect(result.cleanSearch).toBe('?uiFind=foo');
  });

  it('returns empty cleanSearch when stale svcFilter is the only param', () => {
    vi.mocked(decodeSvcFilter).mockReturnValue({ visibleServices: new Set(), stale: true });
    const result = resolveInitialFilter('?svcFilter=stale.ff', ['svc-a'], roots);
    expect(result.cleanSearch).toBe('');
  });

  it('reads localStorage defaults when no svcFilter in URL', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    const result = resolveInitialFilter('', ['svc-a', 'svc-b', 'svc-c'], roots);
    expect(result.pruned).toEqual(new Set(['svc-b']));
  });

  it('ignores localStorage defaults that prune unknown services', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['unknown'] }));
    const result = resolveInitialFilter('', ['svc-a', 'svc-b'], roots);
    expect(result.pruned.size).toBe(0);
  });

  it('ignores localStorage defaults that would prune all services', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-a', 'svc-b'] }));
    const result = resolveInitialFilter('', ['svc-a', 'svc-b'], roots);
    expect(result.pruned.size).toBe(0);
  });

  it('ignores malformed localStorage', () => {
    localStorage.setItem('svcFilter.defaults', 'not-json');
    const result = resolveInitialFilter('', ['svc-a'], roots);
    expect(result.pruned.size).toBe(0);
  });

  describe('root service sanitization', () => {
    it('removes sole root service from pruned set (URL)', () => {
      vi.mocked(decodeSvcFilter).mockReturnValue({
        visibleServices: new Set(['svc-b']),
        stale: false,
      });
      // URL tries to prune svc-a (the sole root)
      const result = resolveInitialFilter('?svcFilter=abc.2', ['svc-a', 'svc-b'], new Set(['svc-a']));
      expect(result.pruned.has('svc-a')).toBe(false);
    });

    it('removes sole root service from pruned set (localStorage)', () => {
      localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-a', 'svc-b'] }));
      const result = resolveInitialFilter('', ['svc-a', 'svc-b', 'svc-c'], new Set(['svc-a']));
      expect(result.pruned.has('svc-a')).toBe(false);
      expect(result.pruned.has('svc-b')).toBe(true);
    });

    it('discards filter when all root services would be pruned (multi-root)', () => {
      vi.mocked(decodeSvcFilter).mockReturnValue({
        visibleServices: new Set(['svc-c']),
        stale: false,
      });
      // Both roots pruned
      const result = resolveInitialFilter(
        '?svcFilter=abc.4',
        ['svc-a', 'svc-b', 'svc-c'],
        new Set(['svc-a', 'svc-b'])
      );
      expect(result.pruned.size).toBe(0);
    });

    it('keeps filter when at least one root service is visible (multi-root)', () => {
      vi.mocked(decodeSvcFilter).mockReturnValue({
        visibleServices: new Set(['svc-a', 'svc-c']),
        stale: false,
      });
      // svc-b (a root) is pruned but svc-a (also a root) is visible
      const result = resolveInitialFilter(
        '?svcFilter=abc.5',
        ['svc-a', 'svc-b', 'svc-c'],
        new Set(['svc-a', 'svc-b'])
      );
      expect(result.pruned).toEqual(new Set(['svc-b']));
    });
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
