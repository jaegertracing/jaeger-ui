// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import Tween from './Tween';

const DURATION_MS = 350;

let lastTween: Tween | void;

// Check if browser supports CSS scroll-behavior
const isSmoothScrollSupported = typeof document !== 'undefined' && 'scrollBehavior' in document.documentElement.style;

// Apply smooth scrolling class to html element if supported
if (isSmoothScrollSupported && document.documentElement) {
  document.documentElement.classList.add('u-smooth-scroll');
}

function _onTweenUpdate({ done, value }: { done: boolean; value: number }) {
  window.scrollTo(window.scrollX, value);
  if (done) {
    lastTween = undefined;
  }
}

export function scrollBy(yDelta: number, appendToLast = false) {
  if (isSmoothScrollSupported) {
    window.scrollBy({
      top: yDelta,
      behavior: 'smooth',
    });
    return;
  }

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
  if (isSmoothScrollSupported) {
    window.scrollTo({
      top: y,
      behavior: 'smooth',
    });
    return;
  }

  const { scrollY } = window;
  lastTween = new Tween({ duration: DURATION_MS, from: scrollY, to: y, onUpdate: _onTweenUpdate });
}

export function cancel() {
  if (lastTween) {
    lastTween.cancel();
    lastTween = undefined;
  }
}