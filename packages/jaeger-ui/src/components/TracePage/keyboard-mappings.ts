// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

const keyboardMappings: Record<string, { binding: string | string[]; label: string }> = {
  scrollPageDown: { binding: 's', label: 'Scroll down' },
  scrollPageUp: { binding: 'w', label: 'Scroll up' },
  scrollToNextVisibleSpan: { binding: 'f', label: 'Scroll to the next visible span' },
  scrollToPrevVisibleSpan: { binding: 'b', label: 'Scroll to the previous visible span' },
  panLeft: { binding: ['a', 'left'], label: 'Pan left' },
  panLeftFast: { binding: ['shift+a', 'shift+left'], label: 'Pan left — Large' },
  panRight: { binding: ['d', 'right'], label: 'Pan right' },
  panRightFast: { binding: ['shift+d', 'shift+right'], label: 'Pan right — Large' },
  zoomIn: { binding: 'up', label: 'Zoom in' },
  zoomInFast: { binding: 'shift+up', label: 'Zoom in — Large' },
  zoomOut: { binding: 'down', label: 'Zoom out' },
  zoomOutFast: { binding: 'shift+down', label: 'Zoom out — Large' },
  collapseAll: { binding: ']', label: 'Collapse All' },
  expandAll: { binding: '[', label: 'Expand All' },
  collapseOne: { binding: 'p', label: 'Collapse One Level' },
  expandOne: { binding: 'o', label: 'Expand One Level' },
  searchSpans: { binding: 'ctrl+b', label: 'Search Spans' },
  clearSearch: { binding: 'escape', label: 'Clear Search' },
};

export default keyboardMappings;
