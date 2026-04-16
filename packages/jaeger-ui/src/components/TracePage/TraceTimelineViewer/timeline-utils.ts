// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import DetailState from './SpanDetail/DetailState';
import { TNil } from '../../../types';
import { IOtelSpan, IEvent } from '../../../types/otel';
import type { SpanDetailPanelMode } from '../../../types/config';
import filterSpans from '../../../utils/filter-spans';
import spanAncestorIds from '../../../utils/span-ancestor-ids';

export function shouldDisableCollapse(
  allSpans: ReadonlyArray<IOtelSpan>,
  hiddenSpansIds: Set<string>
): boolean {
  return allSpans.filter(s => s.hasChildren).every(p => hiddenSpansIds.has(p.spanID));
}

export type FocusedFindRowStates = {
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
