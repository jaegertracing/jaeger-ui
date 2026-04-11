// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';

import DetailState from './SpanDetail/DetailState';
import {
  calculateFocusedFindRowStates,
  getInitialLayoutState,
  getSelectedSpanID,
  SIDE_PANEL_WIDTH_MAX,
  SIDE_PANEL_WIDTH_MIN,
  SPAN_NAME_COLUMN_WIDTH_MAX,
  SPAN_NAME_COLUMN_WIDTH_MIN,
  useTraceTimelineStore,
} from './store';

vi.mock('../../../utils/config/get-config', () => ({
  default: vi.fn(() => ({})),
}));
vi.mock('../../../utils/filter-spans');
vi.mock('../../../utils/span-ancestor-ids');

import getConfig from '../../../utils/config/get-config';
import filterSpans from '../../../utils/filter-spans';
import spanAncestorIds from '../../../utils/span-ancestor-ids';

describe('getInitialLayoutState()', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getConfig).mockReturnValue({} as ReturnType<typeof getConfig>);
  });

  it('returns default values when localStorage is empty and config has no traceTimeline', () => {
    const state = getInitialLayoutState();
    expect(state.spanNameColumnWidth).toBe(0.25);
    expect(state.timelineBarsVisible).toBe(true);
    expect(state.detailPanelMode).toBe('inline');
    expect(state.sidePanelWidth).toBeCloseTo(0.375);
  });

  it('reads spanNameColumnWidth from localStorage', () => {
    localStorage.setItem('spanNameColumnWidth', '0.4');
    const state = getInitialLayoutState();
    expect(state.spanNameColumnWidth).toBeCloseTo(0.4);
  });

  it('clamps spanNameColumnWidth to [MIN, MAX]', () => {
    localStorage.setItem('spanNameColumnWidth', '0.01');
    expect(getInitialLayoutState().spanNameColumnWidth).toBe(SPAN_NAME_COLUMN_WIDTH_MIN);

    localStorage.setItem('spanNameColumnWidth', '0.99');
    expect(getInitialLayoutState().spanNameColumnWidth).toBe(SPAN_NAME_COLUMN_WIDTH_MAX);
  });

  it('reads sidePanelWidth from localStorage', () => {
    localStorage.setItem('spanNameColumnWidth', '0.25');
    localStorage.setItem('sidePanelWidth', '0.3');
    const state = getInitialLayoutState();
    expect(state.sidePanelWidth).toBeCloseTo(0.3);
  });

  it('clamps sidePanelWidth to [MIN, MAX]', () => {
    localStorage.setItem('sidePanelWidth', '0.01');
    expect(getInitialLayoutState().sidePanelWidth).toBe(SIDE_PANEL_WIDTH_MIN);

    localStorage.setItem('sidePanelWidth', '0.99');
    expect(getInitialLayoutState().sidePanelWidth).toBe(SIDE_PANEL_WIDTH_MAX);
  });

  it('resets sidePanelWidth when sum with spanNameColumnWidth >= 1', () => {
    localStorage.setItem('spanNameColumnWidth', '0.6');
    localStorage.setItem('sidePanelWidth', '0.6');
    const state = getInitialLayoutState();
    expect(state.spanNameColumnWidth + state.sidePanelWidth).toBeLessThan(1);
  });

  it('resets both widths when no combination leaves room', () => {
    localStorage.setItem('spanNameColumnWidth', '0.85');
    localStorage.setItem('sidePanelWidth', '0.7');
    const state = getInitialLayoutState();
    expect(state.spanNameColumnWidth + state.sidePanelWidth).toBeLessThan(1);
  });

  it('reads timelineBarsVisible=false from localStorage', () => {
    localStorage.setItem('timelineVisible', 'false');
    expect(getInitialLayoutState().timelineBarsVisible).toBe(false);
  });

  it('reads timelineBarsVisible=true from localStorage when value is not "false"', () => {
    localStorage.setItem('timelineVisible', 'true');
    expect(getInitialLayoutState().timelineBarsVisible).toBe(true);
  });

  it('defaults detailPanelMode to inline when enableSidePanel is false', () => {
    vi.mocked(getConfig).mockReturnValue({
      traceTimeline: { enableSidePanel: false },
    } as ReturnType<typeof getConfig>);
    expect(getInitialLayoutState().detailPanelMode).toBe('inline');
  });

  it('reads detailPanelMode=sidepanel from localStorage when enableSidePanel is true', () => {
    vi.mocked(getConfig).mockReturnValue({
      traceTimeline: { enableSidePanel: true },
    } as ReturnType<typeof getConfig>);
    localStorage.setItem('detailPanelMode', 'sidepanel');
    expect(getInitialLayoutState().detailPanelMode).toBe('sidepanel');
  });

  it('uses defaultDetailPanelMode from config when localStorage is empty and enableSidePanel is true', () => {
    vi.mocked(getConfig).mockReturnValue({
      traceTimeline: { enableSidePanel: true, defaultDetailPanelMode: 'sidepanel' },
    } as ReturnType<typeof getConfig>);
    expect(getInitialLayoutState().detailPanelMode).toBe('sidepanel');
  });

  it('keeps detailPanelMode=inline when stored value is not sidepanel', () => {
    vi.mocked(getConfig).mockReturnValue({
      traceTimeline: { enableSidePanel: true },
    } as ReturnType<typeof getConfig>);
    localStorage.setItem('detailPanelMode', 'inline');
    expect(getInitialLayoutState().detailPanelMode).toBe('inline');
  });
});

