// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import DetailState from './SpanDetail/DetailState';
import type { SpanDetailPanelMode } from '../../../types/config';
import { useLayoutPrefsStore } from './store.layout';
import { useTraceTimelineStore } from './store.timeline';
import type { TraceTimelineInteractionStore } from './store.timeline';
import type { TraceTimelineLayoutPrefsStore } from './store.layout';

export {
  MIN_TIMELINE_COLUMN_WIDTH,
  SIDE_PANEL_WIDTH_MAX,
  SIDE_PANEL_WIDTH_MIN,
  SPAN_NAME_COLUMN_WIDTH_MAX,
  SPAN_NAME_COLUMN_WIDTH_MIN,
} from './store.constants';

export { getInitialLayoutState, useLayoutPrefsStore } from './store.layout';
export type { TraceTimelineLayoutPrefsStore } from './store.layout';

export { useTraceTimelineStore } from './store.timeline';
export type { TraceTimelineInteractionStore } from './store.timeline';

export {
  applyDetailSubsectionToggle,
  calculateFocusedFindRowStates,
  getSelectedSpanID,
  trimFocusedDetailStatesForSidePanel,
} from './timeline-utils';
export type { FocusedFindRowStates } from './timeline-utils';

/** Combined shape for typing/tests that span both Zustand slices. */
export type TraceTimelineLayoutStore = TraceTimelineLayoutPrefsStore & TraceTimelineInteractionStore;

export function setDetailPanelMode(mode: SpanDetailPanelMode): void {
  if (mode === 'sidepanel') {
    const { detailStates } = useTraceTimelineStore.getState();
    if (detailStates.size > 0) {
      const firstKey = detailStates.keys().next().value as string;
      useTraceTimelineStore.setState({
        detailStates: new Map([[firstKey, DetailState.forDetailPanelMode('sidepanel')]]),
      });
    }
  }
  useLayoutPrefsStore.getState().applyDetailPanelModeToLayout(mode);
}
