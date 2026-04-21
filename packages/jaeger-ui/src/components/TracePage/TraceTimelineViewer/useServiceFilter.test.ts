// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

const mockNavigate = vi.fn();
const mockSetPrunedServices = vi.fn();
const mockStoreState = {
  prunedServices: new Set<string>(),
  setPrunedServices: mockSetPrunedServices,
  detailStates: new Map(),
};

vi.mock('react-router-dom', () => ({
  useLocation: vi.fn(() => ({ search: '', pathname: '/trace/abc' })),
  useNavigate: vi.fn(() => mockNavigate),
}));

vi.mock('./store', () => ({
  useTraceTimelineStore: Object.assign(
    vi.fn((selector: (s: typeof mockStoreState) => unknown) => selector(mockStoreState)),
    {
      getState: () => mockStoreState,
      setState: vi.fn((partial: Partial<typeof mockStoreState>) => Object.assign(mockStoreState, partial)),
    }
  ),
  getSelectedSpanID: (detailStates: Map<string, unknown>) =>
    detailStates.size > 0 ? (detailStates.keys().next().value as string) : null,
}));

vi.mock('./generateRowStates', async importOriginal => {
  const actual = await importOriginal<typeof import('./generateRowStates')>();
  return actual;
});

let capturedOnApply: ((pruned: Set<string>) => void) | null = null;
vi.mock('./ServiceFilter', () => ({
  default: (props: { onApply: (pruned: Set<string>) => void }) => {
    capturedOnApply = props.onApply;
    return null;
  },
}));

vi.mock('../url/svcFilter', async importOriginal => {
  const actual = await importOriginal<typeof import('../url/svcFilter')>();
  return {
    ...actual,
    decodeSvcFilter: vi.fn(() => null),
    encodeSvcFilter: vi.fn(() => null),
    getSortedServiceNames: vi.fn((services: Array<{ name: string }>) => services.map(s => s.name).sort()),
  };
});

