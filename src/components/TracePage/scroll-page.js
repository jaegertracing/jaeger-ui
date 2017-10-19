// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import Tween from './Tween';

const DURATION_MS = 350;

let lastTween: ?Tween;

// TODO(joe): this util can be modified a bit to be generalized (e.g. take in
// an element as a parameter and use scrollTop instead of window.scrollTo)

function _onTweenUpdate({ done, value }: { done: boolean, value: number }) {
  window.scrollTo(window.scrollX, value);
  if (done) {
    lastTween = null;
  }
}

export function scrollBy(yDelta: number, appendToLast: ?boolean = false) {
  const { scrollY } = window;
  let targetFrom = scrollY;
  if (appendToLast && lastTween) {
    const currentDirection = lastTween.to < scrollY ? 'up' : 'down';
    const nextDirection = yDelta < 0 ? 'up' : 'down';
    if (currentDirection === nextDirection) {
      targetFrom = lastTween.to;
    }
  }
  const to = targetFrom + yDelta;
  lastTween = new Tween({ to, duration: DURATION_MS, from: scrollY, onUpdate: _onTweenUpdate });
}

export function scrollTo(y: number) {
  const { scrollY } = window;
  lastTween = new Tween({ duration: DURATION_MS, from: scrollY, to: y, onUpdate: _onTweenUpdate });
}

export function cancel() {
  if (lastTween) {
    lastTween.cancel();
    lastTween = undefined;
  }
}
