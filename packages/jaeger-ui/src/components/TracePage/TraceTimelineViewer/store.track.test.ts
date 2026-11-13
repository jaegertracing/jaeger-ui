// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { applyMiddleware, combineReducers, createStore, Middleware, Reducer } from 'redux';
import { Action } from 'redux-actions';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAnalytics = vi.hoisted(() => ({ enabled: true }));

vi.mock('../../../utils/tracking', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../utils/tracking')>()),
  // The legacy middleware is only installed when web analytics is enabled at import time.
  get isWaEnabled() {
    return mockAnalytics.enabled;
  },
  trackEvent: vi.fn(),
}));

import traceTimeline, { actions } from './duck';
import { useLayoutPrefsStore, useTraceTimelineStore } from './store';
import * as track from './store.track';
import trackMiddleware from '../../../middlewares/track';
import { queryClient } from '../../../query/app-query-client';
import { ReduxState } from '../../../types';
import { IEvent, IOtelSpan, IOtelTrace } from '../../../types/otel';
import { trackEvent } from '../../../utils/tracking';

const noEntries = { entries: () => [] };
const resource = { serviceName: 'svc', attributes: noEntries };
const logItem = { name: 'log', attributes: noEntries } as unknown as IEvent;

function makeSpan(spanID: string, depth: number, parentSpan?: object, extra: object = {}) {
  return {
    spanID,
    name: spanID,
    depth,
    parentSpan,
    hasChildren: false,
    attributes: noEntries,
    resource,
    ...extra,
  };
}

const root = makeSpan('root', 0, undefined, { hasChildren: true });
const parent = makeSpan('parent', 1, root, { hasChildren: true });
const child = makeSpan('child', 2, parent, { events: [logItem] });
const sibling = makeSpan('sibling', 1, root);
const spans = [root, parent, child, sibling] as unknown as IOtelSpan[];
const trace = {
  traceID: 'trace-1',
  spans,
  spanMap: new Map(spans.map(span => [span.spanID, span])),
} as unknown as IOtelTrace;

const timeline = () => useTraceTimelineStore.getState();

type TInteraction = {
  // The Redux action the component dispatches today, observed by the tracking middleware.
  action: Action<unknown>;
  // The adapter call that replaces the dispatch; omitted where the middleware has no hook.
  track?: () => void;
  // The Zustand update the component makes after either of the above.
  apply: () => void;
};

