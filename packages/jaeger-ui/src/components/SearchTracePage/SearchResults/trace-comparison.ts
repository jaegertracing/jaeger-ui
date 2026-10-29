// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Returns the accessible aria-label for trace comparison checkboxes across
 * list view, diff tray, and table view.
 */
export function getTraceComparisonLabel(traceID: string, traceName?: string | null): string {
  const label = traceName || traceID;
  return `Select trace ${label} for comparison`;
}