const makeSpan = (overrides: Record<string, unknown> = {}) =>
  ({
    spanID: 'span-1',
    depth: 0,
    hasChildren: false,
    childSpans: [],
    ...overrides,
  }) as any;

const makeTrace = (traceID = 'trace-1', spans: any[] = [makeSpan()]) => ({ traceID, spans }) as any;

describe('useTraceTimelineStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useTraceTimelineStore.setState({
      spanNameColumnWidth: 0.25,
      sidePanelWidth: 0.375,
      detailPanelMode: 'inline',
      timelineBarsVisible: true,
      traceID: null,
      childrenHiddenIDs: new Set(),
      detailStates: new Map(),
      shouldScrollToFirstUiFindMatch: false,
    });
    vi.mocked(filterSpans).mockReset();
    vi.mocked(spanAncestorIds).mockReset();
  });

  describe('setSpanNameColumnWidth', () => {
    it('updates spanNameColumnWidth and persists to localStorage', () => {
      useTraceTimelineStore.getState().setSpanNameColumnWidth(0.4);
      expect(useTraceTimelineStore.getState().spanNameColumnWidth).toBeCloseTo(0.4);
      expect(localStorage.getItem('spanNameColumnWidth')).toBe('0.4');
    });

    it('clamps to SPAN_NAME_COLUMN_WIDTH_MIN', () => {
      useTraceTimelineStore.getState().setSpanNameColumnWidth(0.01);
      expect(useTraceTimelineStore.getState().spanNameColumnWidth).toBe(SPAN_NAME_COLUMN_WIDTH_MIN);
    });

    it('clamps to SPAN_NAME_COLUMN_WIDTH_MAX in inline mode', () => {
      useTraceTimelineStore.getState().setSpanNameColumnWidth(0.99);
      expect(useTraceTimelineStore.getState().spanNameColumnWidth).toBe(SPAN_NAME_COLUMN_WIDTH_MAX);
    });

    it('clamps to leave room for side panel and timeline in sidepanel mode', () => {
      useTraceTimelineStore.setState({ detailPanelMode: 'sidepanel', sidePanelWidth: 0.3 });
      useTraceTimelineStore.getState().setSpanNameColumnWidth(0.99);
      expect(useTraceTimelineStore.getState().spanNameColumnWidth).toBeCloseTo(0.65);
    });
  });

  describe('setSidePanelWidth', () => {
    it('updates sidePanelWidth and persists to localStorage', () => {
      useTraceTimelineStore.getState().setSidePanelWidth(0.4);
      expect(useTraceTimelineStore.getState().sidePanelWidth).toBeCloseTo(0.4);
      expect(localStorage.getItem('sidePanelWidth')).toBe('0.4');
    });

    it('clamps to SIDE_PANEL_WIDTH_MIN', () => {
      useTraceTimelineStore.getState().setSidePanelWidth(0.01);
      expect(useTraceTimelineStore.getState().sidePanelWidth).toBe(SIDE_PANEL_WIDTH_MIN);
    });

    it('clamps to SIDE_PANEL_WIDTH_MAX', () => {
      useTraceTimelineStore.getState().setSidePanelWidth(0.99);
      expect(useTraceTimelineStore.getState().sidePanelWidth).toBe(SIDE_PANEL_WIDTH_MAX);
    });

    it('accounts for timeline column when timeline bars are visible', () => {
      useTraceTimelineStore.setState({ timelineBarsVisible: true, spanNameColumnWidth: 0.25 });
      useTraceTimelineStore.getState().setSidePanelWidth(0.99);
      expect(useTraceTimelineStore.getState().sidePanelWidth).toBeCloseTo(0.7);
    });

    it('does not reserve timeline column when timeline bars are hidden', () => {
      useTraceTimelineStore.setState({ timelineBarsVisible: false, spanNameColumnWidth: 0.25 });
      useTraceTimelineStore.getState().setSidePanelWidth(0.99);
      expect(useTraceTimelineStore.getState().sidePanelWidth).toBeCloseTo(0.7);
    });
  });

  describe('setDetailPanelMode', () => {
    it('updates detailPanelMode and persists to localStorage', () => {
      useTraceTimelineStore.getState().setDetailPanelMode('sidepanel');
      expect(useTraceTimelineStore.getState().detailPanelMode).toBe('sidepanel');
      expect(localStorage.getItem('detailPanelMode')).toBe('sidepanel');
    });

    it('clamps spanNameColumnWidth when switching to sidepanel', () => {
      useTraceTimelineStore.setState({ spanNameColumnWidth: 0.8, sidePanelWidth: 0.3 });
      useTraceTimelineStore.getState().setDetailPanelMode('sidepanel');
      expect(useTraceTimelineStore.getState().spanNameColumnWidth).toBeCloseTo(0.65);
    });

    it('does not clamp spanNameColumnWidth when switching to inline', () => {
      useTraceTimelineStore.setState({ spanNameColumnWidth: 0.8, detailPanelMode: 'sidepanel' });
      useTraceTimelineStore.getState().setDetailPanelMode('inline');
      expect(useTraceTimelineStore.getState().spanNameColumnWidth).toBeCloseTo(0.8);
    });

    it('trims detailStates to one entry upgraded to sidepanel mode when switching to sidepanel', () => {
      const first = new DetailState();
      const second = new DetailState();
      useTraceTimelineStore.setState({
        detailStates: new Map([
          ['span-a', first],
          ['span-b', second],
        ]),
      });
      useTraceTimelineStore.getState().setDetailPanelMode('sidepanel');
      const { detailStates } = useTraceTimelineStore.getState();
      expect(detailStates.size).toBe(1);
      expect(detailStates.has('span-a')).toBe(true);
      expect(detailStates.get('span-a')!.isAttributesOpen).toBe(true);
    });

    it('does not touch detailStates when switching to inline', () => {
      const ds = new Map([['span-a', new DetailState()]]);
      useTraceTimelineStore.setState({ detailStates: ds, detailPanelMode: 'sidepanel' });
      useTraceTimelineStore.getState().setDetailPanelMode('inline');
      expect(useTraceTimelineStore.getState().detailStates).toBe(ds);
    });
  });

  describe('setTimelineBarsVisible', () => {
    it('updates timelineBarsVisible and persists to localStorage', () => {
      useTraceTimelineStore.getState().setTimelineBarsVisible(false);
      expect(useTraceTimelineStore.getState().timelineBarsVisible).toBe(false);
      expect(localStorage.getItem('timelineVisible')).toBe('false');
    });

    it('persists true as "true"', () => {
      useTraceTimelineStore.getState().setTimelineBarsVisible(false);
      useTraceTimelineStore.getState().setTimelineBarsVisible(true);
      expect(localStorage.getItem('timelineVisible')).toBe('true');
    });
  });

  describe('setTrace', () => {
    it('resets ephemeral state when traceID changes', () => {
      useTraceTimelineStore.setState({
        traceID: 'old-trace',
        childrenHiddenIDs: new Set(['span-x']),
        detailStates: new Map([['span-x', new DetailState()]]),
        shouldScrollToFirstUiFindMatch: true,
      });
      useTraceTimelineStore.getState().setTrace(makeTrace('new-trace'));
      const s = useTraceTimelineStore.getState();
      expect(s.traceID).toBe('new-trace');
      expect(s.childrenHiddenIDs.size).toBe(0);
      expect(s.detailStates.size).toBe(0);
      expect(s.shouldScrollToFirstUiFindMatch).toBe(false);
    });

    it('preserves layout prefs when traceID changes', () => {
      useTraceTimelineStore.setState({ spanNameColumnWidth: 0.5, traceID: 'old' });
      useTraceTimelineStore.getState().setTrace(makeTrace('new'));
      expect(useTraceTimelineStore.getState().spanNameColumnWidth).toBe(0.5);
    });

    it('is a no-op when traceID is the same', () => {
      useTraceTimelineStore.setState({
        traceID: 'same',
        childrenHiddenIDs: new Set(['span-x']),
      });
      useTraceTimelineStore.getState().setTrace(makeTrace('same'));
      expect(useTraceTimelineStore.getState().childrenHiddenIDs.has('span-x')).toBe(true);
    });

    it('applies uiFind filter when provided', () => {
      vi.mocked(filterSpans).mockReturnValue(new Set(['span-1']));
      vi.mocked(spanAncestorIds).mockReturnValue([]);
      useTraceTimelineStore.getState().setTrace(makeTrace('t1'), 'myFind');
      expect(useTraceTimelineStore.getState().shouldScrollToFirstUiFindMatch).toBe(true);
    });

    it('trims uiFind detailStates to one entry when in side-panel mode', () => {
      vi.mocked(filterSpans).mockReturnValue(new Set(['span-a', 'span-b']));
      vi.mocked(spanAncestorIds).mockReturnValue([]);
      const trace = makeTrace('t1', [makeSpan({ spanID: 'span-a' }), makeSpan({ spanID: 'span-b' })]);
      useTraceTimelineStore.setState({ detailPanelMode: 'sidepanel' });
      useTraceTimelineStore.getState().setTrace(trace, 'myFind');
      const s = useTraceTimelineStore.getState();
      expect(s.detailStates.size).toBe(1);
      expect(s.detailStates.has('span-a')).toBe(true);
      expect(s.detailStates.get('span-a')!.isAttributesOpen).toBe(true);
    });
  });

  describe('childrenToggle', () => {
    it('adds spanID to childrenHiddenIDs when not present', () => {
      useTraceTimelineStore.getState().childrenToggle('span-a');
      expect(useTraceTimelineStore.getState().childrenHiddenIDs.has('span-a')).toBe(true);
    });

    it('removes spanID from childrenHiddenIDs when already present', () => {
      useTraceTimelineStore.setState({ childrenHiddenIDs: new Set(['span-a']) });
      useTraceTimelineStore.getState().childrenToggle('span-a');
      expect(useTraceTimelineStore.getState().childrenHiddenIDs.has('span-a')).toBe(false);
    });
  });

  describe('expandAll', () => {
    it('clears all collapsed children', () => {
      useTraceTimelineStore.setState({ childrenHiddenIDs: new Set(['a', 'b', 'c']) });
      useTraceTimelineStore.getState().expandAll();
      expect(useTraceTimelineStore.getState().childrenHiddenIDs.size).toBe(0);
    });
  });

  describe('expandOne', () => {
    it('expands the shallowest collapsed parent level', () => {
      const spans = [
        makeSpan({ spanID: 'root', depth: 0, hasChildren: true }),
        makeSpan({ spanID: 'child-parent', depth: 1, hasChildren: true }),
        makeSpan({ spanID: 'leaf', depth: 2 }),
      ];
      useTraceTimelineStore.setState({ childrenHiddenIDs: new Set(['root', 'child-parent']) });
      useTraceTimelineStore.getState().expandOne(spans);
      const { childrenHiddenIDs } = useTraceTimelineStore.getState();
      expect(childrenHiddenIDs.has('root')).toBe(false);
      expect(childrenHiddenIDs.has('child-parent')).toBe(true);
    });

    it('expands each level on successive calls', () => {
      const spans = [
        makeSpan({ spanID: 'root', depth: 0, hasChildren: true }),
        makeSpan({ spanID: 'child-parent', depth: 1, hasChildren: true }),
        makeSpan({ spanID: 'leaf', depth: 2 }),
      ];
      useTraceTimelineStore.setState({ childrenHiddenIDs: new Set(['root', 'child-parent']) });
      useTraceTimelineStore.getState().expandOne(spans);
      useTraceTimelineStore.getState().expandOne(spans);
      expect(useTraceTimelineStore.getState().childrenHiddenIDs.size).toBe(0);
    });

    it('is a no-op when nothing is collapsed', () => {
      const spans = [makeSpan({ spanID: 'root', depth: 0, hasChildren: true })];
      const stateBefore = useTraceTimelineStore.getState();
      useTraceTimelineStore.getState().expandOne(spans);
      expect(useTraceTimelineStore.getState()).toBe(stateBefore);
    });
  });

  describe('collapseAll', () => {
    it('hides all parent spans', () => {
      const spans = [makeSpan({ spanID: 'parent', hasChildren: true }), makeSpan({ spanID: 'child' })];
      useTraceTimelineStore.getState().collapseAll(spans);
      expect(useTraceTimelineStore.getState().childrenHiddenIDs.has('parent')).toBe(true);
      expect(useTraceTimelineStore.getState().childrenHiddenIDs.has('child')).toBe(false);
    });

    it('is a no-op when all parents are already collapsed', () => {
      const spans = [makeSpan({ spanID: 'parent', hasChildren: true })];
      useTraceTimelineStore.setState({ childrenHiddenIDs: new Set(['parent']) });
      useTraceTimelineStore.getState().collapseAll(spans);
      expect(useTraceTimelineStore.getState().childrenHiddenIDs.has('parent')).toBe(true);
    });
  });

  describe('collapseOne', () => {
    it('collapses only the deepest uncollapsed parent level', () => {
      const spans = [
        makeSpan({ spanID: 'root', depth: 0, hasChildren: true }),
        makeSpan({ spanID: 'child-parent', depth: 1, hasChildren: true }),
        makeSpan({ spanID: 'leaf', depth: 2 }),
      ];
      useTraceTimelineStore.getState().collapseOne(spans);
      const { childrenHiddenIDs } = useTraceTimelineStore.getState();
      expect(childrenHiddenIDs.has('child-parent')).toBe(true);
      expect(childrenHiddenIDs.has('root')).toBe(false);
      expect(childrenHiddenIDs.has('leaf')).toBe(false);
    });

    it('collapses the next shallower level on a successive call', () => {
      const spans = [
        makeSpan({ spanID: 'root', depth: 0, hasChildren: true }),
        makeSpan({ spanID: 'child-parent', depth: 1, hasChildren: true }),
        makeSpan({ spanID: 'leaf', depth: 2 }),
      ];
      useTraceTimelineStore.getState().collapseOne(spans);
      useTraceTimelineStore.getState().collapseOne(spans);
      const { childrenHiddenIDs } = useTraceTimelineStore.getState();
      expect(childrenHiddenIDs.has('child-parent')).toBe(true);
      expect(childrenHiddenIDs.has('root')).toBe(true);
      expect(childrenHiddenIDs.has('leaf')).toBe(false);
    });

    it('is a no-op when all parents are already collapsed', () => {
      const spans = [
        makeSpan({ spanID: 'root', depth: 0, hasChildren: true }),
        makeSpan({ spanID: 'child-parent', depth: 1, hasChildren: true }),
      ];
      useTraceTimelineStore.setState({
        childrenHiddenIDs: new Set(['root', 'child-parent']),
      });
      const stateBefore = useTraceTimelineStore.getState();
      useTraceTimelineStore.getState().collapseOne(spans);
      expect(useTraceTimelineStore.getState()).toBe(stateBefore);
    });
  });

  describe('detailToggle', () => {
    it('adds a DetailState for the span in inline mode', () => {
      useTraceTimelineStore.getState().detailToggle('span-a');
      expect(useTraceTimelineStore.getState().detailStates.has('span-a')).toBe(true);
    });

    it('removes an existing DetailState for the span in inline mode', () => {
      useTraceTimelineStore.setState({ detailStates: new Map([['span-a', new DetailState()]]) });
      useTraceTimelineStore.getState().detailToggle('span-a');
      expect(useTraceTimelineStore.getState().detailStates.has('span-a')).toBe(false);
    });

    it('replaces detailStates with a single entry in sidepanel mode', () => {
      useTraceTimelineStore.setState({
        detailPanelMode: 'sidepanel',
        detailStates: new Map([['span-x', new DetailState()]]),
      });
      useTraceTimelineStore.getState().detailToggle('span-y');
      const { detailStates } = useTraceTimelineStore.getState();
      expect(detailStates.size).toBe(1);
      expect(detailStates.has('span-y')).toBe(true);
    });

    it('clears detailStates when toggling an already-open span in sidepanel mode', () => {
      useTraceTimelineStore.setState({
        detailPanelMode: 'sidepanel',
        detailStates: new Map([['span-a', new DetailState()]]),
      });
      useTraceTimelineStore.getState().detailToggle('span-a');
      expect(useTraceTimelineStore.getState().detailStates.size).toBe(0);
    });
  });

  describe('detail subsection toggles', () => {
    it('detailTagsToggle creates and toggles attributes', () => {
      useTraceTimelineStore.getState().detailTagsToggle('span-a');
      expect(useTraceTimelineStore.getState().detailStates.get('span-a')!.isAttributesOpen).toBe(true);
      useTraceTimelineStore.getState().detailTagsToggle('span-a');
      expect(useTraceTimelineStore.getState().detailStates.get('span-a')!.isAttributesOpen).toBe(false);
    });

    it('detailProcessToggle creates and toggles resource', () => {
      useTraceTimelineStore.getState().detailProcessToggle('span-a');
      expect(useTraceTimelineStore.getState().detailStates.get('span-a')!.isResourceOpen).toBe(true);
    });

    it('detailWarningsToggle creates and toggles warnings', () => {
      useTraceTimelineStore.getState().detailWarningsToggle('span-a');
      expect(useTraceTimelineStore.getState().detailStates.get('span-a')!.isWarningsOpen).toBe(true);
    });

    it('detailReferencesToggle creates and toggles links', () => {
      useTraceTimelineStore.getState().detailReferencesToggle('span-a');
      expect(useTraceTimelineStore.getState().detailStates.get('span-a')!.isLinksOpen).toBe(true);
    });

    it('detailLogsToggle creates and toggles events open state', () => {
      useTraceTimelineStore.setState({
        detailStates: new Map([['span-a', new DetailState()]]),
      });
      useTraceTimelineStore.getState().detailLogsToggle('span-a');
      expect(useTraceTimelineStore.getState().detailStates.get('span-a')!.events.isOpen).toBe(false);
    });
  });

  describe('detailLogItemToggle', () => {
    it('opens a log item and persists to detailStates', () => {
      const logItem = {} as any;
      useTraceTimelineStore.getState().detailLogItemToggle('span-a', logItem);
      expect(
        useTraceTimelineStore.getState().detailStates.get('span-a')!.events.openedItems.has(logItem)
      ).toBe(true);
    });
  });

  describe('clearShouldScrollToFirstUiFindMatch', () => {
    it('sets flag to false when it is true', () => {
      useTraceTimelineStore.setState({ shouldScrollToFirstUiFindMatch: true });
      useTraceTimelineStore.getState().clearShouldScrollToFirstUiFindMatch();
      expect(useTraceTimelineStore.getState().shouldScrollToFirstUiFindMatch).toBe(false);
    });

    it('is a no-op when flag is already false', () => {
      const stateBefore = useTraceTimelineStore.getState();
      useTraceTimelineStore.getState().clearShouldScrollToFirstUiFindMatch();
      expect(useTraceTimelineStore.getState()).toBe(stateBefore);
    });
  });

  describe('focusUiFindMatches', () => {
    it('is a no-op when uiFind is falsy', () => {
      const stateBefore = useTraceTimelineStore.getState();
      useTraceTimelineStore.getState().focusUiFindMatches(makeTrace(), '');
      expect(useTraceTimelineStore.getState()).toBe(stateBefore);
    });

    it('updates childrenHiddenIDs, detailStates, shouldScrollToFirstUiFindMatch', () => {
      vi.mocked(filterSpans).mockReturnValue(new Set(['span-1']));
      vi.mocked(spanAncestorIds).mockReturnValue([]);
      useTraceTimelineStore.getState().focusUiFindMatches(makeTrace(), 'myFind');
      const s = useTraceTimelineStore.getState();
      expect(s.shouldScrollToFirstUiFindMatch).toBe(true);
      expect(s.detailStates.has('span-1')).toBe(true);
    });

    it('keeps only the first match in detailStates when in side-panel mode', () => {
      vi.mocked(filterSpans).mockReturnValue(new Set(['span-a', 'span-b']));
      vi.mocked(spanAncestorIds).mockReturnValue([]);
      const trace = makeTrace('t1', [makeSpan({ spanID: 'span-a' }), makeSpan({ spanID: 'span-b' })]);
      useTraceTimelineStore.setState({ detailPanelMode: 'sidepanel' });
      useTraceTimelineStore.getState().focusUiFindMatches(trace, 'myFind');
      const s = useTraceTimelineStore.getState();
      expect(s.detailStates.size).toBe(1);
      expect(s.detailStates.has('span-a')).toBe(true);
      expect(s.detailStates.has('span-b')).toBe(false);
      expect(s.detailStates.get('span-a')!.isAttributesOpen).toBe(true);
    });
  });
});

