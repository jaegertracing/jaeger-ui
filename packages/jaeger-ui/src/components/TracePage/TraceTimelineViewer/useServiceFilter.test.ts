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
    getSortedServiceNames: vi.fn((services: Array<{ name: string }>) => services.map(s => s.name).sort()),
  };
});

import { useLocation } from 'react-router-dom';
import { useTraceTimelineStore } from './store';
import { decodeSvcFilter } from '../url/svcFilter';
import { resolveInitialFilter, buildFilterSearch, useServiceFilter } from './useServiceFilter';
import {
  EMPTY_SPAN_FILTER,
  hiddenServices,
  IClause,
  ISpanFilter,
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

  it('returns an empty filter when the URL and localStorage carry nothing', () => {
    const result = resolveInitialFilter('', ['svc-a', 'svc-b'], roots);
    expect(result.filter).toEqual(EMPTY_SPAN_FILTER);
    expect(result.cleanSearch).toBeUndefined();
  });

  it('reads a legacy svcFilter as the hide clause on service and rewrites it as f', () => {
    vi.mocked(decodeSvcFilter).mockReturnValue({
      visibleServices: new Set(['svc-a']),
      stale: false,
    });
    const result = resolveInitialFilter('?svcFilter=abc.1', ['svc-a', 'svc-b'], roots);
    expect(result.filter).toEqual(serviceFilter('svc-b'));
    expect(result.cleanSearch).toBe('?f=h%3Aservice%3Asvc-b');
  });

  it('drops a stale legacy svcFilter and writes an empty f, so the saved default stays away', () => {
    vi.mocked(decodeSvcFilter).mockReturnValue({ visibleServices: new Set(), stale: true });
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    const result = resolveInitialFilter('?svcFilter=stale.ff&uiFind=foo', ['svc-a', 'svc-b', 'svc-c'], roots);
    expect(result.filter).toEqual(EMPTY_SPAN_FILTER);
    expect(result.cleanSearch).toBe('?f=&uiFind=foo');
  });

  it('writes only an empty f when a stale svcFilter was the only param', () => {
    vi.mocked(decodeSvcFilter).mockReturnValue({ visibleServices: new Set(), stale: true });
    const result = resolveInitialFilter('?svcFilter=stale.ff', ['svc-a'], roots);
    expect(result.filter).toEqual(EMPTY_SPAN_FILTER);
    expect(result.cleanSearch).toBe('?f=');
  });

  it('reads localStorage defaults when the URL states no filter', () => {
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

  it('combines a legacy svcFilter with f clauses and rewrites the whole filter as f', () => {
    vi.mocked(decodeSvcFilter).mockReturnValue({ visibleServices: new Set(['svc-a']), stale: false });
    const result = resolveInitialFilter('?svcFilter=abc.1&f=k%3Astatus%3Aerror', ['svc-a', 'svc-b'], roots);
    expect(result.filter.clauses).toEqual([
      { verb: 'keep', criterion: { shape: 'set', property: 'status', values: ['error'] } },
      { verb: 'hide', criterion: { shape: 'set', property: 'service', values: ['svc-b'] } },
    ]);
    expect(result.cleanSearch).toBe('?f=k%3Astatus%3Aerror&f=h%3Aservice%3Asvc-b');
  });

  it('reads the hide clause on service from f and leaves the saved default aside', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-c'] }));
    const result = resolveInitialFilter('?f=h%3Aservice%3Asvc-b', ['svc-a', 'svc-b', 'svc-c'], roots);
    expect(result.filter).toEqual(serviceFilter('svc-b'));
    expect(result.cleanSearch).toBeUndefined();
  });

  it('leaves the saved default aside when the URL states other clauses', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    const result = resolveInitialFilter('?f=k%3Astatus%3Aerror', ['svc-a', 'svc-b', 'svc-c'], roots);
    expect(result.filter.clauses).toEqual([
      { verb: 'keep', criterion: { shape: 'set', property: 'status', values: ['error'] } },
    ]);
  });

  it('leaves the saved default aside when f is explicitly empty or every value is malformed', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    expect(resolveInitialFilter('?f=', ['svc-a', 'svc-b', 'svc-c'], roots).filter).toEqual(EMPTY_SPAN_FILTER);
    expect(resolveInitialFilter('?f=garbage&f=', ['svc-a', 'svc-b', 'svc-c'], roots).filter).toEqual(
      EMPTY_SPAN_FILTER
    );
  });

  it('falls through to the saved default when svcFilter is empty', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    const result = resolveInitialFilter('?svcFilter=', ['svc-a', 'svc-b', 'svc-c'], roots);
    expect(hiddenServices(result.filter)).toEqual(new Set(['svc-b']));
  });

  describe('root service sanitization', () => {
    it('removes the sole root service from a legacy svcFilter and writes an empty f', () => {
      vi.mocked(decodeSvcFilter).mockReturnValue({
        visibleServices: new Set(['svc-b']),
        stale: false,
      });
      // The URL hides only svc-a, the sole root, so sanitization empties the filter.
      const result = resolveInitialFilter('?svcFilter=abc.2', ['svc-a', 'svc-b'], new Set(['svc-a']));
      expect(result.filter).toEqual(EMPTY_SPAN_FILTER);
      expect(result.cleanSearch).toBe('?f=');
    });

    it('removes the sole root service but keeps the other hidden services in the rewritten f', () => {
      vi.mocked(decodeSvcFilter).mockReturnValue({
        visibleServices: new Set(['svc-c']),
        stale: false,
      });
      const result = resolveInitialFilter(
        '?svcFilter=abc.4',
        ['svc-a', 'svc-b', 'svc-c'],
        new Set(['svc-a'])
      );
      expect(hiddenServices(result.filter)).toEqual(new Set(['svc-b']));
      expect(result.cleanSearch).toBe('?f=h%3Aservice%3Asvc-b');
    });

    it('removes the sole root service from a hide clause in f and rewrites it', () => {
      const result = resolveInitialFilter(
        '?f=h%3Aservice%3Asvc-a%2Csvc-b&uiFind=x',
        ['svc-a', 'svc-b', 'svc-c'],
        new Set(['svc-a'])
      );
      expect(hiddenServices(result.filter)).toEqual(new Set(['svc-b']));
      expect(result.cleanSearch).toBe('?f=h%3Aservice%3Asvc-b&uiFind=x');
    });

    it('removes sole root service from pruned set (localStorage)', () => {
      localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-a', 'svc-b'] }));
      const result = resolveInitialFilter('', ['svc-a', 'svc-b', 'svc-c'], new Set(['svc-a']));
      expect(hiddenServices(result.filter).has('svc-a')).toBe(false);
      expect(hiddenServices(result.filter).has('svc-b')).toBe(true);
    });

    it('discards the hide set and writes an empty f when all root services would be hidden (multi-root)', () => {
      vi.mocked(decodeSvcFilter).mockReturnValue({
        visibleServices: new Set(['svc-c']),
        stale: false,
      });
      const result = resolveInitialFilter(
        '?svcFilter=abc.4',
        ['svc-a', 'svc-b', 'svc-c'],
        new Set(['svc-a', 'svc-b'])
      );
      expect(result.filter).toEqual(EMPTY_SPAN_FILTER);
      expect(result.cleanSearch).toBe('?f=');
    });

    it('keeps filter when at least one root service is visible (multi-root)', () => {
      const result = resolveInitialFilter(
        '?f=h%3Aservice%3Asvc-b',
        ['svc-a', 'svc-b', 'svc-c'],
        new Set(['svc-a', 'svc-b'])
      );
      expect(hiddenServices(result.filter)).toEqual(new Set(['svc-b']));
      expect(result.cleanSearch).toBeUndefined();
    });
  });
});

