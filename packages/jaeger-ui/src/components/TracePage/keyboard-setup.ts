// Copyright (c) 2026 The Jaeger Authors
// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { KeyboardEvent } from 'react';
import _mapValues from 'lodash/mapValues';

import {
  CombokeysHandler,
  merge as mergeShortcuts,
  reset as resetShortcuts,
  ShortcutCallbacks,
} from './keyboard-shortcuts';
import { cancel as cancelScroll } from './scroll-page';
import type ScrollManager from './ScrollManager';

const VIEW_CHANGE_BASE = 0.005;
const VIEW_CHANGE_FAST = 0.05;

// export for tests
export const shortcutConfig: { [name: string]: [number, number] } = {
  panLeft: [-VIEW_CHANGE_BASE, -VIEW_CHANGE_BASE],
  panLeftFast: [-VIEW_CHANGE_FAST, -VIEW_CHANGE_FAST],
  panRight: [VIEW_CHANGE_BASE, VIEW_CHANGE_BASE],
  panRightFast: [VIEW_CHANGE_FAST, VIEW_CHANGE_FAST],
  zoomIn: [VIEW_CHANGE_BASE, -VIEW_CHANGE_BASE],
  zoomInFast: [VIEW_CHANGE_FAST, -VIEW_CHANGE_FAST],
  zoomOut: [-VIEW_CHANGE_BASE, VIEW_CHANGE_BASE],
  zoomOutFast: [-VIEW_CHANGE_FAST, VIEW_CHANGE_FAST],
};

// export for tests
export function makeShortcutCallbacks(adjRange: (start: number, end: number) => void): ShortcutCallbacks {
  function getHandler([startChange, endChange]: [number, number]): CombokeysHandler {
    return function combokeyHandler(event: KeyboardEvent<HTMLElement>) {
      event.preventDefault();
      adjRange(startChange, endChange);
    };
  }
  return _mapValues(shortcutConfig, getHandler);
}

type SetupParams = {
  scrollManager: ScrollManager;
  adjustViewRange: (startChange: number, endChange: number, trackSrc: string) => void;
  clearSearch: () => void;
  focusOnSearchBar: () => void;
};

/**
 * Register all TracePage keyboard shortcuts (pan/zoom, scroll, search).
 * Returns a cleanup function that resets shortcuts and cancels any pending scroll.
 */
export function setupTracePageShortcuts({
  scrollManager,
  adjustViewRange,
  clearSearch,
  focusOnSearchBar,
}: SetupParams): () => void {
  const { scrollPageDown, scrollPageUp, scrollToNextVisibleSpan, scrollToPrevVisibleSpan } = scrollManager;
  const adjViewRange = (a: number, b: number) => adjustViewRange(a, b, 'kbd');
  const shortcutCallbacks = makeShortcutCallbacks(adjViewRange);
  shortcutCallbacks.scrollPageDown = scrollPageDown;
  shortcutCallbacks.scrollPageUp = scrollPageUp;
  shortcutCallbacks.scrollToNextVisibleSpan = scrollToNextVisibleSpan;
  shortcutCallbacks.scrollToPrevVisibleSpan = scrollToPrevVisibleSpan;
  shortcutCallbacks.clearSearch = clearSearch;
  shortcutCallbacks.searchSpans = focusOnSearchBar;
  mergeShortcuts(shortcutCallbacks);

  return () => {
    resetShortcuts();
    cancelScroll();
  };
}