import { useLocation } from 'react-router-dom';
import { useTraceTimelineStore } from './store';
import { decodeSvcFilter, encodeSvcFilter } from '../url/svcFilter';
import { resolveInitialFilter, buildFilterSearch, useServiceFilter } from './useServiceFilter';
import { IOtelSpan, IOtelTrace } from '../../../types/otel';

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

  it('discards stale svcFilter and returns all-visible (ignores localStorage)', () => {
    vi.mocked(decodeSvcFilter).mockReturnValue({ visibleServices: new Set(), stale: true });
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    const result = resolveInitialFilter('?svcFilter=stale.ff&uiFind=foo', ['svc-a', 'svc-b', 'svc-c'], roots);
    expect(result.pruned.size).toBe(0);
    expect(result.cleanSearch).toBe('?uiFind=foo');
  });

  it('returns empty cleanSearch when stale svcFilter is the only param', () => {
    vi.mocked(decodeSvcFilter).mockReturnValue({ visibleServices: new Set(), stale: true });
    const result = resolveInitialFilter('?svcFilter=stale.ff', ['svc-a'], roots);
    expect(result.pruned.size).toBe(0);
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
    it('removes sole root service from pruned set and cleans URL when filter becomes empty', () => {
      vi.mocked(decodeSvcFilter).mockReturnValue({
        visibleServices: new Set(['svc-b']),
        stale: false,
      });
      // URL tries to prune only svc-a (the sole root) — sanitization empties the filter
      const result = resolveInitialFilter('?svcFilter=abc.2', ['svc-a', 'svc-b'], new Set(['svc-a']));
      expect(result.pruned.has('svc-a')).toBe(false);
      expect(result.pruned.size).toBe(0);
      expect(result.cleanSearch).toBe('');
    });

    it('removes sole root service but keeps other pruned services', () => {
      vi.mocked(decodeSvcFilter).mockReturnValue({
        visibleServices: new Set(['svc-c']),
        stale: false,
      });
      // URL prunes svc-a (root) and svc-b — sanitization keeps svc-b pruned
      const result = resolveInitialFilter(
        '?svcFilter=abc.4',
        ['svc-a', 'svc-b', 'svc-c'],
        new Set(['svc-a'])
      );
      expect(result.pruned.has('svc-a')).toBe(false);
      expect(result.pruned).toEqual(new Set(['svc-b']));
      expect(result.cleanSearch).toBeUndefined();
    });

    it('removes sole root service from pruned set (localStorage)', () => {
      localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-a', 'svc-b'] }));
      const result = resolveInitialFilter('', ['svc-a', 'svc-b', 'svc-c'], new Set(['svc-a']));
      expect(result.pruned.has('svc-a')).toBe(false);
      expect(result.pruned.has('svc-b')).toBe(true);
    });

    it('discards filter and cleans URL when all root services would be pruned (multi-root)', () => {
      vi.mocked(decodeSvcFilter).mockReturnValue({
        visibleServices: new Set(['svc-c']),
        stale: false,
      });
      // Both roots pruned — sanitization empties the filter, URL should be cleaned
      const result = resolveInitialFilter(
        '?svcFilter=abc.4',
        ['svc-a', 'svc-b', 'svc-c'],
        new Set(['svc-a', 'svc-b'])
      );
      expect(result.pruned.size).toBe(0);
      expect(result.cleanSearch).toBe('');
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

describe('useServiceFilter hook', () => {
  function makeTrace(serviceNames: string[], rootServiceNames?: string[]): IOtelTrace {
    const services = serviceNames.map(name => ({ name, numberOfSpans: 3 }));
    const roots = rootServiceNames ?? [serviceNames[0]];
    const rootSpans = roots.map((name, i) => ({
      spanID: `root-${i}`,
      resource: { serviceName: name, attributes: [] },
    })) as unknown as IOtelSpan[];
    return {
      traceID: 'trace-1',
      services,
      rootSpans,
      spans: [],
      spanMap: new Map(),
    } as unknown as IOtelTrace;
  }

  beforeEach(() => {
    mockNavigate.mockClear();
    mockSetPrunedServices.mockClear();
    mockStoreState.prunedServices = new Set();
    mockStoreState.detailStates = new Map();
    capturedOnApply = null;
    vi.mocked(useLocation).mockReturnValue({ search: '', pathname: '/trace/abc' } as ReturnType<
      typeof useLocation
    >);
    vi.mocked(decodeSvcFilter).mockReturnValue(null);
    vi.mocked(encodeSvcFilter).mockReturnValue(null);
    (useTraceTimelineStore as unknown as { setState: ReturnType<typeof vi.fn> }).setState.mockClear();
    localStorage.clear();
  });

  it('returns prunedServices and serviceFilterNode', () => {
    const { result } = renderHook(() => useServiceFilter(makeTrace(['svc-a', 'svc-b']), 'inline'));
    expect(result.current.prunedServices).toBeInstanceOf(Set);
    expect(result.current.serviceFilterNode).toBeDefined();
  });

  it('skips setPrunedServices when resolved set equals current state (no-op guard)', () => {
    // Store already has empty set; resolved is also empty → no write.
    renderHook(() => useServiceFilter(makeTrace(['svc-a', 'svc-b']), 'inline'));
    expect(mockSetPrunedServices).not.toHaveBeenCalled();
  });

  it('decodes svcFilter from URL on mount', () => {
    vi.mocked(useLocation).mockReturnValue({
      search: '?svcFilter=abc.1',
      pathname: '/trace/abc',
    } as ReturnType<typeof useLocation>);
    vi.mocked(decodeSvcFilter).mockReturnValue({
      visibleServices: new Set(['svc-a']),
      stale: false,
    });
    renderHook(() => useServiceFilter(makeTrace(['svc-a', 'svc-b']), 'inline'));
    expect(mockSetPrunedServices).toHaveBeenCalledWith(new Set(['svc-b']));
  });

  it('navigates to clean URL when svcFilter is stale', () => {
    vi.mocked(useLocation).mockReturnValue({
      search: '?svcFilter=stale.ff',
      pathname: '/trace/abc',
    } as ReturnType<typeof useLocation>);
    vi.mocked(decodeSvcFilter).mockReturnValue({ visibleServices: new Set(), stale: true });
    renderHook(() => useServiceFilter(makeTrace(['svc-a']), 'inline'));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/trace/abc', search: '' }),
      { replace: true }
    );
  });

  it('reads localStorage defaults when no URL svcFilter', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    renderHook(() => useServiceFilter(makeTrace(['svc-a', 'svc-b', 'svc-c']), 'inline'));
    expect(mockSetPrunedServices).toHaveBeenCalledWith(new Set(['svc-b']));
  });

  function HookRenderer({ trace, mode }: { trace: IOtelTrace; mode: 'inline' | 'sidepanel' }) {
    const { serviceFilterNode } = useServiceFilter(trace, mode);
    return React.createElement('div', null, serviceFilterNode);
  }

  it('clears selected span in sidepanel mode when its service is pruned via onApply', () => {
    const selectedSpanID = 'span-x';
    const selectedSpan = {
      resource: { serviceName: 'svc-b' },
      parentSpan: undefined,
    } as unknown as IOtelSpan;
    mockStoreState.detailStates = new Map([[selectedSpanID, {}]]) as typeof mockStoreState.detailStates;
    const trace = makeTrace(['svc-a', 'svc-b']);
    (trace as unknown as { spanMap: Map<string, IOtelSpan> }).spanMap = new Map([
      [selectedSpanID, selectedSpan],
    ]);

    render(React.createElement(HookRenderer, { trace, mode: 'sidepanel' }));

    expect(capturedOnApply).not.toBeNull();
    capturedOnApply!(new Set(['svc-b']));

    const storeSetState = (useTraceTimelineStore as unknown as { setState: ReturnType<typeof vi.fn> })
      .setState;
    expect(storeSetState).toHaveBeenCalledWith(expect.objectContaining({ detailStates: new Map() }));
  });

  it('does not clear detailStates in inline mode when service is pruned via onApply', () => {
    const selectedSpanID = 'span-x';
    const selectedSpan = {
      resource: { serviceName: 'svc-b' },
      parentSpan: undefined,
    } as unknown as IOtelSpan;
    mockStoreState.detailStates = new Map([[selectedSpanID, {}]]) as typeof mockStoreState.detailStates;
    const trace = makeTrace(['svc-a', 'svc-b']);
    (trace as unknown as { spanMap: Map<string, IOtelSpan> }).spanMap = new Map([
      [selectedSpanID, selectedSpan],
    ]);

    render(React.createElement(HookRenderer, { trace, mode: 'inline' }));

    expect(capturedOnApply).not.toBeNull();
    capturedOnApply!(new Set(['svc-b']));

    const storeSetState = (useTraceTimelineStore as unknown as { setState: ReturnType<typeof vi.fn> })
      .setState;
    expect(storeSetState).not.toHaveBeenCalled();
  });
});
