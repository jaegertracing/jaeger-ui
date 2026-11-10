// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

const mockNavigate = vi.fn();
const mockSetSpanFilter = vi.fn();
const mockStoreState = {
  spanFilter: EMPTY_SPAN_FILTER as ISpanFilter,
  setSpanFilter: mockSetSpanFilter,
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
import {
  EMPTY_SPAN_FILTER,
  hiddenServices,
  IClause,
  ISpanFilter,
  spanFiltersEqual,
  withHiddenServices,
} from '../spanFilter';
import { IOtelSpan, IOtelTrace } from '../../../types/otel';

const serviceFilter = (...services: string[]): ISpanFilter =>
  withHiddenServices(EMPTY_SPAN_FILTER, new Set(services));

describe('resolveInitialFilter', () => {
  const roots = new Set(['svc-a']);

  beforeEach(() => {
    vi.mocked(decodeSvcFilter).mockReturnValue(null);
    localStorage.clear();
  });

  it('returns empty pruned set when no svcFilter in URL and no localStorage', () => {
    const result = resolveInitialFilter('', ['svc-a', 'svc-b'], roots);
    expect(hiddenServices(result.filter).size).toBe(0);
    expect(result.cleanSearch).toBeUndefined();
  });

  it('decodes svcFilter from URL when valid', () => {
    vi.mocked(decodeSvcFilter).mockReturnValue({
      visibleServices: new Set(['svc-a']),
      stale: false,
    });
    const result = resolveInitialFilter('?svcFilter=abc.1', ['svc-a', 'svc-b'], roots);
    expect(hiddenServices(result.filter)).toEqual(new Set(['svc-b']));
    expect(result.cleanSearch).toBeUndefined();
  });

  it('discards stale svcFilter and returns all-visible (ignores localStorage)', () => {
    vi.mocked(decodeSvcFilter).mockReturnValue({ visibleServices: new Set(), stale: true });
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    const result = resolveInitialFilter('?svcFilter=stale.ff&uiFind=foo', ['svc-a', 'svc-b', 'svc-c'], roots);
    expect(hiddenServices(result.filter).size).toBe(0);
    expect(result.cleanSearch).toBe('?uiFind=foo');
  });

  it('returns empty cleanSearch when stale svcFilter is the only param', () => {
    vi.mocked(decodeSvcFilter).mockReturnValue({ visibleServices: new Set(), stale: true });
    const result = resolveInitialFilter('?svcFilter=stale.ff', ['svc-a'], roots);
    expect(hiddenServices(result.filter).size).toBe(0);
    expect(result.cleanSearch).toBe('');
  });

  it('reads localStorage defaults when no svcFilter in URL', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    const result = resolveInitialFilter('', ['svc-a', 'svc-b', 'svc-c'], roots);
    expect(hiddenServices(result.filter)).toEqual(new Set(['svc-b']));
  });

  it('ignores localStorage defaults that prune unknown services', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['unknown'] }));
    const result = resolveInitialFilter('', ['svc-a', 'svc-b'], roots);
    expect(hiddenServices(result.filter).size).toBe(0);
  });

  it('ignores localStorage defaults that would prune all services', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-a', 'svc-b'] }));
    const result = resolveInitialFilter('', ['svc-a', 'svc-b'], roots);
    expect(hiddenServices(result.filter).size).toBe(0);
  });

  it('ignores malformed localStorage', () => {
    localStorage.setItem('svcFilter.defaults', 'not-json');
    const result = resolveInitialFilter('', ['svc-a'], roots);
    expect(hiddenServices(result.filter).size).toBe(0);
  });

  it('reads f clauses from the URL', () => {
    const result = resolveInitialFilter('?f=k%3Astatus%3Aerror&f=h%3Atext%3Afoo', ['svc-a'], roots);
    expect(result.filter).toEqual({
      clauses: [
        { verb: 'keep', criterion: { shape: 'set', property: 'status', values: ['error'] } },
        { verb: 'hide', criterion: { shape: 'text', text: 'foo' } },
      ],
      treeMode: 'remove',
    });
    expect(result.cleanSearch).toBeUndefined();
  });

  it('drops a malformed f clause and keeps the rest', () => {
    const result = resolveInitialFilter('?f=nonsense&f=k%3Astatus%3Aerror', ['svc-a'], roots);
    expect(result.filter.clauses).toEqual([
      { verb: 'keep', criterion: { shape: 'set', property: 'status', values: ['error'] } },
    ]);
  });

  it('combines svcFilter with f clauses', () => {
    vi.mocked(decodeSvcFilter).mockReturnValue({ visibleServices: new Set(['svc-a']), stale: false });
    const result = resolveInitialFilter('?svcFilter=abc.1&f=k%3Astatus%3Aerror', ['svc-a', 'svc-b'], roots);
    expect(result.filter.clauses).toEqual([
      { verb: 'keep', criterion: { shape: 'set', property: 'status', values: ['error'] } },
      { verb: 'hide', criterion: { shape: 'set', property: 'service', values: ['svc-b'] } },
    ]);
    expect(result.cleanSearch).toBeUndefined();
  });

  it('ignores a hide clause on service in f, which only svcFilter carries', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    const result = resolveInitialFilter('?f=h%3Aservice%3Asvc-a', ['svc-a', 'svc-b', 'svc-c'], roots);
    expect(result.filter).toEqual(serviceFilter('svc-b'));
    expect(result.cleanSearch).toBeUndefined();
  });

  it('applies the saved default next to the f clauses when the URL has no svcFilter', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    const result = resolveInitialFilter('?f=k%3Astatus%3Aerror', ['svc-a', 'svc-b', 'svc-c'], roots);
    expect(result.filter.clauses).toEqual([
      { verb: 'keep', criterion: { shape: 'set', property: 'status', values: ['error'] } },
      { verb: 'hide', criterion: { shape: 'set', property: 'service', values: ['svc-b'] } },
    ]);
  });

  it('falls through to the saved default when every f value is malformed', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    const result = resolveInitialFilter('?f=garbage&f=', ['svc-a', 'svc-b', 'svc-c'], roots);
    expect(result.filter).toEqual(serviceFilter('svc-b'));
  });

  it('falls through to the saved default when svcFilter is empty', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    const result = resolveInitialFilter('?svcFilter=', ['svc-a', 'svc-b', 'svc-c'], roots);
    expect(hiddenServices(result.filter)).toEqual(new Set(['svc-b']));
  });

  describe('root service sanitization', () => {
    it('removes sole root service from pruned set and cleans URL when filter becomes empty', () => {
      vi.mocked(decodeSvcFilter).mockReturnValue({
        visibleServices: new Set(['svc-b']),
        stale: false,
      });
      // URL tries to prune only svc-a (the sole root) — sanitization empties the filter
      const result = resolveInitialFilter('?svcFilter=abc.2', ['svc-a', 'svc-b'], new Set(['svc-a']));
      expect(hiddenServices(result.filter).has('svc-a')).toBe(false);
      expect(hiddenServices(result.filter).size).toBe(0);
      expect(result.cleanSearch).toBe('');
    });

    it('removes sole root service but keeps other pruned services and normalizes URL', () => {
      vi.mocked(decodeSvcFilter).mockReturnValue({
        visibleServices: new Set(['svc-c']),
        stale: false,
      });
      // URL prunes svc-a (root) and svc-b — sanitization keeps svc-b pruned
      // and normalizes the URL since the filter changed
      const result = resolveInitialFilter(
        '?svcFilter=abc.4',
        ['svc-a', 'svc-b', 'svc-c'],
        new Set(['svc-a'])
      );
      expect(hiddenServices(result.filter).has('svc-a')).toBe(false);
      expect(hiddenServices(result.filter)).toEqual(new Set(['svc-b']));
      expect(result.cleanSearch).toBeDefined();
    });

    it('removes sole root service from pruned set (localStorage)', () => {
      localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-a', 'svc-b'] }));
      const result = resolveInitialFilter('', ['svc-a', 'svc-b', 'svc-c'], new Set(['svc-a']));
      expect(hiddenServices(result.filter).has('svc-a')).toBe(false);
      expect(hiddenServices(result.filter).has('svc-b')).toBe(true);
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
      expect(hiddenServices(result.filter).size).toBe(0);
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
      expect(hiddenServices(result.filter)).toEqual(new Set(['svc-b']));
    });
  });
});

