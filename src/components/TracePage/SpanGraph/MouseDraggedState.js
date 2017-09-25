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

import _clamp from 'lodash/clamp';

/**
 * Which items of a {@link SpanDetail} component are expanded.
 */
export default class MouseDraggedState {
  clientRect: ClientRect;
  max: number;
  min: number;
  position: number;
  start: number;
  tag: string;

  static newFromOptions(options: {
    clientRect: ClientRect,
    clientX: number,
    max?: number,
    min?: number,
    tag: string,
  }) {
    const opts = {};
    opts.clientRect = options.clientRect;
    opts.max = options.max == null ? 1 : options.max;
    opts.min = options.min == null ? 0 : options.min;
    opts.position = (options.clientX - opts.clientRect.left) / (opts.clientRect.width || 1);
    opts.start = opts.position;
    opts.tag = options.tag;
    return new MouseDraggedState(opts);
  }

  constructor(options: {
    clientRect: ClientRect,
    max: number,
    min: number,
    position: number,
    start: number,
    tag: string,
  }) {
    Object.assign(this, options);
  }

  newPositionFromClientX(clientX: number) {
    const position = (clientX - this.clientRect.left) / (this.clientRect.width || 1);
    const next = new MouseDraggedState(this);
    next.position = _clamp(position, this.min, this.max);
    return next;
  }

  getLayout() {
    if (this.position < this.start) {
      return {
        x: `${this.position * 100}%`,
        // right: `${(1 - this.start) * 100}%`,
        width: `${(this.start - this.position) * 100}%`,
        // className: 'isDraggingLeft',
        leadingX: `${this.position * 100}%`,
      };
    }
    return {
      x: `${this.start * 100}%`,
      // right: `${(1 - this.position) * 100}%`,
      width: `${(this.position - this.start) * 100}%`,
      // className: 'isDraggingRight',
      leadingX: `${this.position * 100}%`,
    };
  }
}
