// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

// The browser animates the scroll (`behavior: 'smooth'`). There is no way to ask it where a smooth scroll is
// headed, so the last target is remembered here to let repeated key presses add up. It is only trusted for
// `APPEND_WINDOW_MS`, roughly how long a smooth scroll takes, and only while the page is still on the way to it
// (see `getAppendTarget`).
const APPEND_WINDOW_MS = 500;

type TLastScroll = {
  container: Element | Window;
  startedAt: number;
  from: number;
  to: number;
};

let lastScroll: TLastScroll | undefined;

// TODO(joe): this util can be modified a bit to be generalized (e.g. take in
// an element as a parameter and use scrollTop instead of window.scrollTo)

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

function startScroll(container: Element | Window, to: number) {
  const from = getScrollTop(container);
  const instant = prefersReducedMotion();
  scrollToPosition(container, to, instant ? 'auto' : 'smooth');
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
  startScroll(container, y);
}

export function cancel() {
  const inProgress = getInProgressScroll();
  lastScroll = undefined;
  if (inProgress) {
    // A new scroll to the current position replaces the smooth scroll that is still running.
    scrollToPosition(inProgress.container, getScrollTop(inProgress.container), 'instant');
  }
}
