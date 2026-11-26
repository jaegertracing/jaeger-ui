// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  findServerChildSpan,
  createViewedBoundsFunc,
  getCursorForClientX,
  getViewCursorPosition,
  isErrorSpan,
  mapFromViewSubRange,
  mapToViewSubRange,
  spanContainsErredSpan,
  isKindClient,
  isKindProducer,
} from './utils';

import { SpanKind, StatusCode } from '../../../types/otel';

describe('TraceTimelineViewer/utils', () => {
  describe('getViewedBounds()', () => {
    it('works for the full range', () => {
      const args = { min: 1, max: 2, viewStart: 0, viewEnd: 1 };
      const { start, end } = createViewedBoundsFunc(args)(1, 2);
      expect(start).toBe(0);
      expect(end).toBe(1);
    });

    it('works for a sub-range with a full view', () => {
      const args = { min: 1, max: 2, viewStart: 0, viewEnd: 1 };
      const { start, end } = createViewedBoundsFunc(args)(1.25, 1.75);
      expect(start).toBe(0.25);
      expect(end).toBe(0.75);
    });

    it('works for a sub-range that fills the view', () => {
      const args = { min: 1, max: 2, viewStart: 0.25, viewEnd: 0.75 };
      const { start, end } = createViewedBoundsFunc(args)(1.25, 1.75);
      expect(start).toBe(0);
      expect(end).toBe(1);
    });

    it('works for a sub-range that within a sub-view', () => {
      const args = { min: 100, max: 200, viewStart: 0.1, viewEnd: 0.9 };
      const { start, end } = createViewedBoundsFunc(args)(130, 170);
      expect(start).toBe(0.25);
      expect(end).toBe(0.75);
    });
  });

  describe('isErrorSpan()', () => {
    it('returns true when span has ERROR status code', () => {
      const span = {
        status: { code: StatusCode.ERROR },
      };
      expect(isErrorSpan(span)).toBe(true);
    });

    it('returns false when span has OK status code', () => {
      const span = {
        status: { code: StatusCode.OK },
      };
      expect(isErrorSpan(span)).toBe(false);
    });

    it('returns false when span has UNSET status code', () => {
      const span = {
        status: { code: StatusCode.UNSET },
      };
      expect(isErrorSpan(span)).toBe(false);
    });
  });

  describe('spanContainsErredSpan()', () => {
    it('returns true only when a descendant has an error status', () => {
      // Using a string to generate the test spans. Each line results in a span. The
      // left number indicates whether or not the generated span has a descendant
      // with an error status (the expectation). The length of the line indicates the
      // depth of the span (i.e. further right is higher depth). The right number
      // indicates whether or not the span has an error status.
      const config = `
        1   0
        1     0
        0       1
        0     0
        1     0
        1       1
        0         1
        0           0
        1         0
        0           1
        0   0
      `
        .trim()
        .split('\n')
        .map(s => s.trim());
      // Get the expectation, str -> number -> bool
      const expectations = config.map(s => Boolean(Number(s[0])));
      const spans = config.map(line => ({
        depth: line.length,
        status: { code: +line.slice(-1) ? StatusCode.ERROR : StatusCode.OK },
      }));

      expectations.forEach((target, i) => {
        // include the index in the expect condition to know which span failed
        // (if there is a failure, that is)
        const result = [i, spanContainsErredSpan(spans, i)];
        expect(result).toEqual([i, target]);
      });
    });

    it('leaves out the descendants in skipIDs', () => {
      const error = { code: StatusCode.ERROR };
      const spans = [
        { spanID: 'a', depth: 0, status: { code: StatusCode.OK } },
        { spanID: 'b', depth: 1, status: error },
        { spanID: 'c', depth: 2, status: error },
      ];
      expect(spanContainsErredSpan(spans, 0, new Set(['b']))).toBe(true);
      expect(spanContainsErredSpan(spans, 0, new Set(['b', 'c']))).toBe(false);
    });
  });

  describe('findServerChildSpan()', () => {
    let spans;

    beforeEach(() => {
      spans = [
        { depth: 0, kind: SpanKind.CLIENT },
        { depth: 1, kind: SpanKind.INTERNAL },
        { depth: 1, kind: SpanKind.SERVER },
        { depth: 1, kind: SpanKind.PRODUCER },
        { depth: 1, kind: SpanKind.SERVER },
      ];
    });

    it('returns falsy if the first span is not a client', () => {
      expect(findServerChildSpan(spans.slice(1))).toBeFalsy();
    });

    it('returns the first server span', () => {
      const span = findServerChildSpan(spans);
      expect(span).toBe(spans[2]);
    });

    it('bails when a non-child-depth span is encountered', () => {
      spans[1].depth++;
      expect(findServerChildSpan(spans)).toBeFalsy();
      spans[1].depth = spans[0].depth;
      expect(findServerChildSpan(spans)).toBeFalsy();
    });
  });

  describe('isKindClient()', () => {
    it('returns true when span kind is CLIENT', () => {
      const span = { kind: SpanKind.CLIENT };
      expect(isKindClient(span)).toBe(true);
    });

    it('returns false when span kind is not CLIENT', () => {
      const span = { kind: SpanKind.SERVER };
      expect(isKindClient(span)).toBe(false);
    });
  });

  describe('isKindProducer()', () => {
    it('returns true when span kind is PRODUCER', () => {
      const span = { kind: SpanKind.PRODUCER };
      expect(isKindProducer(span)).toBe(true);
    });

    it('returns false when span kind is not PRODUCER', () => {
      const span = { kind: SpanKind.CLIENT };
      expect(isKindProducer(span)).toBe(false);
    });
  });

  describe('sub-range cursor coordinate mapping', () => {
    it('maps normalized positions to and from zoomed sub-ranges', () => {
      expect(mapFromViewSubRange(0.25, 0.75, 0.5)).toBe(0.5);
      expect(mapToViewSubRange(0.25, 0.75, 0.5)).toBe(0.5);
      expect(mapFromViewSubRange(0.2, 0.8, 0.25)).toBeCloseTo(0.35);
      expect(mapToViewSubRange(0.2, 0.8, 0.35)).toBeCloseTo(0.25);
    });

    it('returns cursor percentage when visible and hides when out of range or invalid', () => {
      expect(getViewCursorPosition({ current: [0, 1], cursor: 0.4 })).toBe('40%');
      expect(getViewCursorPosition({ current: [0.25, 0.75], cursor: 0.5 })).toBe('50%');
      expect(getViewCursorPosition({ current: [0.25, 0.75], cursor: 0.1 })).toBeUndefined();
      expect(getViewCursorPosition({ current: [0.25, 0.75], cursor: 0.9 })).toBeUndefined();
      expect(getViewCursorPosition({ current: [0, 1], cursor: null })).toBeUndefined();
      expect(getViewCursorPosition({ current: [0, 1], cursor: Number.NaN })).toBeUndefined();
      expect(getViewCursorPosition({ current: [0.5, 0.5], cursor: 0.5 })).toBeUndefined();
      expect(getViewCursorPosition({ current: [0.8, 0.2], cursor: 0.5 })).toBeUndefined();
      expect(
        getViewCursorPosition({
          current: [0, 1],
          cursor: 0.5,
          reframe: { anchor: 0.2, shift: 0.6 },
        })
      ).toBeUndefined();
    });

    it('maps clientX within the timeline column and ignores out-of-bounds coordinates', () => {
      // Container [0, 1000], nameColumnWidth=0.25 -> timeline spans [250, 1000] (width 750)
      expect(getCursorForClientX(625, 0, 1000, 0.25, [0, 1])).toBe(0.5);
      expect(getCursorForClientX(250, 0, 1000, 0.25, [0.2, 0.8])).toBe(0.2);
      expect(getCursorForClientX(625, 0, 1000, 0.25, [0.2, 0.8])).toBe(0.5);
      expect(getCursorForClientX(1000, 0, 1000, 0.25, [0.2, 0.8])).toBe(0.8);

      // Inside name column or past right edge -> undefined
      expect(getCursorForClientX(249, 0, 1000, 0.25, [0, 1])).toBeUndefined();
      expect(getCursorForClientX(1001, 0, 1000, 0.25, [0, 1])).toBeUndefined();

      // Invalid geometry / ranges -> undefined
      expect(getCursorForClientX(500, 0, 0, 0.25, [0, 1])).toBeUndefined();
      expect(getCursorForClientX(500, 0, 1000, 1, [0, 1])).toBeUndefined();
      expect(getCursorForClientX(500, 0, 1000, 0.25, [0.5, 0.5])).toBeUndefined();
      expect(getCursorForClientX(Number.NaN, 0, 1000, 0.25, [0, 1])).toBeUndefined();
    });
  });
});
