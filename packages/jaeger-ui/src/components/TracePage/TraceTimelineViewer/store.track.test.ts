// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

const mockAnalytics = vi.hoisted(() => ({ enabled: true }));

vi.mock('../../../utils/tracking', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../utils/tracking')>()),
  // The adapter reads the web-analytics gate at call time through this getter.
  get isWaEnabled() {
    return mockAnalytics.enabled;
  },
  trackEvent: vi.fn(),
}));

import { setDetailPanelMode, useLayoutPrefsStore, useTraceTimelineStore } from './store';
import * as track from './store.track';
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
const layout = () => useLayoutPrefsStore.getState();

type TInteraction = {
  // The adapter call the component makes; omitted where the interaction is not reported.
  track?: () => void;
  // The Zustand update the component makes after the adapter call.
  apply: () => void;
};

const interactions: TInteraction[] = [
  { apply: () => timeline().setTrace(trace) },
  {
    track: () => track.trackChildrenToggle('parent'),
    apply: () => timeline().childrenToggle('parent'),
  },
  {
    track: () => track.trackChildrenToggle('parent'),
    apply: () => timeline().childrenToggle('parent'),
  },
  {
    track: track.trackCollapseAll,
    apply: () => timeline().collapseAll(spans),
  },
  {
    track: track.trackExpandOne,
    apply: () => timeline().expandOne(spans),
  },
  {
    track: track.trackCollapseOne,
    apply: () => timeline().collapseOne(spans),
  },
  { track: track.trackExpandAll, apply: () => timeline().expandAll() },
  // No detail is open yet, so the adapter does not report the subsection toggle.
  {
    track: () => track.trackDetailTagsToggle('child'),
    apply: () => timeline().detailTagsToggle('child'),
  },
  {
    track: () => track.trackDetailToggle('child'),
    apply: () => timeline().detailToggle('child'),
  },
  {
    track: () => track.trackDetailTagsToggle('child'),
    apply: () => timeline().detailTagsToggle('child'),
  },
  {
    track: () => track.trackDetailTagsToggle('child'),
    apply: () => timeline().detailTagsToggle('child'),
  },
  {
    track: () => track.trackDetailProcessToggle('child'),
    apply: () => timeline().detailProcessToggle('child'),
  },
  {
    track: () => track.trackDetailLogsToggle('child'),
    apply: () => timeline().detailLogsToggle('child'),
  },
  {
    track: () => track.trackDetailLogItemToggle('child', logItem),
    apply: () => timeline().detailLogItemToggle('child', logItem),
  },
  {
    track: () => track.trackDetailLogItemToggle('child', logItem),
    apply: () => timeline().detailLogItemToggle('child', logItem),
  },
  { apply: () => timeline().detailWarningsToggle('child') },
  {
    apply: () => timeline().detailReferencesToggle('child'),
  },
  {
    apply: () => timeline().focusUiFindMatches(trace, 'sibling'),
  },
  {
    track: () => track.trackDetailToggle('child'),
    apply: () => timeline().detailToggle('child'),
  },
  {
    track: () => track.trackTimelineBarsVisible(false),
    apply: () => layout().setTimelineBarsVisible(false),
  },
  {
    track: () => track.trackColumnWidth(0.3),
    apply: () => layout().setSpanNameColumnWidth(0.3),
  },
  {
    track: () => track.trackDetailPanelMode('sidepanel'),
    apply: () => setDetailPanelMode('sidepanel'),
  },
  {
    track: () => track.trackDetailToggle('parent'),
    apply: () => timeline().detailToggle('parent'),
  },
  {
    track: () => track.trackDetailTagsToggle('parent'),
    apply: () => timeline().detailTagsToggle('parent'),
  },
  {
    track: () => track.trackColumnWidth(0.4),
    apply: () => layout().setSidePanelWidth(0.4),
  },
  {
    track: () => track.trackDetailToggle('parent'),
    apply: () => timeline().detailToggle('parent'),
  },
  {
    track: () => track.trackDetailPanelMode('inline'),
    apply: () => setDetailPanelMode('inline'),
  },
  {
    apply: () => timeline().clearShouldScrollToFirstUiFindMatch(),
  },
];

