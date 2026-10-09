// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Wraps an accordion header's toggle so that a click ending a text selection leaves the
 * section alone.
 *
 * A closed header shows the only copy of the names and values inside it, so dragging
 * across it is how a reader picks one out to copy. Toggling on that click would replace
 * the summary with the expanded table, and the selection would go with it.
 */
export default function accordionToggle(onToggle: (() => void) | null | undefined) {
  if (!onToggle) return null;
  return () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim()) return;
    onToggle();
  };
}
