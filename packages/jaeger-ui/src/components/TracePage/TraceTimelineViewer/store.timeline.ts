// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import DetailState from './SpanDetail/DetailState';
import { useLayoutPrefsStore } from './store.layout';
import { TNil } from '../../../types';
import { IOtelSpan, IOtelTrace, IEvent } from '../../../types/otel';
import {
  applyDetailSubsectionToggle,
  calculateFocusedFindRowStates,
  findNewlyRevealedAncestors,
  FocusedFindRowStates,
  shouldDisableCollapse,
  trimFocusedDetailStatesForSidePanel,
} from './timeline-utils';

type TraceTimelineInteractionStore = {
  traceID: string | null;
  traceSpans: IOtelTrace['spans'] | null;
  childrenHiddenIDs: Set<string>;
  detailStates: Map<string, DetailState>;
  shouldScrollToFirstUiFindMatch: boolean;
  prunedServices: Set<string>;
  setPrunedServices: (pruned: Set<string>) => void;
  clearServiceFilter: () => void;
  // Resets ephemeral fields for a new trace and optionally pre-apply a uiFind filter
  setTrace: (trace: IOtelTrace, uiFind?: string | TNil) => void;
  childrenToggle: (spanID: string) => void;
  expandAll: () => void;
  expandOne: (spans: ReadonlyArray<IOtelSpan>) => void;
  collapseAll: (spans: ReadonlyArray<IOtelSpan>) => void;
  collapseOne: (spans: ReadonlyArray<IOtelSpan>) => void;
  detailToggle: (spanID: string) => void;
  detailTagsToggle: (spanID: string) => void;
  detailProcessToggle: (spanID: string) => void;
  detailLogsToggle: (spanID: string) => void;
  detailLogItemToggle: (spanID: string, logItem: IEvent) => void;
  detailWarningsToggle: (spanID: string) => void;
  detailReferencesToggle: (spanID: string) => void;
  clearShouldScrollToFirstUiFindMatch: () => void;
  focusUiFindMatches: (trace: IOtelTrace, uiFind?: string | TNil, allowHide?: boolean) => void;
};

