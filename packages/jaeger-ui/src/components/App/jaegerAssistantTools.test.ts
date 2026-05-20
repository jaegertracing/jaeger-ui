// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { Location, NavigateFunction } from 'react-router-dom';

const { mockNavigate, mockFocusUiFindMatches, mockDispatch } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockFocusUiFindMatches: vi.fn(),
  mockDispatch: vi.fn(),
}));

vi.mock('../../utils/update-ui-find', () => ({
  default: vi.fn(),
}));

vi.mock('../../utils/filter-spans', () => ({
  default: vi.fn(),
}));

vi.mock('../TracePage/url', () => ({
  getUrl: vi.fn((id: string, uiFind?: string) => (uiFind ? `/trace/${id}?uiFind=${uiFind}` : `/trace/${id}`)),
}));

vi.mock('../TracePage/TraceTimelineViewer/store.timeline', () => ({
  useTraceTimelineStore: {
    getState: () => ({ focusUiFindMatches: mockFocusUiFindMatches }),
  },
}));

vi.mock('../TracePage/TraceTimelineViewer/duck', () => ({
  actions: {
    focusUiFindMatches: vi.fn((trace, uiFind, allowHide) => ({ type: 'FOCUS', trace, uiFind, allowHide })),
  },
}));

vi.mock('../../utils/configure-store', () => ({
  store: {
    getState: vi.fn(),
    dispatch: mockDispatch,
  },
}));

vi.mock('../../constants', () => ({
  fetchedState: { DONE: 'FETCH_DONE', LOADING: 'FETCH_LOADING', ERROR: 'FETCH_ERROR' },
}));

// Helpers
import updateUiFind from '../../utils/update-ui-find';
import filterSpans from '../../utils/filter-spans';
import { store } from '../../utils/configure-store';
import { createJaegerAssistantToolkit } from './jaegerAssistantTools';

function makeDeps(pathname = '/trace/abc123') {
  const location = { pathname, search: '', hash: '', state: null, key: 'default' } as Location;
  return { navigate: mockNavigate as unknown as NavigateFunction, location };
}

function makeToolkit(pathname?: string) {
  const deps = makeDeps(pathname);
  return createJaegerAssistantToolkit(deps);
}

type HighlightArgs = { traceId: string; spanId?: string; query?: string };

async function execHighlight(args: HighlightArgs, pathname?: string) {
  const toolkit = makeToolkit(pathname);
  const tool = toolkit.highlight_span as unknown as { execute: (a: HighlightArgs) => Promise<unknown> };
  return tool.execute(args);
}

function makeOtelTrace(spanIDs: string[]) {
  return {
    spans: spanIDs.map(spanID => ({ spanID, name: 'op', resource: { serviceName: 'svc' } })),
  };
}

function setupStoreWithTrace(traceId: string, spanIDs: string[]) {
  (store.getState as ReturnType<typeof vi.fn>).mockReturnValue({
    trace: {
      traces: {
        [traceId]: { state: 'FETCH_DONE', data: { asOtelTrace: () => makeOtelTrace(spanIDs) } },
      },
    },
  });
}

function setupStoreEmpty() {
  (store.getState as ReturnType<typeof vi.fn>).mockReturnValue({ trace: { traces: {} } });
}

// Tests
describe('createJaegerAssistantToolkit – highlight_span', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStoreEmpty();
  });

  describe('parameter validation', () => {
    it('returns ok:false when neither spanId nor query is provided', async () => {
      const result = await execHighlight({ traceId: 'abc123' });
      expect(result).toMatchObject({ ok: false });
      expect((result as any).error).toContain('Provide spanId or query');
    });

    it('returns ok:false when both spanId and query are empty strings', async () => {
      const result = await execHighlight({ traceId: 'abc123', spanId: '', query: '' });
      expect(result).toMatchObject({ ok: false });
    });
  });

  describe('when trace is NOT in store (unknown / loading)', () => {
    it('navigates to trace URL with uiFind param', async () => {
      const result = await execHighlight({ traceId: 'abc123', query: 'checkout' }, '/search');
      expect(mockNavigate).toHaveBeenCalledWith('/trace/abc123?uiFind=checkout');
      expect(result).toMatchObject({ ok: true, uiFind: 'checkout', url: '/trace/abc123?uiFind=checkout' });
      expect((result as any).matchCount).toBeUndefined();
    });

    it('uses spanId as uiFind when provided', async () => {
      const result = await execHighlight({ traceId: 'abc123', spanId: 'deadbeef' }, '/search');
      expect(mockNavigate).toHaveBeenCalledWith('/trace/abc123?uiFind=deadbeef');
      expect(result).toMatchObject({ ok: true, uiFind: 'deadbeef' });
    });

    it('prefers spanId over query when both are provided', async () => {
      await execHighlight({ traceId: 'abc123', spanId: 'span01', query: 'checkout' }, '/search');
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('span01'));
    });
  });

  describe('when trace IS loaded and user is ON that trace page', () => {
    const traceId = 'abc123';
    const spans = ['span01', 'span02', 'span03'];

    beforeEach(() => {
      setupStoreWithTrace(traceId, spans);
      (filterSpans as ReturnType<typeof vi.fn>).mockReturnValue(new Set(['span01', 'span02']));
    });

    it('calls updateUiFind instead of navigate', async () => {
      await execHighlight({ traceId, query: 'op' }, '/trace/abc123');
      expect(updateUiFind).toHaveBeenCalledWith(expect.objectContaining({ uiFind: 'op' }));
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('calls zustand focusUiFindMatches with allowHide=false', async () => {
      await execHighlight({ traceId, query: 'op' }, '/trace/abc123');
      expect(mockFocusUiFindMatches).toHaveBeenCalledWith(
        expect.objectContaining({ spans: expect.any(Array) }),
        'op',
        false
      );
    });

    it('dispatches Redux focusUiFindMatches action', async () => {
      await execHighlight({ traceId, query: 'op' }, '/trace/abc123');
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });

    it('returns matchCount from filterSpans', async () => {
      const result = await execHighlight({ traceId, query: 'op' }, '/trace/abc123');
      expect(result).toMatchObject({ ok: true, matchCount: 2 });
    });
  });

  describe('when trace IS loaded but user is on a DIFFERENT page', () => {
    const traceId = 'abc123';

    beforeEach(() => {
      setupStoreWithTrace(traceId, ['span01']);
      (filterSpans as ReturnType<typeof vi.fn>).mockReturnValue(new Set(['span01']));
    });

    it('navigates to the trace URL', async () => {
      await execHighlight({ traceId, query: 'op' }, '/search');
      expect(mockNavigate).toHaveBeenCalledWith('/trace/abc123?uiFind=op');
      expect(updateUiFind).not.toHaveBeenCalled();
      expect(mockFocusUiFindMatches).not.toHaveBeenCalled();
    });
  });

  describe('zero-match guard', () => {
    it('returns ok:false when filterSpans finds no matches', async () => {
      setupStoreWithTrace('abc123', ['span01']);
      (filterSpans as ReturnType<typeof vi.fn>).mockReturnValue(new Set());
      const result = await execHighlight({ traceId: 'abc123', query: 'noop' }, '/trace/abc123');
      expect(result).toMatchObject({ ok: false });
      expect((result as any).error).toMatch(/No spans match/);
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockFocusUiFindMatches).not.toHaveBeenCalled();
    });
  });

  describe('traceId normalisation', () => {
    it('lowercases the traceId before using it', async () => {
      await execHighlight({ traceId: 'ABC123', query: 'op' }, '/search');
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/trace/abc123'));
    });
  });
});