const interactions: TInteraction[] = [
  { action: actions.setTrace(trace, null), apply: () => timeline().setTrace(trace) },
  {
    action: actions.childrenToggle('parent'),
    track: () => track.trackChildrenToggle('parent'),
    apply: () => timeline().childrenToggle('parent'),
  },
  {
    action: actions.childrenToggle('parent'),
    track: () => track.trackChildrenToggle('parent'),
    apply: () => timeline().childrenToggle('parent'),
  },
  {
    action: actions.collapseAll(spans),
    track: track.trackCollapseAll,
    apply: () => timeline().collapseAll(spans),
  },
  {
    action: actions.expandOne(spans),
    track: track.trackExpandOne,
    apply: () => timeline().expandOne(spans),
  },
  {
    action: actions.collapseOne(spans),
    track: track.trackCollapseOne,
    apply: () => timeline().collapseOne(spans),
  },
  { action: actions.expandAll(), track: track.trackExpandAll, apply: () => timeline().expandAll() },
  // No detail is open yet, so neither implementation reports the subsection toggle.
  {
    action: actions.detailTagsToggle('child'),
    track: () => track.trackDetailTagsToggle('child'),
    apply: () => timeline().detailTagsToggle('child'),
  },
  {
    action: actions.detailToggle('child'),
    track: () => track.trackDetailToggle('child'),
    apply: () => timeline().detailToggle('child'),
  },
  {
    action: actions.detailTagsToggle('child'),
    track: () => track.trackDetailTagsToggle('child'),
    apply: () => timeline().detailTagsToggle('child'),
  },
  {
    action: actions.detailTagsToggle('child'),
    track: () => track.trackDetailTagsToggle('child'),
    apply: () => timeline().detailTagsToggle('child'),
  },
  {
    action: actions.detailProcessToggle('child'),
    track: () => track.trackDetailProcessToggle('child'),
    apply: () => timeline().detailProcessToggle('child'),
  },
  {
    action: actions.detailLogsToggle('child'),
    track: () => track.trackDetailLogsToggle('child'),
    apply: () => timeline().detailLogsToggle('child'),
  },
  {
    action: actions.detailLogItemToggle('child', logItem),
    track: () => track.trackDetailLogItemToggle('child', logItem),
    apply: () => timeline().detailLogItemToggle('child', logItem),
  },
  {
    action: actions.detailLogItemToggle('child', logItem),
    track: () => track.trackDetailLogItemToggle('child', logItem),
    apply: () => timeline().detailLogItemToggle('child', logItem),
  },
  { action: actions.detailWarningsToggle('child'), apply: () => timeline().detailWarningsToggle('child') },
  {
    action: actions.detailReferencesToggle('child'),
    apply: () => timeline().detailReferencesToggle('child'),
  },
  {
    action: actions.focusUiFindMatches(trace, 'sibling'),
    apply: () => timeline().focusUiFindMatches(trace, 'sibling'),
  },
  {
    action: actions.detailToggle('child'),
    track: () => track.trackDetailToggle('child'),
    apply: () => timeline().detailToggle('child'),
  },
  {
    action: actions.detailToggle('parent'),
    track: () => track.trackDetailToggle('parent'),
    apply: () => timeline().detailToggle('parent'),
  },
  {
    action: actions.detailTagsToggle('parent'),
    track: () => track.trackDetailTagsToggle('parent'),
    apply: () => timeline().detailTagsToggle('parent'),
  },
  {
    action: actions.detailToggle('parent'),
    track: () => track.trackDetailToggle('parent'),
    apply: () => timeline().detailToggle('parent'),
  },
  {
    action: actions.clearShouldScrollToFirstUiFindMatch(),
    apply: () => timeline().clearShouldScrollToFirstUiFindMatch(),
  },
];

function resetStores() {
  useTraceTimelineStore.setState(useTraceTimelineStore.getInitialState(), true);
  useLayoutPrefsStore.setState(useLayoutPrefsStore.getInitialState(), true);
  localStorage.clear();
  vi.mocked(trackEvent).mockClear();
}

function createLegacyStore() {
  const reducer = combineReducers({ traceTimeline }) as unknown as Reducer<ReduxState, Action<unknown>>;
  return createStore(reducer, applyMiddleware(trackMiddleware as Middleware));
}

// Mirrors today's components: dispatch first so the middleware sees pre-update state, then Zustand.
function runLegacy() {
  resetStores();
  const store = createLegacyStore();
  interactions.forEach(({ action, apply }) => {
    store.dispatch(action);
    apply();
  });
  return vi.mocked(trackEvent).mock.calls.slice();
}

function runAdapter() {
  resetStores();
  interactions.forEach(({ track: trackInteraction, apply }) => {
    trackInteraction?.();
    apply();
  });
  return vi.mocked(trackEvent).mock.calls.slice();
}

