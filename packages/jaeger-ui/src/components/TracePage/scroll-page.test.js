// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

vi.mock('./Tween');

import { scrollBy, scrollTo, cancel } from './scroll-page';
import Tween from './Tween';

// keep track of instances, manually
// https://github.com/facebook/jest/issues/5019
const tweenInstances = [];

describe('scroll-by', () => {
  beforeEach(() => {
    window.scrollY = 100;
    tweenInstances.length = 0;
    Tween.mockClear();
    Tween.mockImplementation(function (opts) {
      const rv = { to: opts.to, onUpdate: opts.onUpdate };
      Object.keys(Tween.prototype).forEach(name => {
        if (name !== 'constructor') {
          rv[name] = jest.fn();
        }
      });
      tweenInstances.push(rv);
      return rv;
    });
  });

  afterEach(() => {
    cancel();
  });

  describe('scrollBy()', () => {
    describe('when `appendToLast` is `false`', () => {
      it('scrolls from `window.scrollY` to `window.scrollY + yDelta`', () => {
        const yDelta = 10;
        scrollBy(yDelta);
        const spec = expect.objectContaining({ to: window.scrollY + yDelta });
        expect(Tween.mock.calls).toEqual([[spec]]);
      });
    });

    describe('when `appendToLast` is true', () => {
      it('is the same as `appendToLast === false` without an in-progress scroll', () => {
        const yDelta = 10;
        scrollBy(yDelta, true);
        expect(Tween.mock.calls.length).toBe(1);
        scrollBy(yDelta, false);
        expect(Tween.mock.calls[0][0].to).toBe(Tween.mock.calls[1][0].to);
        expect(Tween.mock.calls[0][0].duration).toBe(Tween.mock.calls[1][0].duration);
        expect(Tween.mock.calls[0][0].from).toBe(Tween.mock.calls[1][0].from);
      });

      it('is additive when an in-progress scroll is the same direction', () => {
        const yDelta = 10;
        const spec = expect.objectContaining({ to: window.scrollY + 2 * yDelta });
        scrollBy(yDelta);
        scrollBy(yDelta, true);
        expect(Tween.mock.calls.length).toBe(2);
        expect(Tween.mock.calls[1]).toEqual([spec]);
      });

      it('ignores the in-progress scroll is the other direction', () => {
        const yDelta = 10;
        const spec = expect.objectContaining({ to: window.scrollY - yDelta });
        scrollBy(yDelta);
        scrollBy(-yDelta, true);
        expect(Tween.mock.calls.length).toBe(2);
        expect(Tween.mock.calls[1]).toEqual([spec]);
      });
    });
  });

  describe('scrollTo', () => {
    it('scrolls to `y`', () => {
      const to = 10;
      const spec = expect.objectContaining({ to });
      scrollTo(to);
      expect(Tween.mock.calls).toEqual([[spec]]);
    });

    it('ignores the in-progress scroll', () => {
      const to = 10;
      const spec = expect.objectContaining({ to });
      scrollTo(Math.random());
      scrollTo(to);
      expect(Tween.mock.calls.length).toBe(2);
      expect(Tween.mock.calls[1]).toEqual([spec]);
    });
  });

  describe('cancel', () => {
    it('cancels the in-progress scroll', () => {
      scrollTo(10);
      // there is now an in-progress tween
      expect(tweenInstances.length).toBe(1);
      const tw = tweenInstances[0];
      cancel();
      expect(tw.cancel.mock.calls).toEqual([[]]);
    });

    it('is a noop if there is not an in-progress scroll', () => {
      scrollTo(10);
      // there is now an in-progress tween
      expect(tweenInstances.length).toBe(1);
      const tw = tweenInstances[0];
      cancel();
      expect(tw.cancel.mock.calls).toEqual([[]]);
      tw.cancel.mockReset();
      // now, we check to see if `cancel()` has an effect on the last created tween
      cancel();
      expect(tw.cancel.mock.calls.length).toBe(0);
    });
  });

  describe('_onTweenUpdate', () => {
    let oldScrollTo;

    beforeEach(() => {
      oldScrollTo = window.scrollTo;
      window.scrollTo = jest.fn();
    });

    afterEach(() => {
      window.scrollTo = oldScrollTo;
    });

    it('scrolls to `value`', () => {
      const value = 123;
      // cause a `Tween` to be created to get a reference to _onTweenUpdate
      scrollTo(10);
      const { onUpdate } = tweenInstances[0];
      onUpdate({ value, done: false });
      expect(window.scrollTo.mock.calls.length).toBe(1);
      expect(window.scrollTo.mock.calls[0][1]).toBe(value);
    });

    it('discards the in-progress scroll if the scroll is done', () => {
      // cause a `Tween` to be created to get a reference to _onTweenUpdate
      scrollTo(10);
      const { onUpdate, cancel: twCancel } = tweenInstances[0];
      onUpdate({ value: 123, done: true });
      // if the tween is not discarded, `cancel()` will cancel it
      cancel();
      expect(twCancel.mock.calls.length).toBe(0);
    });
  });

  describe('element scrolling', () => {
    let container;
    beforeEach(() => {
      container = {
        scrollTop: 50,
        scrollLeft: 0,
      };
      Tween.mockClear();
      cancel();
    });

    it('reads and updates element scrollTop instead of window.scrollY', () => {
      scrollBy(100, false, container);
      expect(Tween.mock.calls.length).toBe(1);

      const tweenOptions = Tween.mock.calls[0][0];
      expect(tweenOptions.from).toBe(50);
      expect(tweenOptions.to).toBe(150);

      // Simulate tween update
      tweenOptions.onUpdate({ done: false, value: 75 });
      expect(container.scrollTop).toBe(75);
    });

    it('scrollTo works with elements', () => {
      scrollTo(200, container);
      expect(Tween.mock.calls.length).toBe(1);

      const tweenOptions = Tween.mock.calls[0][0];
      expect(tweenOptions.from).toBe(50);
      expect(tweenOptions.to).toBe(200);

      // Simulate tween update
      tweenOptions.onUpdate({ done: true, value: 200 });
      expect(container.scrollTop).toBe(200);
    });

    it('does not append a window tween when scrolling an element', () => {
      window.scrollY = 100;

      // Start a window scroll.
      scrollBy(100);

      // Start an element scroll while the window tween is still active.
      scrollBy(10, true, container);

      expect(Tween.mock.calls.length).toBe(2);

      const tweenOptions = Tween.mock.calls[1][0];

      expect(tweenOptions.from).toBe(50);
      expect(tweenOptions.to).toBe(60);
    });

    it('does not clear the active tween when an older cross-container tween completes', () => {
      window.scrollY = 100;

      // Start tween A (window).
      scrollBy(100);

      // Start tween B (element) while A is still active.
      scrollBy(10, false, container);

      expect(tweenInstances.length).toBe(2);
      const tweenA = tweenInstances[0];
      const tweenB = tweenInstances[1];

      // A finishes first — invoke its onUpdate with done: true.
      tweenA.onUpdate({ value: 200, done: true });

      // cancel() should still cancel B since B is the active tween.
      cancel();
      expect(tweenB.cancel.mock.calls.length).toBe(1);
      expect(tweenA.cancel.mock.calls.length).toBe(0);
    });
  });
});
