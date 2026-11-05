// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

// The browser animates the scroll (`behavior: 'smooth'`). There is no way to ask it where a smooth scroll is
// headed, so the last target is remembered here to let repeated key presses add up. It is only trusted for
// `APPEND_WINDOW_MS`, roughly how long a smooth scroll takes.
const APPEND_WINDOW_MS = 500;

type TLastScroll = {
  container: Element | Window;
  startedAt: number;
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
  lastScroll = { container, startedAt: Date.now(), to };
  scrollToPosition(container, to, prefersReducedMotion() ? 'auto' : 'smooth');
}

function getInProgressScroll(): TLastScroll | undefined {
  if (lastScroll && Date.now() - lastScroll.startedAt < APPEND_WINDOW_MS) {
    return lastScroll;
  }
  return undefined;
}

export function scrollBy(yDelta: number, appendToLast = false, container: Element | Window = window) {
  const scrollY = getScrollTop(container);
  let targetFrom = scrollY;
  const inProgress = getInProgressScroll();
  if (appendToLast && inProgress && inProgress.container === container) {
    const currentDirection = inProgress.to < scrollY ? 'up' : 'down';
    const nextDirection = yDelta < 0 ? 'up' : 'down';
    if (currentDirection === nextDirection) {
      targetFrom = inProgress.to;
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
