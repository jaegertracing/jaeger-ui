// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

// `scrollBy` moves about a page and lets the browser animate it (`behavior: 'smooth'`). There is no way to ask
// the browser where a smooth scroll is headed, so the last target is remembered here to let repeated key
// presses add up. It is only trusted for `APPEND_WINDOW_MS`, roughly how long a smooth scroll takes, and only
// while the page is still on the way to it (see `getAppendTarget`). A scroll can run longer than that, so
// `cancel()` does not use the window.
//
// `scrollTo` jumps, and does not animate: the browser sets the duration of a smooth scroll (up to about 1.5 s)
// and it grows with the distance, which is far slower than needed to step through matches in a large trace.
const APPEND_WINDOW_MS = 500;

type TLastScroll = {
  container: Element | Window;
  startedAt: number;
  from: number;
  to: number;
};

let lastScroll: TLastScroll | undefined;

function getScrollTop(container: Element | Window): number {
  if (container === window) {
    return window.scrollY;
  }
  return (container as Element).scrollTop;
}

function scrollToPosition(container: Element | Window, top: number, behavior: ScrollBehavior) {
  if (container === window) {
    window.scrollTo({ top, behavior });
  } else {
    (container as Element).scrollTo({ top, behavior });
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function cancel() {
  const last = lastScroll;
  lastScroll = undefined;
  if (last) {
    // A new scroll to the current position replaces the smooth scroll that is still running. It does not matter
    // that the scroll may have finished already: the page is then already at the current position.
    scrollToPosition(last.container, getScrollTop(last.container), 'instant');
  }
}

function startScroll(container: Element | Window, to: number) {
  // Only one smooth scroll is tracked, so stop the one on another container instead of leaving it animating.
  if (lastScroll && lastScroll.container !== container) {
    cancel();
  }
  const from = getScrollTop(container);
  const instant = prefersReducedMotion();
  scrollToPosition(container, to, instant ? 'instant' : 'smooth');
  // An instant scroll is over at once, so there is no target for a later key press to add to.
  lastScroll = instant ? undefined : { container, startedAt: Date.now(), from, to };
}

function getInProgressScroll(): TLastScroll | undefined {
  if (lastScroll && Date.now() - lastScroll.startedAt < APPEND_WINDOW_MS) {
    return lastScroll;
  }
  return undefined;
}

// The target of the smooth scroll that is still heading somewhere on `container`, if any. The recent target is
// stale once the page has reached it (the scroll finished) or has left the path from where the scroll started
// to its target (the user scrolled, or something else moved the page), and then a new scroll starts from where
// the page is.
function getAppendTarget(container: Element | Window, scrollY: number): number | undefined {
  const inProgress = getInProgressScroll();
  if (!inProgress || inProgress.container !== container) {
    return undefined;
  }
  const { from, to } = inProgress;
  if (Math.abs(scrollY - to) < 1) {
    return undefined;
  }
  if (scrollY < Math.min(from, to) - 1 || scrollY > Math.max(from, to) + 1) {
    return undefined;
  }
  return to;
}

export function scrollBy(yDelta: number, appendToLast = false, container: Element | Window = window) {
  const scrollY = getScrollTop(container);
  let targetFrom = scrollY;
  const appendTarget = appendToLast ? getAppendTarget(container, scrollY) : undefined;
  if (appendTarget !== undefined) {
    const currentDirection = appendTarget < scrollY ? 'up' : 'down';
    const nextDirection = yDelta < 0 ? 'up' : 'down';
    if (currentDirection === nextDirection) {
      targetFrom = appendTarget;
    }
  }
  startScroll(container, targetFrom + yDelta);
}

export function scrollTo(y: number, container: Element | Window = window) {
  // Only one smooth scroll is tracked, so stop the one on another container instead of leaving it animating.
  // On this container the instant scroll replaces it.
  if (lastScroll && lastScroll.container !== container) {
    cancel();
  }
  lastScroll = undefined;
  scrollToPosition(container, y, 'instant');
}