// The events the Redux tracking middleware emitted for `interactions`, recorded on main at
// 02beb5e4 before the middleware was deleted. Each event reads the state before its interaction.
// Categories are literals so that renaming a category constant fails the parity check.
const expectedEvents = [
  ['jaeger/ux/trace/timeline/parent', 'close', 1],
  ['jaeger/ux/trace/timeline/parent', 'open', 1],
  ['jaeger/ux/trace/timeline/expand-collapse', 'collapse-all'],
  ['jaeger/ux/trace/timeline/expand-collapse', 'expand-one'],
  ['jaeger/ux/trace/timeline/expand-collapse', 'collapse-one'],
  ['jaeger/ux/trace/timeline/expand-collapse', 'expand-all'],
  ['jaeger/ux/trace/timeline/row', 'close'],
  ['jaeger/ux/trace/timeline/tags', 'close'],
  ['jaeger/ux/trace/timeline/process', 'open'],
  ['jaeger/ux/trace/timeline/logs', 'close'],
  ['jaeger/ux/trace/timeline/logs/item', 'open'],
  ['jaeger/ux/trace/timeline/logs/item', 'close'],
  ['jaeger/ux/trace/timeline/row', 'open'],
  ['jaeger/ux/trace/timeline/timeline-visible', 'false'],
  ['jaeger/ux/trace/timeline/column', 'resize', 300],
  ['jaeger/ux/trace/timeline/panel-mode', 'sidepanel'],
  ['jaeger/ux/trace/timeline/row', 'open'],
  ['jaeger/ux/trace/timeline/tags', 'close'],
  ['jaeger/ux/trace/timeline/column', 'resize', 400],
  ['jaeger/ux/trace/timeline/row', 'close'],
  ['jaeger/ux/trace/timeline/panel-mode', 'inline'],
];

function resetStores() {
  useTraceTimelineStore.setState(useTraceTimelineStore.getInitialState(), true);
  useLayoutPrefsStore.setState(useLayoutPrefsStore.getInitialState(), true);
  localStorage.clear();
  vi.mocked(trackEvent).mockClear();
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
  it('emits the events the Redux tracking middleware emitted for a scripted session', () => {
    expect(runAdapter()).toEqual(expectedEvents);
    // Guards against a vacuous pass: every timeline category is exercised.
    const categories = Object.entries(track)
      .filter(([name]) => name.startsWith('CATEGORY_'))
      .map(([, category]) => category);
    expect(new Set(expectedEvents.map(([category]) => category))).toEqual(new Set(categories));
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

  it('emits no parent event for a span missing from the loaded trace', () => {
    resetStores();
    timeline().setTrace(trace);
    track.trackChildrenToggle('missing');
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('emits no subsection or log item event when the span has no open detail', () => {
    resetStores();
    timeline().setTrace(trace);
    track.trackDetailTagsToggle('child');
    track.trackDetailProcessToggle('child');
    track.trackDetailLogsToggle('child');
    track.trackDetailLogItemToggle('child', logItem);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  // The deleted middleware was not installed when the reporter's isEnabled() was false.
  it('emits nothing when web analytics is disabled', () => {
    mockAnalytics.enabled = false;
    try {
      runAdapter();
      expect(trackEvent).not.toHaveBeenCalled();
    } finally {
      mockAnalytics.enabled = true;
    }
  });

  // Zustand `setTrace` refocuses the uiFind matches on a same-ID reload, which the Redux duck
  // ignored. The adapter reports what the user sees, as #4613 decided for the parent toggle.
  it('reads the detail row from Zustand after a same-ID reload with uiFind', () => {
    resetStores();
    timeline().setTrace(trace, 'sibling');
    timeline().detailToggle('sibling');

    const reloaded = { ...trace, spans: [...trace.spans] } as IOtelTrace;
    timeline().setTrace(reloaded, 'sibling');
    expect(timeline().detailStates.has('sibling')).toBe(true);

    vi.mocked(trackEvent).mockClear();
    track.trackDetailToggle('sibling');
    expect(trackEvent).toHaveBeenCalledWith(track.CATEGORY_ROW, 'close');
  });

  // A same-ID reload that adds a uiFind match expands the parent in Zustand, which the Redux duck
  // ignored. The parent toggle reports the expanded state the user sees (#4613).
  it('reads the parent toggle from Zustand after a same-ID reload adds a uiFind match', () => {
    resetStores();
    timeline().setTrace(trace, 'late-match');
    expect(timeline().childrenHiddenIDs.has('parent')).toBe(true);

    const lateMatch = makeSpan('late', 2, parent, { name: 'late-match' });
    const reloaded = { ...trace, spans: [...trace.spans, lateMatch] } as unknown as IOtelTrace;
    timeline().setTrace(reloaded, 'late-match');
    expect(timeline().childrenHiddenIDs.has('parent')).toBe(false);

    vi.mocked(trackEvent).mockClear();
    track.trackChildrenToggle('parent');
    expect(vi.mocked(trackEvent).mock.calls).toEqual([[track.CATEGORY_PARENT, 'close', 1]]);
  });
});
