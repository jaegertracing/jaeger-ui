// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import _isEqual from 'lodash/isEqual';
import memoizeOne from 'memoize-one';
import DetailState from './SpanDetail/DetailState';
import { isSpanPruned } from './generateRowStates';
import { TNil } from '../../../types';
import { IOtelSpan, IOtelTrace } from '../../../types/otel';
import type { SpanDetailPanelMode } from '../../../types/config';
import filterSpans from '../../../utils/filter-spans';
import spanAncestorIds from '../../../utils/span-ancestor-ids';

export function shouldDisableCollapse(
  allSpans: ReadonlyArray<IOtelSpan>,
  hiddenSpansIds: Set<string>
): boolean {
  return allSpans.filter(s => s.hasChildren).every(p => hiddenSpansIds.has(p.spanID));
}

type FocusedFindRowStates = {
  childrenHiddenIDs: Set<string>;
  detailStates: Map<string, DetailState>;
  shouldScrollToFirstUiFindMatch: boolean;
};

// Side-panel mode keeps at most one span in detailStates (see detailToggle / setDetailPanelMode).
export function trimFocusedDetailStatesForSidePanel(
  focused: FocusedFindRowStates,
  detailPanelMode: SpanDetailPanelMode
): FocusedFindRowStates {
  if (detailPanelMode !== 'sidepanel' || focused.detailStates.size <= 1) {
    return focused;
  }
  const firstKey = focused.detailStates.keys().next().value as string;
  return {
    ...focused,
    detailStates: new Map([[firstKey, DetailState.forDetailPanelMode('sidepanel')]]),
  };
}

export function calculateFocusedFindRowStates(
  uiFind: string,
  spans: ReadonlyArray<IOtelSpan>,
  allowHide = true
): FocusedFindRowStates {
  const spansMap = new Map<string, IOtelSpan>();
  const childrenHiddenIDs: Set<string> = new Set();
  const detailStates: Map<string, DetailState> = new Map();
  let shouldScrollToFirstUiFindMatch = false;

  spans.forEach(span => {
    spansMap.set(span.spanID, span);
    if (allowHide && span.hasChildren) {
      childrenHiddenIDs.add(span.spanID);
    }
  });

  const matchedSpanIds = filterSpans(uiFind, spans);
  if (matchedSpanIds && matchedSpanIds.size) {
    matchedSpanIds.forEach(spanID => {
      const span = spansMap.get(spanID);
      if (!span) {
        return;
      }
      detailStates.set(spanID, new DetailState());
      spanAncestorIds(span).forEach(ancestorID => childrenHiddenIDs.delete(ancestorID));
    });
    if (detailStates.size > 0) {
      shouldScrollToFirstUiFindMatch = true;
    }
  }

  return { childrenHiddenIDs, detailStates, shouldScrollToFirstUiFindMatch };
}

// Returns the currently selected span ID in side-panel mode (first key of detailStates), or null.
export function getSelectedSpanID(detailStates: Map<string, DetailState | TNil>): string | null {
  return detailStates.size > 0 ? (detailStates.keys().next().value as string) : null;
}

type SubSection = 'tags' | 'process' | 'logs' | 'warnings' | 'references';

// Centralizes toggle behavior for span detail subsections (tags, process, logs, warnings, references).
export function applyDetailSubsectionToggle(
  detailStates: Map<string, DetailState>,
  detailPanelMode: SpanDetailPanelMode,
  spanID: string,
  subSection: SubSection
): Map<string, DetailState> {
  const old = detailStates.get(spanID) ?? DetailState.forDetailPanelMode(detailPanelMode);
  let detailState: DetailState;
  if (subSection === 'tags') {
    detailState = old.toggleTags();
  } else if (subSection === 'process') {
    detailState = old.toggleProcess();
  } else if (subSection === 'warnings') {
    detailState = old.toggleWarnings();
  } else if (subSection === 'references') {
    detailState = old.toggleReferences();
  } else {
    detailState = old.toggleLogs();
  }
  const next = new Map(detailStates);
  next.set(spanID, detailState);
  return next;
}

/**
 * Traverses childSpans in pre-order DFS and collects all descendant spans including rootSpan.
 * Uses an explicit stack to avoid stack overflow on deep traces.
 */
export function getSubtreeSpans(rootSpan: IOtelSpan): IOtelSpan[] {
  const result: IOtelSpan[] = [];
  const stack: IOtelSpan[] = [rootSpan];
  while (stack.length > 0) {
    const s = stack.pop()!;
    result.push(s);
    if (s.childSpans && s.childSpans.length > 0) {
      for (let i = s.childSpans.length - 1; i >= 0; i--) {
        stack.push(s.childSpans[i]);
      }
    }
  }
  return result;
}

/**
 * Returns all span IDs in the subtree (including rootSpan.spanID) that have hasChildren: true.
 * Uses an explicit stack to avoid stack overflow on deep traces.
 */
export function getDescendantParentSpanIDs(rootSpan: IOtelSpan): Set<string> {
  const ids = new Set<string>();
  const stack: IOtelSpan[] = [rootSpan];
  while (stack.length > 0) {
    const s = stack.pop()!;
    if (s.hasChildren) {
      ids.add(s.spanID);
    }
    if (s.childSpans && s.childSpans.length > 0) {
      for (let i = s.childSpans.length - 1; i >= 0; i--) {
        stack.push(s.childSpans[i]);
      }
    }
  }
  return ids;
}

/**
 * Returns a Set of span IDs belonging to the focused subtree, or null if no focus
 * or if the focused span is pruned. Memoized across callers (TracePage and VirtualizedTraceView)
 * to avoid repeated tree traversals and set allocations during high-frequency updates.
 */
function getFocusedSpanIDs(
  trace: IOtelTrace | TNil,
  focusedSubtreeSpanID?: string | null,
  prunedServices?: Set<string>
): Set<string> | null {
  if (!focusedSubtreeSpanID || !trace) {
    return null;
  }
  const focusedSpan = trace.spanMap.get(focusedSubtreeSpanID);
  if (!focusedSpan || (prunedServices && isSpanPruned(focusedSpan, prunedServices))) {
    return null;
  }
  const subtreeSpans = getSubtreeSpans(focusedSpan);
  return new Set(subtreeSpans.map(s => s.spanID));
}

export const focusedSpanIDs = memoizeOne(
  getFocusedSpanIDs,
  (newArgs, lastArgs) =>
    newArgs[0] === lastArgs[0] && newArgs[1] === lastArgs[1] && _isEqual(newArgs[2], lastArgs[2])
);
