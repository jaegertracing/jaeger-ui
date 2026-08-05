// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import memoizeOne from 'memoize-one';
import { create } from 'zustand';
import DetailState from './SpanDetail/DetailState';
import { useLayoutPrefsStore } from './store.layout';
import { TNil } from '../../../types';
import { IOtelSpan, IOtelTrace, IEvent } from '../../../types/otel';
import { getServicesWithoutGenAISpans } from '../../../utils/genai';
import { sanitizePrunedServices } from '../url/svcFilter';
import {
  applyDetailSubsectionToggle,
  calculateFocusedFindRowStates,
  shouldDisableCollapse,
  trimFocusedDetailStatesForSidePanel,
} from './timeline-utils';

/**
 * Computes which services in a trace own zero GenAI spans, sanitized against the same
 * root-service-protection rule the manual service filter uses (never orphan the tree).
 * Called once per trace load; the result is cached on the store, not recomputed on every
 * render or every logical-view toggle flip.
 */
function computeLogicalViewPrunedServices(trace: IOtelTrace): Set<string> {
  if (!trace.isGenAITrace) return new Set();
  const candidate = getServicesWithoutGenAISpans(trace.spans);
  if (candidate.size === 0) return candidate;
  const rootServiceNames = new Set<string>();
  for (const span of trace.rootSpans) {
    rootServiceNames.add(span.resource.serviceName);
  }
  return sanitizePrunedServices(candidate, rootServiceNames);
}

type TraceTimelineInteractionStore = {
  traceID: string | null;
  childrenHiddenIDs: Set<string>;
  detailStates: Map<string, DetailState>;
  shouldScrollToFirstUiFindMatch: boolean;
  prunedServices: Set<string>;
  setPrunedServices: (pruned: Set<string>) => void;
  clearServiceFilter: () => void;
  // Services with zero GenAI spans, computed once per trace load (see setTrace).
  // Not itself the visible filter - only applied when logicalViewEnabled is true,
  // via selectEffectivePrunedServices below.
  logicalViewPrunedServices: Set<string>;
  logicalViewEnabled: boolean;
  setLogicalViewEnabled: (enabled: boolean) => void;
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
  childrenHiddenIDs: new Set<string>(),
  detailStates: new Map<string, DetailState>(),
  shouldScrollToFirstUiFindMatch: false,
  prunedServices: new Set<string>(),

  setPrunedServices: (pruned: Set<string>) => set({ prunedServices: new Set(pruned) }),

  clearServiceFilter: () => set({ prunedServices: new Set<string>() }),

  logicalViewPrunedServices: new Set<string>(),
  logicalViewEnabled: false,

  setLogicalViewEnabled: (enabled: boolean) => set({ logicalViewEnabled: enabled }),

  setTrace: (trace: IOtelTrace, uiFind?: string | TNil) => {
    const { traceID: currentTraceID } = get();
    if (trace.traceID === currentTraceID) return;

    const detailPanelMode = useLayoutPrefsStore.getState().detailPanelMode;

    const base: Partial<TraceTimelineInteractionStore> = {
      traceID: trace.traceID,
      childrenHiddenIDs: new Set<string>(),
      detailStates: new Map<string, DetailState>(),
      shouldScrollToFirstUiFindMatch: false,
      prunedServices: new Set<string>(),
      logicalViewPrunedServices: computeLogicalViewPrunedServices(trace),
      logicalViewEnabled: false,
    };

    if (uiFind) {
      let focused = calculateFocusedFindRowStates(uiFind, trace.spans);
      focused = trimFocusedDetailStatesForSidePanel(focused, detailPanelMode);
      Object.assign(base, focused);
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

/**
 * Selector for the pruned-service set that should actually drive row visibility and
 * uiFind match filtering: the manual service filter, unioned with the logical-view
 * filter when it's enabled. Every read site that needs "what's actually hidden right
 * now" (VirtualizedTraceView, TracePage's uiFind match counting) should use this
 * selector rather than reading `prunedServices` directly, so the two stay consistent
 * instead of each re-deriving the union (or forgetting to).
 *
 * Returns the existing `prunedServices` Set reference unchanged when logical view is
 * off or contributes nothing, so unrelated selector subscriptions don't re-render.
 * The union case is memoized (keyed on the two input Set references) so repeated calls
 * between actual changes to either set also return the same reference, since Zustand
 * compares selector output with Object.is.
 */
function unionPrunedServices(
  prunedServices: Set<string>,
  logicalViewPrunedServices: Set<string>
): Set<string> {
  return new Set([...prunedServices, ...logicalViewPrunedServices]);
}
const memoizedUnionPrunedServices = memoizeOne(unionPrunedServices);

export function selectEffectivePrunedServices(state: TraceTimelineInteractionStore): Set<string> {
  const { prunedServices, logicalViewEnabled, logicalViewPrunedServices } = state;
  if (!logicalViewEnabled || logicalViewPrunedServices.size === 0) {
    return prunedServices;
  }
  if (prunedServices.size === 0) {
    return logicalViewPrunedServices;
  }
  return memoizedUnionPrunedServices(prunedServices, logicalViewPrunedServices);
}
