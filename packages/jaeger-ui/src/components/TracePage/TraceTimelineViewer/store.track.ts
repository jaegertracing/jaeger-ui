// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useTraceTimelineStore } from './store';
import type { SpanDetailPanelMode } from '../../../types/config';
import { IEvent } from '../../../types/otel';
import { isWaEnabled, trackEvent } from '../../../utils/tracking';
import { getToggleValue } from '../../../utils/tracking/common';

// Analytics for timeline interactions. Call each tracker immediately before the matching
// store action: it reads the pre-update state, as the Redux tracking middleware in
// `duck.track.ts` does, to report whether the interaction opens or closes something.

const ACTION_RESIZE = 'resize';
const ACTION_COLLAPSE_ALL = 'collapse-all';
const ACTION_COLLAPSE_ONE = 'collapse-one';
const ACTION_EXPAND_ALL = 'expand-all';
const ACTION_EXPAND_ONE = 'expand-one';

const CATEGORY_BASE = 'jaeger/ux/trace/timeline';
// export for tests
export const CATEGORY_COLUMN = `${CATEGORY_BASE}/column`;
export const CATEGORY_EXPAND_COLLAPSE = `${CATEGORY_BASE}/expand-collapse`;
export const CATEGORY_LOGS = `${CATEGORY_BASE}/logs`;
export const CATEGORY_LOGS_ITEM = `${CATEGORY_BASE}/logs/item`;
export const CATEGORY_PARENT = `${CATEGORY_BASE}/parent`;
export const CATEGORY_PROCESS = `${CATEGORY_BASE}/process`;
export const CATEGORY_ROW = `${CATEGORY_BASE}/row`;
export const CATEGORY_TAGS = `${CATEGORY_BASE}/tags`;
export const CATEGORY_PANEL_MODE = `${CATEGORY_BASE}/panel-mode`;
export const CATEGORY_TIMELINE_VISIBLE = `${CATEGORY_BASE}/timeline-visible`;

// The Redux tracking middleware is only installed when web analytics is enabled, so a
// reporter whose isEnabled() returns false never receives timeline events. Keep that gate.
function track(...args: Parameters<typeof trackEvent>) {
  if (isWaEnabled) trackEvent(...args);
}

const getDetail = (spanID: string) => useTraceTimelineStore.getState().detailStates.get(spanID);

export function trackChildrenToggle(spanID: string) {
  const { childrenHiddenIDs, traceSpans } = useTraceTimelineStore.getState();
  const span = traceSpans?.find(sp => sp.spanID === spanID);
  if (span) {
    track(CATEGORY_PARENT, getToggleValue(!childrenHiddenIDs.has(spanID)), span.depth);
  }
}

export const trackCollapseAll = () => track(CATEGORY_EXPAND_COLLAPSE, ACTION_COLLAPSE_ALL);
export const trackCollapseOne = () => track(CATEGORY_EXPAND_COLLAPSE, ACTION_COLLAPSE_ONE);
export const trackExpandAll = () => track(CATEGORY_EXPAND_COLLAPSE, ACTION_EXPAND_ALL);
export const trackExpandOne = () => track(CATEGORY_EXPAND_COLLAPSE, ACTION_EXPAND_ONE);

export const trackDetailToggle = (spanID: string) =>
  track(CATEGORY_ROW, getToggleValue(Boolean(getDetail(spanID))));

export function trackDetailTagsToggle(spanID: string) {
  const detail = getDetail(spanID);
  if (detail) track(CATEGORY_TAGS, getToggleValue(detail.isAttributesOpen));
}

export function trackDetailProcessToggle(spanID: string) {
  const detail = getDetail(spanID);
  if (detail) track(CATEGORY_PROCESS, getToggleValue(detail.isResourceOpen));
}

export function trackDetailLogsToggle(spanID: string) {
  const detail = getDetail(spanID);
  if (detail) track(CATEGORY_LOGS, getToggleValue(detail.events.isOpen));
}

export function trackDetailLogItemToggle(spanID: string, logItem: IEvent) {
  const detail = getDetail(spanID);
  if (detail) track(CATEGORY_LOGS_ITEM, getToggleValue(detail.events.openedItems.has(logItem)));
}

// Span-name column and side-panel resizes share one category.
export const trackColumnWidth = (width: number) =>
  track(CATEGORY_COLUMN, ACTION_RESIZE, Math.round(width * 1000));
export const trackDetailPanelMode = (mode: SpanDetailPanelMode) => track(CATEGORY_PANEL_MODE, mode);
export const trackTimelineBarsVisible = (visible: boolean) =>
  track(CATEGORY_TIMELINE_VISIBLE, String(visible));
