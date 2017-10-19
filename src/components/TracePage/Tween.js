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

import ease from 'tween-functions';

type TweenCallback = ({ done: boolean, value: number }) => void;

type TweenOptions = {
  delay?: number,
  duration: number,
  from: number,
  onComplete?: TweenCallback,
  onUpdate?: TweenCallback,
  to: number,
};

export default class Tween {
  callbackComplete: ?TweenCallback;
  callbackUpdate: ?TweenCallback;
  delay: number;
  duration: number;
  from: number;
  requestID: ?number;
  startTime: number;
  timeoutID: ?number;
  to: number;

  constructor({ duration, from, to, delay, onUpdate, onComplete }: TweenOptions) {
    this.startTime = Date.now() + (delay || 0);
    this.duration = duration;
    this.from = from;
    this.to = to;
    if (!onUpdate && !onComplete) {
      this.callbackComplete = undefined;
      this.callbackUpdate = undefined;
      this.timeoutID = undefined;
      this.requestID = undefined;
    } else {
      this.callbackComplete = onComplete;
      this.callbackUpdate = onUpdate;
      if (delay) {
        this.timeoutID = setTimeout(this._frameCallback, delay);
        this.requestID = undefined;
      } else {
        this.requestID = window.requestAnimationFrame(this._frameCallback);
        this.timeoutID = undefined;
      }
    }
  }

  _frameCallback = () => {
    this.timeoutID = undefined;
    this.requestID = undefined;
    const current = Object.freeze(this.getCurrent());
    if (this.callbackUpdate) {
      this.callbackUpdate(current);
    }
    if (this.callbackComplete && current.done) {
      this.callbackComplete(current);
    }
    if (current.done) {
      this.callbackComplete = undefined;
      this.callbackUpdate = undefined;
    } else {
      this.requestID = window.requestAnimationFrame(this._frameCallback);
    }
  };

  cancel() {
    if (this.timeoutID != null) {
      clearTimeout(this.timeoutID);
      this.timeoutID = undefined;
    }
    if (this.requestID != null) {
      window.cancelAnimationFrame(this.requestID);
      this.requestID = undefined;
    }
    this.callbackComplete = undefined;
    this.callbackUpdate = undefined;
  }

  getCurrent(): { done: boolean, value: number } {
    const t = Date.now() - this.startTime;
    if (t <= 0) {
      // still in the delay period
      return { done: false, value: this.from };
    }
    if (t >= this.duration) {
      // after the expiration
      return { done: true, value: this.to };
    }
    // mid-tween
    return { done: false, value: ease.easeOutQuint(t, this.from, this.to, this.duration) };
  }
}
