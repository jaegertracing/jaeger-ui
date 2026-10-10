// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import getConfig from '../../../utils/config/get-config';

/**
 * Returns the short trace ID formatted according to the configured display length (default 7).
 */
export function formatShortTraceId(traceId: string): string {
  if (!traceId) return '';
  const traceIdDisplayLength = getConfig().traceIdDisplayLength || 7;
  return traceId.slice(0, traceIdDisplayLength);
}

/**
 * Returns the accessible aria-label for trace comparison checkboxes across
 * list view, diff tray, and table view.
 */
export function getTraceComparisonLabel(traceID: string, traceName?: string | null): string {
  const label = traceName || formatShortTraceId(traceID);
  return `Select trace ${label} for comparison`;
}