describe('buildFilterSearch', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('drops a legacy svcFilter and writes the hide clause on service as f', () => {
    const search = buildFilterSearch('?svcFilter=old.1&uiFind=foo', serviceFilter('svc-b'));
    expect(search).toBe('?f=h%3Aservice%3Asvc-b&uiFind=foo');
  });

  it('writes an empty f when the URL stated a filter and the clause list is now empty', () => {
    expect(buildFilterSearch('?svcFilter=old.1', EMPTY_SPAN_FILTER)).toBe('?f=');
    expect(buildFilterSearch('?f=h%3Aservice%3Asvc-b&uiFind=x', EMPTY_SPAN_FILTER)).toBe('?f=&uiFind=x');
  });

  it('removes f when nothing stated a filter and no default is saved', () => {
    expect(buildFilterSearch('', EMPTY_SPAN_FILTER)).toBe('');
    expect(buildFilterSearch('?uiFind=x', EMPTY_SPAN_FILTER)).toBe('?uiFind=x');
  });

  it('writes an empty f when a default is saved, so that it does not come back', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    expect(buildFilterSearch('', EMPTY_SPAN_FILTER)).toBe('?f=');
  });

  it('preserves existing URL params alongside f', () => {
    const search = buildFilterSearch('?uiFind=hello', serviceFilter('svc-b'));
    expect(search).toBe('?f=h%3Aservice%3Asvc-b&uiFind=hello');
  });

  it('writes every clause as an f parameter', () => {
    const filter: ISpanFilter = {
      clauses: [
        { verb: 'keep', criterion: { shape: 'set', property: 'status', values: ['error'] } },
        { verb: 'hide', criterion: { shape: 'attr', text: 'http.method:GET' } },
      ],
      treeMode: 'remove',
    };
    const search = buildFilterSearch('?uiFind=x', filter);
    expect(search).toBe('?f=k%3Astatus%3Aerror&f=h%3Aattr%3Ahttp.method%3AGET&uiFind=x');
  });

  it('writes a URL that resolves back to the same filter', () => {
    const filter: ISpanFilter = withHiddenServices(
      {
        clauses: [
          { verb: 'keep', criterion: { shape: 'set', property: 'kind', values: ['100%', 'a,b', 'c d'] } },
          { verb: 'hide', criterion: { shape: 'attr', text: 'http.method:GET' } },
          {
            verb: 'hide',
            criterion: { shape: 'range', property: 'duration', min: 1_234_567, max: 2_000_000 },
          },
        ],
        treeMode: 'remove',
      },
      new Set(['svc-b'])
    );
    const search = buildFilterSearch('', filter);
    const { filter: resolved, cleanSearch } = resolveInitialFilter(
      search,
      ['svc-a', 'svc-b'],
      new Set(['svc-a'])
    );
    expect(resolved).toEqual(filter);
    expect(cleanSearch).toBeUndefined();
  });

  it('reads a link written by the legacy svcFilter codec and rewrites it as f', async () => {
    const actual = await vi.importActual<typeof import('../url/svcFilter')>('../url/svcFilter');
    vi.mocked(decodeSvcFilter).mockImplementation(actual.decodeSvcFilter);
    try {
      const services = ['svc-a', 'svc-b', 'svc-c'];
      const legacy = actual.encodeSvcFilter(services, new Set(['svc-a', 'svc-b']));
      const { filter, cleanSearch } = resolveInitialFilter(
        `?svcFilter=${legacy}&uiFind=x`,
        services,
        new Set(['svc-a'])
      );
      expect(filter).toEqual(serviceFilter('svc-c'));
      expect(cleanSearch).toBe('?f=h%3Aservice%3Asvc-c&uiFind=x');
    } finally {
      vi.mocked(decodeSvcFilter).mockReturnValue(null);
    }
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

  it('reads a legacy svcFilter on mount and rewrites the URL as f', () => {
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
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/trace/abc', search: '?f=h%3Aservice%3Asvc-b' }),
      { replace: true }
    );
  });

  it('navigates to an empty f when svcFilter is stale', () => {
    vi.mocked(useLocation).mockReturnValue({
      search: '?svcFilter=stale.ff',
      pathname: '/trace/abc',
    } as ReturnType<typeof useLocation>);
    vi.mocked(decodeSvcFilter).mockReturnValue({ visibleServices: new Set(), stale: true });
    renderHook(() => useServiceFilter(makeTrace(['svc-a']), 'inline'));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/trace/abc', search: '?f=' }),
      { replace: true }
    );
  });

  it('reads localStorage defaults when the URL states no filter', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    renderHook(() => useServiceFilter(makeTrace(['svc-a', 'svc-b', 'svc-c']), 'inline'));
    expect(mockSetSpanFilter).toHaveBeenCalledWith(serviceFilter('svc-b'));
  });

  it('leaves the saved default aside while the URL states a filter, before and after an edit', () => {
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
    expect(mockSetSpanFilter).toHaveBeenLastCalledWith({ ...EMPTY_SPAN_FILTER, clauses: [hideErrors] });

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

  it('writes an empty f for an empty selection, which keeps the saved default away until a fresh URL', () => {
    localStorage.setItem('svcFilter.defaults', JSON.stringify({ prunedServices: ['svc-b'] }));
    mockSetSpanFilter.mockImplementation((filter: ISpanFilter) => {
      mockStoreState.spanFilter = filter;
    });
    const trace = makeTrace(['svc-a', 'svc-b', 'svc-c']);
    const { rerender } = render(React.createElement(HookRenderer, { trace, mode: 'inline' }));
    expect(mockSetSpanFilter).toHaveBeenLastCalledWith(serviceFilter('svc-b'));

    capturedOnApply!(new Set());
    expect(mockSetSpanFilter).toHaveBeenLastCalledWith(EMPTY_SPAN_FILTER);
    expect((mockNavigate.mock.calls.at(-1)![0] as { search: string }).search).toBe('?f=');

    vi.mocked(useLocation).mockReturnValue({ search: '?f=', pathname: '/trace/abc' } as ReturnType<
      typeof useLocation
    >);
    rerender(React.createElement(HookRenderer, { trace, mode: 'inline' }));
    expect(mockSetSpanFilter).toHaveBeenLastCalledWith(EMPTY_SPAN_FILTER);

    // Another trace opens with a fresh URL, so the saved default applies again.
    vi.mocked(useLocation).mockReturnValue({ search: '', pathname: '/trace/def' } as ReturnType<
      typeof useLocation
    >);
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
    vi.mocked(useLocation).mockReturnValue({
      search: '?f=k%3Astatus%3Aerror&f=h%3Aservice%3Asvc-b',
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