export const useTraceTimelineStore = create<TraceTimelineInteractionStore>()((set, get) => ({
  traceID: null,
  traceSpans: null,
  childrenHiddenIDs: new Set<string>(),
  detailStates: new Map<string, DetailState>(),
  shouldScrollToFirstUiFindMatch: false,
  prunedServices: new Set<string>(),

  setPrunedServices: (pruned: Set<string>) => set({ prunedServices: new Set(pruned) }),

  clearServiceFilter: () => set({ prunedServices: new Set<string>() }),
  setTrace: (trace: IOtelTrace, uiFind?: string | TNil) => {
    const { traceID: currentTraceID, traceSpans } = get();
    if (trace.traceID === currentTraceID && trace.spans === traceSpans) return;

    const detailPanelMode = useLayoutPrefsStore.getState().detailPanelMode;

    const base: Partial<TraceTimelineInteractionStore> = {
      traceID: trace.traceID,
      traceSpans: trace.spans,
    };

    const isSameTrace = trace.traceID === currentTraceID;

    // Across refetches of the same trace, collapse and filter selections persist,
    // while detail states are pruned for spans that no longer exist.
    if (!isSameTrace) {
      Object.assign(base, {
        childrenHiddenIDs: new Set<string>(),
        detailStates: new Map<string, DetailState>(),
        shouldScrollToFirstUiFindMatch: false,
        prunedServices: new Set<string>(),
      });
    } else {
      const validSpanIDs = trace.spanMap;
      const currentDetailStates = get().detailStates;
      let hasDropped = false;
      for (const id of currentDetailStates.keys()) {
        if (!validSpanIDs.has(id)) {
          hasDropped = true;
          break;
        }
      }
      if (hasDropped) {
        const prunedDetailStates = new Map<string, DetailState>();
        for (const [id, state] of currentDetailStates) {
          if (validSpanIDs.has(id)) {
            prunedDetailStates.set(id, state);
          }
        }
        base.detailStates = prunedDetailStates;
      }
    }

    if (uiFind) {
      if (isSameTrace) {
        const prevSpanIDs = new Set(traceSpans?.map(s => s.spanID));
        const newSpans = trace.spans.filter(s => !prevSpanIDs.has(s.spanID));
        const revealedAncestors = findNewlyRevealedAncestors(uiFind, newSpans, trace.spans);

        const childrenHiddenIDs = new Set(get().childrenHiddenIDs);
        revealedAncestors.forEach(id => childrenHiddenIDs.delete(id));

        const detailStates = new Map(get().detailStates);
        const newMatchedFocused = calculateFocusedFindRowStates(uiFind, newSpans, false);
        newMatchedFocused.detailStates.forEach((state, id) => detailStates.set(id, state));

        let focused: FocusedFindRowStates = {
          childrenHiddenIDs,
          detailStates,
          shouldScrollToFirstUiFindMatch: false,
        };
        focused = trimFocusedDetailStatesForSidePanel(focused, detailPanelMode);
        const { shouldScrollToFirstUiFindMatch: _ignored, ...rest } = focused;
        Object.assign(base, rest);
      } else {
        let focused = calculateFocusedFindRowStates(uiFind, trace.spans);
        focused = trimFocusedDetailStatesForSidePanel(focused, detailPanelMode);
        Object.assign(base, focused);
      }
    }

    set(base as Partial<TraceTimelineInteractionStore>);
  },

  childrenToggle: (spanID: string) => {
    const childrenHiddenIDs = new Set(get().childrenHiddenIDs);
    if (childrenHiddenIDs.has(spanID)) {
      childrenHiddenIDs.delete(spanID);
    } else {
      childrenHiddenIDs.add(spanID);
    }
    set({ childrenHiddenIDs });
  },

  expandAll: () => {
    set({ childrenHiddenIDs: new Set<string>() });
  },

  expandOne: (spans: ReadonlyArray<IOtelSpan>) => {
    const current = get().childrenHiddenIDs;
    if (current.size === 0) return;
    let prevExpandedDepth = -1;
    let expandNextHiddenSpan = true;
    const childrenHiddenIDs = spans.reduce((res, s) => {
      if (s.depth <= prevExpandedDepth) {
        expandNextHiddenSpan = true;
      }
      if (expandNextHiddenSpan && res.has(s.spanID)) {
        res.delete(s.spanID);
        expandNextHiddenSpan = false;
        prevExpandedDepth = s.depth;
      }
      return res;
    }, new Set(current));
    set({ childrenHiddenIDs });
  },

  collapseAll: (spans: ReadonlyArray<IOtelSpan>) => {
    const { childrenHiddenIDs: current } = get();
    if (shouldDisableCollapse(spans, current)) return;
    const childrenHiddenIDs = spans.reduce((res, s) => {
      if (s.hasChildren) res.add(s.spanID);
      return res;
    }, new Set<string>());
    set({ childrenHiddenIDs });
  },

  collapseOne: (spans: ReadonlyArray<IOtelSpan>) => {
    const { childrenHiddenIDs: current } = get();
    if (shouldDisableCollapse(spans, current)) return;
    let nearestCollapsedAncestor: IOtelSpan | undefined;
    const childrenHiddenIDs = spans.reduce((res, curSpan) => {
      if (nearestCollapsedAncestor && curSpan.depth <= nearestCollapsedAncestor.depth) {
        res.add(nearestCollapsedAncestor.spanID);
        if (curSpan.hasChildren) {
          nearestCollapsedAncestor = curSpan;
        }
      } else if (curSpan.hasChildren && !res.has(curSpan.spanID)) {
        nearestCollapsedAncestor = curSpan;
      }
      return res;
    }, new Set(current));
    if (nearestCollapsedAncestor) {
      childrenHiddenIDs.add(nearestCollapsedAncestor.spanID);
    }
    set({ childrenHiddenIDs });
  },

  detailToggle: (spanID: string) => {
    const detailPanelMode = useLayoutPrefsStore.getState().detailPanelMode;
    const { detailStates: current } = get();
    if (detailPanelMode === 'sidepanel') {
      if (current.has(spanID)) {
        set({ detailStates: new Map() });
      } else {
        const detailStates = new Map<string, DetailState>();
        detailStates.set(spanID, DetailState.forDetailPanelMode('sidepanel'));
        set({ detailStates });
      }
      return;
    }
    const detailStates = new Map(current);
    if (detailStates.has(spanID)) {
      detailStates.delete(spanID);
    } else {
      detailStates.set(spanID, new DetailState());
    }
    set({ detailStates });
  },

  detailTagsToggle: (spanID: string) => {
    const detailPanelMode = useLayoutPrefsStore.getState().detailPanelMode;
    const { detailStates } = get();
    set({ detailStates: applyDetailSubsectionToggle(detailStates, detailPanelMode, spanID, 'tags') });
  },

  detailProcessToggle: (spanID: string) => {
    const detailPanelMode = useLayoutPrefsStore.getState().detailPanelMode;
    const { detailStates } = get();
    set({ detailStates: applyDetailSubsectionToggle(detailStates, detailPanelMode, spanID, 'process') });
  },

  detailLogsToggle: (spanID: string) => {
    const detailPanelMode = useLayoutPrefsStore.getState().detailPanelMode;
    const { detailStates } = get();
    set({ detailStates: applyDetailSubsectionToggle(detailStates, detailPanelMode, spanID, 'logs') });
  },

  detailWarningsToggle: (spanID: string) => {
    const detailPanelMode = useLayoutPrefsStore.getState().detailPanelMode;
    const { detailStates } = get();
    set({ detailStates: applyDetailSubsectionToggle(detailStates, detailPanelMode, spanID, 'warnings') });
  },

  detailReferencesToggle: (spanID: string) => {
    const detailPanelMode = useLayoutPrefsStore.getState().detailPanelMode;
    const { detailStates } = get();
    set({
      detailStates: applyDetailSubsectionToggle(detailStates, detailPanelMode, spanID, 'references'),
    });
  },

  detailLogItemToggle: (spanID: string, logItem: IEvent) => {
    const detailPanelMode = useLayoutPrefsStore.getState().detailPanelMode;
    const { detailStates } = get();
    const old = detailStates.get(spanID) ?? DetailState.forDetailPanelMode(detailPanelMode);
    const detailState = old.toggleLogItem(logItem);
    const next = new Map(detailStates);
    next.set(spanID, detailState);
    set({ detailStates: next });
  },

  clearShouldScrollToFirstUiFindMatch: () => {
    if (get().shouldScrollToFirstUiFindMatch) {
      set({ shouldScrollToFirstUiFindMatch: false });
    }
  },

  focusUiFindMatches: (trace: IOtelTrace, uiFind?: string | TNil, allowHide = true) => {
    if (!uiFind) return;
    const detailPanelMode = useLayoutPrefsStore.getState().detailPanelMode;
    let focused = calculateFocusedFindRowStates(uiFind, trace.spans, allowHide);
    focused = trimFocusedDetailStatesForSidePanel(focused, detailPanelMode);
    set(focused);
  },
}));