describe('calculateFocusedFindRowStates', () => {
  beforeEach(() => {
    vi.mocked(filterSpans).mockReset();
    vi.mocked(spanAncestorIds).mockReset();
  });

  it('only hides parent spans (hasChildren=true) when no match', () => {
    vi.mocked(filterSpans).mockReturnValue(new Set());
    vi.mocked(spanAncestorIds).mockReturnValue([]);
    const spans = [makeSpan({ spanID: 'parent', hasChildren: true }), makeSpan({ spanID: 'leaf' })];
    const result = calculateFocusedFindRowStates('noMatch', spans);
    // Only the parent should be in childrenHiddenIDs, not the leaf.
    expect(result.childrenHiddenIDs.has('parent')).toBe(true);
    expect(result.childrenHiddenIDs.has('leaf')).toBe(false);
    expect(result.detailStates.size).toBe(0);
    expect(result.shouldScrollToFirstUiFindMatch).toBe(false);
  });

  it('expands ancestors of matching spans and scrolls to first match', () => {
    vi.mocked(filterSpans).mockReturnValue(new Set(['leaf']));
    vi.mocked(spanAncestorIds).mockReturnValue(['root']);
    const spans = [makeSpan({ spanID: 'root', hasChildren: true }), makeSpan({ spanID: 'leaf' })];
    const result = calculateFocusedFindRowStates('find', spans);
    expect(result.shouldScrollToFirstUiFindMatch).toBe(true);
    expect(result.detailStates.has('leaf')).toBe(true);
    expect(result.childrenHiddenIDs.has('root')).toBe(false);
  });

  it('ignores matched IDs that are not present in spans (no detailStates, no scroll flag)', () => {
    vi.mocked(filterSpans).mockReturnValue(new Set(['unknown-id']));
    vi.mocked(spanAncestorIds).mockReturnValue([]);
    const spans = [makeSpan({ spanID: 'only-span' })];
    const result = calculateFocusedFindRowStates('find', spans);
    expect(result.detailStates.size).toBe(0);
    expect(result.shouldScrollToFirstUiFindMatch).toBe(false);
  });

  it('allows multiple detailStates in inline mode when several spans match', () => {
    vi.mocked(filterSpans).mockReturnValue(new Set(['a', 'b']));
    vi.mocked(spanAncestorIds).mockReturnValue([]);
    const spans = [makeSpan({ spanID: 'a' }), makeSpan({ spanID: 'b' })];
    const result = calculateFocusedFindRowStates('find', spans);
    expect(result.detailStates.size).toBe(2);
    expect(result.shouldScrollToFirstUiFindMatch).toBe(true);
  });
});

describe('getSelectedSpanID', () => {
  it('returns null when detailStates is empty', () => {
    expect(getSelectedSpanID(new Map())).toBeNull();
  });

  it('returns the first key when detailStates has entries', () => {
    const map = new Map([
      ['span-a', new DetailState()],
      ['span-b', new DetailState()],
    ]);
    expect(getSelectedSpanID(map)).toBe('span-a');
  });
});
