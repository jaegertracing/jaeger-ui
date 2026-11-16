// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import test1 from '../testCases/test1';
import test2 from '../testCases/test2';
import findLastFinishingChildSpanId from './findLastFinishingChildSpan';
import sanitizeOverFlowingChildren from './sanitizeOverFlowingChildren';
import { createCPSpanMap } from './cpspan';

describe('findLastFinishingChildSpanId', () => {
  it('Should find lfc of a span correctly', () => {
    const spanMap = createCPSpanMap(test1.trace.rootSpans[0]);
    const sanitizedSpanMap = sanitizeOverFlowingChildren(spanMap);

    const currentSpan = sanitizedSpanMap.get('span-C');
    let lastFinishingChildSpan = findLastFinishingChildSpanId(sanitizedSpanMap)(currentSpan);
    expect(lastFinishingChildSpan).toStrictEqual(sanitizedSpanMap.get('span-E'));

    // Second Case to check if it works with spawn time or not
    lastFinishingChildSpan = findLastFinishingChildSpanId(sanitizedSpanMap)(currentSpan, 50);
    expect(lastFinishingChildSpan).toStrictEqual(sanitizedSpanMap.get('span-D'));
  });

  it('Should find lfc of a span correctly with test2', () => {
    const spanMap = createCPSpanMap(test2.trace.rootSpans[0]);
    const sanitizedSpanMap = sanitizeOverFlowingChildren(spanMap);

    const currentSpan = sanitizedSpanMap.get('span-X');
    let lastFinishingChildSpanId = findLastFinishingChildSpanId(sanitizedSpanMap)(currentSpan);
    expect(lastFinishingChildSpanId).toStrictEqual(sanitizedSpanMap.get('span-C'));

    // Second Case to check if it works with spawn time or not
    lastFinishingChildSpanId = findLastFinishingChildSpanId(sanitizedSpanMap)(currentSpan, 20);
    expect(lastFinishingChildSpanId).toBeUndefined();
  });

  it('Should return each child once for decreasing start times and keep the earlier child on equal end times', () => {
    const makeSpan = (spanID, startTime, endTime) => ({
      spanID,
      parentSpanID: 'span-P',
      isBlocking: true,
      startTime,
      endTime,
      duration: endTime - startTime,
      childSpanIDs: [],
    });
    const parentSpan = {
      ...makeSpan('span-P', 0, 100),
      parentSpanID: undefined,
      childSpanIDs: ['span-A', 'span-B', 'span-missing', 'span-C', 'span-D'],
    };
    const spanMap = new Map([
      ['span-P', parentSpan],
      ['span-A', makeSpan('span-A', 10, 20)],
      ['span-B', makeSpan('span-B', 30, 50)],
      ['span-C', makeSpan('span-C', 40, 50)],
      ['span-D', makeSpan('span-D', 60, 70)],
    ]);
    const findLastFinishingChildSpan = findLastFinishingChildSpanId(spanMap);

    expect(findLastFinishingChildSpan(parentSpan)).toBe(spanMap.get('span-D'));
    expect(findLastFinishingChildSpan(parentSpan, 60)).toBe(spanMap.get('span-B'));
    expect(findLastFinishingChildSpan(parentSpan, 30)).toBe(spanMap.get('span-A'));
    expect(findLastFinishingChildSpan(parentSpan, 10)).toBeUndefined();
  });

  it('Should never pick a child whose end time is NaN or negative', () => {
    const makeSpan = (spanID, startTime, endTime) => ({
      spanID,
      parentSpanID: 'span-P',
      isBlocking: true,
      startTime,
      endTime,
      duration: endTime - startTime,
      childSpanIDs: [],
    });
    const parentSpan = {
      ...makeSpan('span-P', 0, 100),
      parentSpanID: undefined,
      childSpanIDs: ['span-N', 'span-A', 'span-Z', 'span-B'],
    };
    const spanMap = new Map([
      ['span-P', parentSpan],
      ['span-N', makeSpan('span-N', 30, NaN)],
      ['span-A', makeSpan('span-A', 10, 50)],
      ['span-Z', makeSpan('span-Z', -10, -5)],
      ['span-B', makeSpan('span-B', 60, 70)],
    ]);
    const findLastFinishingChildSpan = findLastFinishingChildSpanId(spanMap);

    expect(findLastFinishingChildSpan(parentSpan)).toBe(spanMap.get('span-B'));
    expect(findLastFinishingChildSpan(parentSpan, 60)).toBe(spanMap.get('span-A'));
    expect(findLastFinishingChildSpan(parentSpan, 10)).toBeUndefined();
  });

  it('Should skip a child that ends at the returning child start time', () => {
    const spanMap = createCPSpanMap(test1.trace.rootSpans[0]);
    const sanitizedSpanMap = sanitizeOverFlowingChildren(spanMap);
    const currentSpan = sanitizedSpanMap.get('span-C');

    expect(findLastFinishingChildSpanId(sanitizedSpanMap)(currentSpan, 60)).toStrictEqual(
      sanitizedSpanMap.get('span-D')
    );
  });

  it('Should not return the same child twice', () => {
    const spanMap = createCPSpanMap(test1.trace.rootSpans[0]);
    const sanitizedSpanMap = sanitizeOverFlowingChildren(spanMap);
    const currentSpan = sanitizedSpanMap.get('span-C');
    const findLastFinishingChildSpan = findLastFinishingChildSpanId(sanitizedSpanMap);

    expect(findLastFinishingChildSpan(currentSpan)).toStrictEqual(sanitizedSpanMap.get('span-E'));
    expect(findLastFinishingChildSpan(currentSpan)).toStrictEqual(sanitizedSpanMap.get('span-D'));
    expect(findLastFinishingChildSpan(currentSpan)).toBeUndefined();
  });
});
