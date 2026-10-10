// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import Tween from './Tween';

const DURATION_MS = 350;

let lastTween: Tween | void;
let lastTweenContainer: Element | Window | void;
let tweenGeneration = 0;

// TODO(joe): this util can be modified a bit to be generalized (e.g. take in
// an element as a parameter and use scrollTop instead of window.scrollTo)

function getScrollTop(container: Element | Window): number {
  if (container === window) {
    return window.scrollY;
  }
  return (container as Element).scrollTop;
}

function setScrollTop(container: Element | Window, value: number) {
  if (container === window) {
    window.scrollTo(window.scrollX, value);
  } else {
    (container as Element).scrollTop = value;
  }
}

function _onTweenUpdate(
  container: Element | Window,
  { done, value }: { done: boolean; value: number },
  gen: number
) {
  if (gen !== tweenGeneration) {
    return;
  }
  setScrollTop(container, value);
  if (done) {
    lastTween = undefined;
    lastTweenContainer = undefined;
  }
}

export function scrollBy(yDelta: number, appendToLast = false, container: Element | Window = window) {
  const scrollY = getScrollTop(container);
  let targetFrom = scrollY;
  if (appendToLast && lastTween && lastTweenContainer === container) {
    const currentDirection = lastTween.to < scrollY ? 'up' : 'down';
    const nextDirection = yDelta < 0 ? 'up' : 'down';
    if (currentDirection === nextDirection) {
      targetFrom = lastTween.to;
    }
  }
  const to = targetFrom + yDelta;
  const gen = ++tweenGeneration;
  lastTween = new Tween({
    to,
    duration: DURATION_MS,
    from: scrollY,
    onUpdate: state => _onTweenUpdate(container, state, gen),
  });
  lastTweenContainer = container;
}

export function scrollTo(y: number, container: Element | Window = window) {
  const scrollY = getScrollTop(container);
  const gen = ++tweenGeneration;
  lastTween = new Tween({
    duration: DURATION_MS,
    from: scrollY,
    to: y,
    onUpdate: state => _onTweenUpdate(container, state, gen),
  });
  lastTweenContainer = container;
}

export function cancel() {
  if (lastTween) {
    lastTween.cancel();
    lastTween = undefined;
    lastTweenContainer = undefined;
  }
}