describe('timeline analytics adapter', () => {
  beforeEach(() => {
    queryClient.setQueryData(['trace', trace.traceID], trace);
  });

  it('emits the same events as the Redux tracking middleware for a scripted session', () => {
    const legacy = runLegacy();
    const adapter = runAdapter();

    expect(adapter).toEqual(legacy);
    // Guards against a vacuous pass: every timeline category still comparable against the
    // Redux duck is exercised. CATEGORY_COLUMN, CATEGORY_PANEL_MODE and CATEGORY_TIMELINE_VISIBLE
    // are excluded: the layout fields that produced them (spanNameColumnWidth, sidePanelWidth,
    // detailPanelMode, timelineBarsVisible) were removed from the duck once this adapter's parity
    // with it was established, so there is no more legacy action to compare against. They are
    // covered directly in the 'layout preference tracking' tests below instead.
    const retiredFromParity = new Set([
      track.CATEGORY_COLUMN,
      track.CATEGORY_PANEL_MODE,
      track.CATEGORY_TIMELINE_VISIBLE,
    ]);
    const categories = Object.entries(track)
      .filter(([name]) => name.startsWith('CATEGORY_'))
      .map(([, category]) => category as string)
      .filter(category => !retiredFromParity.has(category));
    expect(new Set(legacy.map(([category]) => category))).toEqual(new Set(categories));
  });

  describe('layout preference tracking', () => {
    // These categories used to be part of the legacy-vs-adapter comparison above; once the
    // migration was proven faithful, the layout fields were removed from the Redux duck, and
    // these three functions are now tested directly instead.
    it('trackColumnWidth reports the resized width in thousandths', () => {
      resetStores();
      track.trackColumnWidth(0.3);
      expect(trackEvent).toHaveBeenCalledWith(track.CATEGORY_COLUMN, 'resize', 300);
    });

    it('trackDetailPanelMode reports the new mode', () => {
      resetStores();
      track.trackDetailPanelMode('sidepanel');
      expect(trackEvent).toHaveBeenCalledWith(track.CATEGORY_PANEL_MODE, 'sidepanel');
    });

    it('trackTimelineBarsVisible reports the new visibility', () => {
      resetStores();
      track.trackTimelineBarsVisible(false);
      expect(trackEvent).toHaveBeenCalledWith(track.CATEGORY_TIMELINE_VISIBLE, 'false');
    });

    it('respects the web analytics gate, like the other trackers', () => {
      resetStores();
      mockAnalytics.enabled = false;
      try {
        track.trackColumnWidth(0.3);
        expect(trackEvent).not.toHaveBeenCalled();
      } finally {
        mockAnalytics.enabled = true;
      }
    });
  });

  it('reports the toggle direction from the state before the store action runs', () => {
    resetStores();
    timeline().setTrace(trace);

    track.trackChildrenToggle('parent');
    timeline().childrenToggle('parent');
    track.trackChildrenToggle('parent');
    timeline().childrenToggle('parent');

    expect(vi.mocked(trackEvent).mock.calls).toEqual([
      [track.CATEGORY_PARENT, 'close', 1],
      [track.CATEGORY_PARENT, 'open', 1],
    ]);
  });

  it('emits no parent event before a trace is loaded', () => {
    resetStores();
    track.trackChildrenToggle('parent');
    expect(trackEvent).not.toHaveBeenCalled();
  });

  // Mirrors the middleware, which is not installed when the reporter's isEnabled() is false.
  it('emits nothing when web analytics is disabled', () => {
    mockAnalytics.enabled = false;
    try {
      runAdapter();
      expect(trackEvent).not.toHaveBeenCalled();
    } finally {
      mockAnalytics.enabled = true;
    }
  });

  // Redux `setTrace` ignores a same-ID reload, while Zustand refocuses the uiFind matches. The
  // adapter reports what the user sees, as #4613 decided for the parent toggle.
  it('reads the detail row from Zustand after a same-ID reload with uiFind', () => {
    resetStores();
    const store = createLegacyStore();
    store.dispatch(actions.setTrace(trace, 'sibling'));
    timeline().setTrace(trace, 'sibling');
    store.dispatch(actions.detailToggle('sibling'));
    timeline().detailToggle('sibling');

    const reloaded = { ...trace, spans: [...trace.spans] } as IOtelTrace;
    store.dispatch(actions.setTrace(reloaded, 'sibling'));
    timeline().setTrace(reloaded, 'sibling');
    expect(store.getState().traceTimeline.detailStates.has('sibling')).toBe(false);
    expect(timeline().detailStates.has('sibling')).toBe(true);

    vi.mocked(trackEvent).mockClear();
    track.trackDetailToggle('sibling');
    expect(trackEvent).toHaveBeenCalledWith(track.CATEGORY_ROW, 'close');
  });
});
