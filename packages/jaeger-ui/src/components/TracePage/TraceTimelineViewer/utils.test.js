// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  findServerChildSpan,
  createViewedBoundsFunc,
  isClientSpan,
  isErrorSpan,
  isServerSpan,
  spanContainsErredSpan,
  spanHasTag,
  isErrorOtelSpan,
  otelSpanContainsErredSpan,
  findServerChildOtelSpan,
  isOtelKindClient,
  isOtelKindProducer,
} from './utils';

import traceGenerator from '../../../demo/trace-generators';
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

  describe('spanHasTag() and variants', () => {
    it('returns true iff the key/value pair is found', () => {
      const tags = traceGenerator.tags();
      tags.push({ key: 'span.kind', value: 'server' });
      expect(spanHasTag('span.kind', 'client', { tags })).toBe(false);
      expect(spanHasTag('span.kind', 'client', { tags })).toBe(false);
      expect(spanHasTag('span.kind', 'server', { tags })).toBe(true);
    });

    const spanTypeTestCases = [
      { fn: isClientSpan, name: 'isClientSpan', key: 'span.kind', value: 'client' },
      { fn: isServerSpan, name: 'isServerSpan', key: 'span.kind', value: 'server' },
      { fn: isErrorSpan, name: 'isErrorSpan', key: 'error', value: true },
      { fn: isErrorSpan, name: 'isErrorSpan', key: 'error', value: 'true' },
    ];

    spanTypeTestCases.forEach(testCase => {
      const msg = `${testCase.name}() is true only when a ${testCase.key}=${testCase.value} tag is present`;
      it(msg, () => {
        const span = { tags: traceGenerator.tags() };
        expect(testCase.fn(span)).toBe(false);
        span.tags.push(testCase);
        expect(testCase.fn(span)).toBe(true);
      });
    });
  });

  describe('spanContainsErredSpan()', () => {
    it('returns true only when a descendant has an error tag', () => {
      const errorTag = { key: 'error', type: 'bool', value: true };
      const getTags = withError =>
        withError ? traceGenerator.tags().concat(errorTag) : traceGenerator.tags();

      // Using a string to generate the test spans. Each line results in a span. The
      // left number indicates whether or not the generated span has a descendant
      // with an error tag (the expectation). The length of the line indicates the
      // depth of the span (i.e. further right is higher depth). The right number
      // indicates whether or not the span has an error tag.
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
        tags: getTags(+line.slice(-1)),
      }));

      expectations.forEach((target, i) => {
        // include the index in the expect condition to know which span failed
        // (if there is a failure, that is)
        const result = [i, spanContainsErredSpan(spans, i)];
        expect(result).toEqual([i, target]);
      });
    });
  });

  describe('findServerChildSpan()', () => {
    let spans;

    beforeEach(() => {
      spans = [
        { depth: 0, tags: [{ key: 'span.kind', value: 'client' }] },
        { depth: 1, tags: [] },
        { depth: 1, tags: [{ key: 'span.kind', value: 'server' }] },
        { depth: 1, tags: [{ key: 'span.kind', value: 'third-kind' }] },
        { depth: 1, tags: [{ key: 'span.kind', value: 'server' }] },
      ];
    });

    it('returns falsy if the frist span is not a client', () => {
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

  // OTEL-based utility function tests
  describe('OTEL utility functions', () => {
    describe('isErrorOtelSpan()', () => {
      it('returns true when span has ERROR status code', () => {
        const span = {
          status: { code: StatusCode.ERROR },
        };
        expect(isErrorOtelSpan(span)).toBe(true);
      });

      it('returns false when span has OK status code', () => {
        const span = {
          status: { code: StatusCode.OK },
        };
        expect(isErrorOtelSpan(span)).toBe(false);
      });

      it('returns false when span has UNSET status code', () => {
        const span = {
          status: { code: StatusCode.UNSET },
        };
        expect(isErrorOtelSpan(span)).toBe(false);
      });
    });

    describe('otelSpanContainsErredSpan()', () => {
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
          const result = [i, otelSpanContainsErredSpan(spans, i)];
          expect(result).toEqual([i, target]);
        });
      });
    });

    describe('findServerChildOtelSpan()', () => {
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
        expect(findServerChildOtelSpan(spans.slice(1))).toBeFalsy();
      });

      it('returns the first server span', () => {
        const span = findServerChildOtelSpan(spans);
        expect(span).toBe(spans[2]);
      });

      it('bails when a non-child-depth span is encountered', () => {
        spans[1].depth++;
        expect(findServerChildOtelSpan(spans)).toBeFalsy();
        spans[1].depth = spans[0].depth;
        expect(findServerChildOtelSpan(spans)).toBeFalsy();
      });
    });

    describe('isOtelKindClient()', () => {
      it('returns true when span kind is CLIENT', () => {
        const span = { kind: SpanKind.CLIENT };
        expect(isOtelKindClient(span)).toBe(true);
      });

      it('returns false when span kind is not CLIENT', () => {
        const span = { kind: SpanKind.SERVER };
        expect(isOtelKindClient(span)).toBe(false);
      });
    });

    describe('isOtelKindProducer()', () => {
      it('returns true when span kind is PRODUCER', () => {
        const span = { kind: SpanKind.PRODUCER };
        expect(isOtelKindProducer(span)).toBe(true);
      });

      it('returns false when span kind is not PRODUCER', () => {
        const span = { kind: SpanKind.CLIENT };
        expect(isOtelKindProducer(span)).toBe(false);
      });
    });
  });
});
