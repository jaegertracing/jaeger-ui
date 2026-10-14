// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import memoizeOne from 'memoize-one';
import { create } from 'zustand';
import DetailState from './SpanDetail/DetailState';
import { getServicesWithoutGenAIDescendants } from './generateRowStates';
import { useLayoutPrefsStore } from './store.layout';
import { TNil } from '../../../types';
import { IOtelSpan, IOtelTrace, IEvent } from '../../../types/otel';
import { sanitizePrunedServices } from '../url/svcFilter';
import {
  applyDetailSubsectionToggle,
  calculateFocusedFindRowStates,
  shouldDisableCollapse,
  trimFocusedDetailStatesForSidePanel,
} from './timeline-utils';

/**
 * Computes which services in a trace have no GenAI span at or below them, sanitized
 * against the same root-service-protection rule the manual service filter uses (never
 * orphan the tree). Called once per trace load; the result is cached on the store, not
 * recomputed on every render or every toggle flip.
 */
function computeNonGenAIServicesToHide(trace: IOtelTrace, rootServiceNames: Set<string>): Set<string> {
  if (!trace.isGenAITrace) return new Set();
  const candidate = getServicesWithoutGenAIDescendants(trace.spans);
  if (candidate.size === 0) return candidate;
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
  // Services with no GenAI span at or below them, computed once per trace load (see
  // setTrace). Not itself the visible filter - only applied when hideNonGenAIServicesEnabled
  // is true, via selectEffectivePrunedServices below.
  nonGenAIServicesToHide: Set<string>;
  hideNonGenAIServicesEnabled: boolean;
  setHideNonGenAIServicesEnabled: (enabled: boolean) => void;
  // The trace's root-span service names, computed once per trace load (see setTrace).
  // Used to re-sanitize the union in selectEffectivePrunedServices: the manual filter and
  // nonGenAIServicesToHide are each sanitized individually against this, but two
  // individually-legal sets can still together prune every root once unioned.
  rootServiceNames: Set<string>;
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

  nonGenAIServicesToHide: new Set<string>(),
  hideNonGenAIServicesEnabled: false,
  rootServiceNames: new Set<string>(),

  setHideNonGenAIServicesEnabled: (enabled: boolean) => set({ hideNonGenAIServicesEnabled: enabled }),

  setTrace: (trace: IOtelTrace, uiFind?: string | TNil) => {
    const { traceID: currentTraceID } = get();
    if (trace.traceID === currentTraceID) return;

    const detailPanelMode = useLayoutPrefsStore.getState().detailPanelMode;

    const rootServiceNames = new Set<string>();
    for (const span of trace.rootSpans) {
      rootServiceNames.add(span.resource.serviceName);
    }

    const base: Partial<TraceTimelineInteractionStore> = {
      traceID: trace.traceID,
      childrenHiddenIDs: new Set<string>(),
      detailStates: new Map<string, DetailState>(),
      shouldScrollToFirstUiFindMatch: false,
      prunedServices: new Set<string>(),
      nonGenAIServicesToHide: computeNonGenAIServicesToHide(trace, rootServiceNames),
      hideNonGenAIServicesEnabled: false,
      rootServiceNames,
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
 * Selector for the pruned-service set that should actually drive row visibility and uiFind
 * match filtering: the manual service filter, unioned with the auto-hidden non-GenAI
 * services when that's enabled, and re-sanitized since two individually-legal prunes can
 * together orphan every root. Memoized on the three input references so unrelated
 * re-renders don't churn.
 */
function unionPrunedServices(
  prunedServices: Set<string>,
  nonGenAIServicesToHide: Set<string>,
  rootServiceNames: Set<string>
): Set<string> {
  const union = new Set([...prunedServices, ...nonGenAIServicesToHide]);
  return sanitizePrunedServices(union, rootServiceNames);
}
const memoizedUnionPrunedServices = memoizeOne(unionPrunedServices);

export function selectEffectivePrunedServices(state: TraceTimelineInteractionStore): Set<string> {
  const { prunedServices, hideNonGenAIServicesEnabled, nonGenAIServicesToHide, rootServiceNames } = state;
  if (!hideNonGenAIServicesEnabled || nonGenAIServicesToHide.size === 0) {
    return prunedServices;
  }
  if (prunedServices.size === 0) {
    return nonGenAIServicesToHide;
  }
  return memoizedUnionPrunedServices(prunedServices, nonGenAIServicesToHide, rootServiceNames);
}