describe('buildFilterSearch', () => {
  beforeEach(() => {
    vi.mocked(encodeSvcFilter).mockReturnValue(null);
  });

  it('removes svcFilter when no services are pruned', () => {
    const search = buildFilterSearch('?svcFilter=old.1&uiFind=foo', ['svc-a', 'svc-b'], EMPTY_SPAN_FILTER);
    expect(search).toBe('?uiFind=foo');
  });

  it('returns empty string when clearing the only param', () => {
    const search = buildFilterSearch('?svcFilter=old.1', ['svc-a'], EMPTY_SPAN_FILTER);
    expect(search).toBe('');
  });

  it('sets svcFilter when services are pruned', () => {
    vi.mocked(encodeSvcFilter).mockReturnValue('abc.1');
    const search = buildFilterSearch('', ['svc-a', 'svc-b'], serviceFilter('svc-b'));
    expect(search).toBe('?svcFilter=abc.1');
  });

  it('preserves existing URL params alongside svcFilter', () => {
    vi.mocked(encodeSvcFilter).mockReturnValue('abc.1');
    const search = buildFilterSearch('?uiFind=hello', ['svc-a', 'svc-b'], serviceFilter('svc-b'));
    expect(search).toContain('uiFind=hello');
    expect(search).toContain('svcFilter=abc.1');
  });

  it('writes every clause other than the service hide set as an f parameter', () => {
    const filter: ISpanFilter = {
      clauses: [
        { verb: 'keep', criterion: { shape: 'set', property: 'status', values: ['error'] } },
        { verb: 'hide', criterion: { shape: 'attr', text: 'http.method:GET' } },
      ],
      treeMode: 'remove',
    };
    const search = buildFilterSearch('?uiFind=x', ['svc-a'], filter);
    expect(search).toBe('?f=k%3Astatus%3Aerror&f=h%3Aattr%3Ahttp.method%3AGET&uiFind=x');
  });

  it('writes a URL that resolves back to the same filter', () => {
    const filter: ISpanFilter = {
      clauses: [
        { verb: 'keep', criterion: { shape: 'set', property: 'kind', values: ['100%', 'a,b', 'c d'] } },
        { verb: 'hide', criterion: { shape: 'attr', text: 'http.method:GET' } },
        { verb: 'hide', criterion: { shape: 'range', property: 'duration', min: 1_234_567, max: 2_000_000 } },
      ],
      treeMode: 'remove',
    };
    const search = buildFilterSearch('', ['svc-a'], filter);
    const { filter: resolved } = resolveInitialFilter(search, ['svc-a'], new Set(['svc-a']));
    expect(resolved).toEqual(filter);
  });

  it('round-trips a service hide set next to f clauses through the real svcFilter codec', async () => {
    const actual = await vi.importActual<typeof import('../url/svcFilter')>('../url/svcFilter');
    vi.mocked(encodeSvcFilter).mockImplementation(actual.encodeSvcFilter);
    vi.mocked(decodeSvcFilter).mockImplementation(actual.decodeSvcFilter);
    try {
      const services = ['svc-a', 'svc-b', 'svc-c'];
      const filter = withHiddenServices(
        {
          clauses: [{ verb: 'keep', criterion: { shape: 'set', property: 'status', values: ['error'] } }],
          treeMode: 'remove',
        },
        new Set(['svc-c'])
      );
      const search = buildFilterSearch('?uiFind=x', services, filter);
      expect(search).toMatch(/svcFilter=/);
      const { filter: resolved, cleanSearch } = resolveInitialFilter(search, services, new Set(['svc-a']));
      expect(cleanSearch).toBeUndefined();
      expect(spanFiltersEqual(resolved, filter)).toBe(true);
    } finally {
      vi.mocked(encodeSvcFilter).mockReturnValue(null);
      vi.mocked(decodeSvcFilter).mockReturnValue(null);
    }
  });

  it('removes svcFilter when encodeSvcFilter returns null', () => {
    vi.mocked(encodeSvcFilter).mockReturnValue(null);
    const search = buildFilterSearch('?svcFilter=old.1', ['svc-a'], serviceFilter('svc-a'));
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
    mockSetSpanFilter.mockClear();
    mockStoreState.spanFilter = EMPTY_SPAN_FILTER;
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

  it('skips setSpanFilter when the resolved filter equals the current state (no-op guard)', () => {
    // Store already has empty set; resolved is also empty → no write.
    renderHook(() => useServiceFilter(makeTrace(['svc-a', 'svc-b']), 'inline'));
    expect(mockSetSpanFilter).not.toHaveBeenCalled();
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
    expect(mockSetSpanFilter).toHaveBeenCalledWith(serviceFilter('svc-b'));
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
    expect(mockSetSpanFilter).toHaveBeenCalledWith(serviceFilter('svc-b'));
  });

  it('does not bring the saved default back when applying an empty selection rewrites the URL', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    const hideErrors: IClause = {
      verb: 'hide',
      criterion: { shape: 'set', property: 'status', values: ['error'] },
    };
    // A hand-written, unencoded f= value: the apply handler writes it back encoded, which changes
    // location.search and re-runs the resolve effect.
    vi.mocked(useLocation).mockReturnValue({
      search: '?f=h:status:error',
      pathname: '/trace/abc',
    } as ReturnType<typeof useLocation>);
    // The store mock holds what the hook writes, as the real store does.
    mockSetSpanFilter.mockImplementation((filter: ISpanFilter) => {
      mockStoreState.spanFilter = filter;
    });
    const trace = makeTrace(['svc-a', 'svc-b', 'svc-c']);
    const { rerender } = render(React.createElement(HookRenderer, { trace, mode: 'inline' }));
    expect(mockSetSpanFilter).toHaveBeenLastCalledWith(
      withHiddenServices({ ...EMPTY_SPAN_FILTER, clauses: [hideErrors] }, new Set(['svc-b']))
    );

    capturedOnApply!(new Set());
    expect(mockSetSpanFilter).toHaveBeenLastCalledWith({ ...EMPTY_SPAN_FILTER, clauses: [hideErrors] });
    const navigated = mockNavigate.mock.calls.at(-1)![0] as { search: string };
    expect(navigated.search).toBe('?f=h%3Astatus%3Aerror');

    vi.mocked(useLocation).mockReturnValue({
      search: navigated.search,
      pathname: '/trace/abc',
    } as ReturnType<typeof useLocation>);
    rerender(React.createElement(HookRenderer, { trace, mode: 'inline' }));
    expect(mockSetSpanFilter).toHaveBeenLastCalledWith({ ...EMPTY_SPAN_FILTER, clauses: [hideErrors] });
    mockSetSpanFilter.mockImplementation(() => undefined);
  });

  it('applies the saved default to the next trace after an empty selection left the URL unchanged', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    mockSetSpanFilter.mockImplementation((filter: ISpanFilter) => {
      mockStoreState.spanFilter = filter;
    });
    const trace = makeTrace(['svc-a', 'svc-b', 'svc-c']);
    const { rerender } = render(React.createElement(HookRenderer, { trace, mode: 'inline' }));
    expect(mockSetSpanFilter).toHaveBeenLastCalledWith(serviceFilter('svc-b'));

    // The URL had no svcFilter and the empty selection writes none, so the resolve effect does
    // not run for this navigation.
    capturedOnApply!(new Set());
    expect(mockSetSpanFilter).toHaveBeenLastCalledWith(EMPTY_SPAN_FILTER);
    expect((mockNavigate.mock.calls.at(-1)![0] as { search: string }).search).toBe('');

    const next = { ...makeTrace(['svc-a', 'svc-b', 'svc-c']), traceID: 'trace-2' };
    rerender(React.createElement(HookRenderer, { trace: next, mode: 'inline' }));
    expect(mockSetSpanFilter).toHaveBeenLastCalledWith(serviceFilter('svc-b'));
    mockSetSpanFilter.mockImplementation(() => undefined);
  });

  function HookRenderer({ trace, mode }: { trace: IOtelTrace; mode: 'inline' | 'sidepanel' }) {
    const { serviceFilterNode } = useServiceFilter(trace, mode);
    return React.createElement('div', null, serviceFilterNode);
  }

  it('clears selected span in sidepanel mode when its service is pruned via onApply', () => {
    const selectedSpanID = 'span-x';
    const selectedSpan = {
      spanID: selectedSpanID,
      resource: { serviceName: 'svc-b' },
      parentSpan: undefined,
    } as unknown as IOtelSpan;
    mockStoreState.detailStates = new Map([[selectedSpanID, {}]]) as typeof mockStoreState.detailStates;
    const trace = makeTrace(['svc-a', 'svc-b']);
    (trace as unknown as { spans: IOtelSpan[] }).spans = [selectedSpan];

    render(React.createElement(HookRenderer, { trace, mode: 'sidepanel' }));

    expect(capturedOnApply).not.toBeNull();
    capturedOnApply!(new Set(['svc-b']));

    const storeSetState = (useTraceTimelineStore as unknown as { setState: ReturnType<typeof vi.fn> })
      .setState;
    expect(storeSetState).toHaveBeenCalledWith(expect.objectContaining({ detailStates: new Map() }));
  });

  it('does not rewrite the store when the URL resolves to the filter it already holds', () => {
    const keep: IClause = {
      verb: 'keep',
      criterion: { shape: 'set', property: 'status', values: ['error'] },
    };
    mockStoreState.spanFilter = withHiddenServices(
      { ...EMPTY_SPAN_FILTER, clauses: [keep] },
      new Set(['svc-b'])
    );
    vi.mocked(decodeSvcFilter).mockReturnValue({ visibleServices: new Set(['svc-a']), stale: false });
    vi.mocked(useLocation).mockReturnValue({
      search: '?f=k%3Astatus%3Aerror&svcFilter=abc.1',
      pathname: '/trace/abc',
    } as ReturnType<typeof useLocation>);
    renderHook(() => useServiceFilter(makeTrace(['svc-a', 'svc-b']), 'inline'));
    expect(mockSetSpanFilter).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('preserves the other clauses when the popover applies a service selection', () => {
    const keep: IClause = {
      verb: 'keep',
      criterion: { shape: 'set', property: 'status', values: ['error'] },
    };
    mockStoreState.spanFilter = { ...EMPTY_SPAN_FILTER, clauses: [keep] };
    render(React.createElement(HookRenderer, { trace: makeTrace(['svc-a', 'svc-b']), mode: 'inline' }));
    capturedOnApply!(new Set(['svc-b']));
    expect(mockSetSpanFilter).toHaveBeenLastCalledWith(
      withHiddenServices({ ...EMPTY_SPAN_FILTER, clauses: [keep] }, new Set(['svc-b']))
    );
    expect(mockNavigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: expect.stringContaining('f=k%3Astatus%3Aerror') }),
      expect.anything()
    );
  });

  it('does not clear detailStates in inline mode when service is pruned via onApply', () => {
    const selectedSpanID = 'span-x';
    const selectedSpan = {
      spanID: selectedSpanID,
      resource: { serviceName: 'svc-b' },
      parentSpan: undefined,
    } as unknown as IOtelSpan;
    mockStoreState.detailStates = new Map([[selectedSpanID, {}]]) as typeof mockStoreState.detailStates;
    const trace = makeTrace(['svc-a', 'svc-b']);
    (trace as unknown as { spans: IOtelSpan[] }).spans = [selectedSpan];

    render(React.createElement(HookRenderer, { trace, mode: 'inline' }));

    expect(capturedOnApply).not.toBeNull();
    capturedOnApply!(new Set(['svc-b']));

    const storeSetState = (useTraceTimelineStore as unknown as { setState: ReturnType<typeof vi.fn> })
      .setState;
    expect(storeSetState).not.toHaveBeenCalled();
  });
});
