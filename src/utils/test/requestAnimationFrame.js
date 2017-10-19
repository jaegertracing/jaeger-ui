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

const DEFAULT_ELAPSE = 0;

export default function requestAnimationFrame(callback) {
  return setTimeout(callback, DEFAULT_ELAPSE);
}

export function cancelAnimationFrame(id) {
  return clearTimeout(id);
}

export function polyfill(target, msElapse = DEFAULT_ELAPSE) {
  if (!target.requestAnimationFrame) {
    if (msElapse === DEFAULT_ELAPSE) {
      // eslint-disable-next-line no-param-reassign
      target.requestAnimationFrame = requestAnimationFrame;
    } else {
      // eslint-disable-next-line no-param-reassign, no-shadow
      target.requestAnimationFrame = callback => setTimeout(callback, msElapse);
    }
  }
  if (!target.cancelAnimationFrame) {
    // eslint-disable-next-line no-param-reassign
    target.cancelAnimationFrame = cancelAnimationFrame;
  }
}
