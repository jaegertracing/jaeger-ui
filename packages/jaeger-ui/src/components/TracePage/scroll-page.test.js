// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { scrollBy, scrollTo, cancel } from './scroll-page';

describe('scroll-page', () => {
  let oldScrollTo;
  let oldMatchMedia;

  beforeEach(() => {
    vi.useFakeTimers();
    window.scrollY = 100;
    oldScrollTo = window.scrollTo;
    oldMatchMedia = window.matchMedia;
    window.scrollTo = vi.fn();
    window.matchMedia = undefined;
  });

  afterEach(() => {
    cancel();
    window.scrollTo = oldScrollTo;
    window.matchMedia = oldMatchMedia;
    vi.useRealTimers();
  });

  describe('scrollBy()', () => {
    describe('when `appendToLast` is `false`', () => {
      it('scrolls smoothly from `window.scrollY` to `window.scrollY + yDelta`', () => {
        scrollBy(10);
        expect(window.scrollTo.mock.calls).toEqual([[{ top: 110, behavior: 'smooth' }]]);
      });
    });

    describe('when `appendToLast` is true', () => {
      it('is the same as `appendToLast === false` without an in-progress scroll', () => {
        scrollBy(10, true);
        scrollBy(10, false);
        expect(window.scrollTo.mock.calls[0]).toEqual(window.scrollTo.mock.calls[1]);
      });

      it('is additive when an in-progress scroll is the same direction', () => {
        scrollBy(10);
        scrollBy(10, true);
        expect(window.scrollTo.mock.calls[1]).toEqual([{ top: 120, behavior: 'smooth' }]);
      });

      it('ignores the in-progress scroll is the other direction', () => {
        scrollBy(10);
        scrollBy(-10, true);
        expect(window.scrollTo.mock.calls[1]).toEqual([{ top: 90, behavior: 'smooth' }]);
      });

      it('ignores a scroll that was started long ago', () => {
        scrollBy(10);
        vi.advanceTimersByTime(1000);
        scrollBy(10, true);
        expect(window.scrollTo.mock.calls[1]).toEqual([{ top: 110, behavior: 'smooth' }]);
      });
    });

    describe('when the last target may be stale', () => {
      it('keeps adding while the page is still on the way to the target', () => {
        scrollBy(100);
        window.scrollY = 150;
        scrollBy(100, true);
        expect(window.scrollTo.mock.calls[1]).toEqual([{ top: 300, behavior: 'smooth' }]);
      });

      it('starts from the page once it has reached the target', () => {
        scrollBy(100);
        window.scrollY = 199.5;
        scrollBy(100, true);
        expect(window.scrollTo.mock.calls[1]).toEqual([{ top: 299.5, behavior: 'smooth' }]);
      });

      it('starts from the page when it has left the path to the target', () => {
        scrollBy(100);
        window.scrollY = 50;
        scrollBy(100, true);
        expect(window.scrollTo.mock.calls[1]).toEqual([{ top: 150, behavior: 'smooth' }]);
      });

      it('starts from the page when it has left the path in the other direction', () => {
        scrollBy(-50);
        window.scrollY = 300;
        scrollBy(-50, true);
        expect(window.scrollTo.mock.calls[1]).toEqual([{ top: 250, behavior: 'smooth' }]);
      });

      it('does not add to an instant scroll made for reduced motion', () => {
        window.matchMedia = vi.fn(() => ({ matches: true }));
        scrollBy(100);
        scrollBy(100, true);
        expect(window.scrollTo.mock.calls).toEqual([
          [{ top: 200, behavior: 'instant' }],
          [{ top: 200, behavior: 'instant' }],
        ]);
      });
    });

    it('does not animate when the user prefers reduced motion', () => {
      window.matchMedia = vi.fn(() => ({ matches: true }));
      scrollBy(10);
      expect(window.scrollTo.mock.calls).toEqual([[{ top: 110, behavior: 'instant' }]]);
    });
  });

  describe('scrollTo()', () => {
    it('jumps to `y` without animating', () => {
      scrollTo(10);
      expect(window.scrollTo.mock.calls).toEqual([[{ top: 10, behavior: 'instant' }]]);
    });

    it('ignores the in-progress scroll', () => {
      scrollTo(50);
      scrollTo(10);
      expect(window.scrollTo.mock.calls[1]).toEqual([{ top: 10, behavior: 'instant' }]);
    });

    it('does not let a later `scrollBy` add to the page it jumped from', () => {
      scrollBy(10);
      scrollTo(500);
      scrollBy(10, true);
      expect(window.scrollTo.mock.calls[2]).toEqual([{ top: 110, behavior: 'smooth' }]);
    });

    it('replaces a smooth scroll that is still running, so there is nothing left to cancel', () => {
      scrollBy(10);
      scrollTo(500);
      window.scrollTo.mockClear();
      cancel();
      expect(window.scrollTo).not.toHaveBeenCalled();
    });
  });

  describe('cancel()', () => {
    it('replaces the in-progress scroll with an instant scroll to the current position', () => {
      scrollBy(10);
      window.scrollTo.mockClear();
      cancel();
      expect(window.scrollTo.mock.calls).toEqual([[{ top: 100, behavior: 'instant' }]]);
    });

    it('is a noop if there is not an in-progress scroll', () => {
      scrollBy(10);
      cancel();
      window.scrollTo.mockClear();
      cancel();
      expect(window.scrollTo).not.toHaveBeenCalled();
    });

    it('stops a smooth scroll that is still running after the time appending is allowed for', () => {
      scrollBy(15000);
      vi.advanceTimersByTime(1000);
      window.scrollTo.mockClear();
      cancel();
      expect(window.scrollTo.mock.calls).toEqual([[{ top: 100, behavior: 'instant' }]]);
    });

    it('is a noop after the reduced-motion scroll, which is instant', () => {
      window.matchMedia = vi.fn(() => ({ matches: true }));
      scrollBy(10);
      window.scrollTo.mockClear();
      cancel();
      expect(window.scrollTo).not.toHaveBeenCalled();
    });
  });

  describe('element scrolling', () => {
    let container;

    beforeEach(() => {
      container = { scrollTop: 50, scrollTo: vi.fn() };
    });

    it('reads `scrollTop` and scrolls the element instead of the window', () => {
      scrollBy(100, false, container);
      expect(container.scrollTo.mock.calls).toEqual([[{ top: 150, behavior: 'smooth' }]]);
      expect(window.scrollTo).not.toHaveBeenCalled();
    });

    it('scrollTo works with elements', () => {
      scrollTo(200, container);
      expect(container.scrollTo.mock.calls).toEqual([[{ top: 200, behavior: 'instant' }]]);
    });

    it('stops a smooth scroll on the window when scrollTo jumps an element', () => {
      scrollBy(100);
      window.scrollTo.mockClear();
      scrollTo(10, container);
      expect(window.scrollTo.mock.calls).toEqual([[{ top: 100, behavior: 'instant' }]]);
      expect(container.scrollTo.mock.calls).toEqual([[{ top: 10, behavior: 'instant' }]]);
    });

    it('does not append to a window scroll when scrolling an element', () => {
      scrollBy(100);
      scrollBy(10, true, container);
      expect(container.scrollTo.mock.calls).toEqual([[{ top: 60, behavior: 'smooth' }]]);
    });

    it('stops the scroll on the window when an element starts scrolling', () => {
      scrollBy(100);
      window.scrollTo.mockClear();
      scrollBy(10, false, container);
      expect(window.scrollTo.mock.calls).toEqual([[{ top: 100, behavior: 'instant' }]]);
      expect(container.scrollTo.mock.calls).toEqual([[{ top: 60, behavior: 'smooth' }]]);
    });

    it('stops the scroll on an element when the window starts scrolling', () => {
      scrollBy(10, false, container);
      container.scrollTo.mockClear();
      scrollBy(100);
      expect(container.scrollTo.mock.calls).toEqual([[{ top: 50, behavior: 'instant' }]]);
      expect(window.scrollTo.mock.calls).toEqual([[{ top: 200, behavior: 'smooth' }]]);
    });

    it('does not stop anything when the same element scrolls again', () => {
      scrollBy(10, false, container);
      container.scrollTo.mockClear();
      scrollBy(10, true, container);
      expect(container.scrollTo.mock.calls).toEqual([[{ top: 70, behavior: 'smooth' }]]);
    });

    it('cancels the scroll on the element that is scrolling', () => {
      scrollBy(100);
      scrollBy(10, false, container);
      window.scrollTo.mockClear();
      cancel();
      expect(window.scrollTo).not.toHaveBeenCalled();
      expect(container.scrollTo.mock.calls[1]).toEqual([{ top: 50, behavior: 'instant' }]);
    });
  });
});
