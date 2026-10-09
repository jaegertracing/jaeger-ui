// Copyright (c) 2020 The Jaeger Authors
// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import {
  _getTracePageHeaderPartsImpl as getTracePageHeaderParts,
  getIncompleteTraceTooltip,
} from './trace-display-helpers';

describe('getTracePageHeaderParts', () => {
  const firstSpanId = 'firstSpanId';
  const secondSpanId = 'secondSpanId';
  const thirdSpanId = 'thirdSpanId';
  const missingSpanId = 'missingSpanId';

  const currentTraceId = 'currentTraceId';

  const serviceName = 'serviceName';
  const operationName = 'operationName';

  const t = 1583758670000;

  // Note: this trace has a loop S1 <- S2 <- S3 <- S1, which is the only way
  // to make the algorithm return an empty string as trace name.
  const spansWithNoRoots = [
    {
      spanID: firstSpanId,
      traceID: currentTraceId,
      startTime: t + 200,
      process: {},
      references: [
        {
          refType: 'CHILD_OF',
          spanID: secondSpanId,
          traceID: currentTraceId,
        },
      ],
    },
    {
      spanID: secondSpanId,
      traceID: currentTraceId,
      startTime: t + 100,
      process: {},
      references: [
        {
          refType: 'CHILD_OF',
          spanID: thirdSpanId,
          traceID: currentTraceId,
        },
      ],
    },
    {
      spanID: thirdSpanId,
      traceID: currentTraceId,
      startTime: t,
      process: {},
      references: [
        {
          refType: 'CHILD_OF',
          spanID: firstSpanId,
          traceID: currentTraceId,
        },
      ],
    },
  ];
  const spansWithMultipleRootsDifferentByStartTime = [
    {
      spanID: firstSpanId,
      traceID: currentTraceId,
      startTime: t + 200,
      process: {},
      references: [
        {
          refType: 'CHILD_OF',
          spanID: thirdSpanId,
          traceID: currentTraceId,
        },
      ],
    },
    {
      spanID: secondSpanId, // may be a root span
      traceID: currentTraceId,
      startTime: t + 100,
      process: {},
      references: [
        {
          refType: 'CHILD_OF',
          spanID: missingSpanId,
          traceID: currentTraceId,
        },
      ],
    },
    {
      spanID: thirdSpanId, // root span (as the earliest)
      traceID: currentTraceId,
      startTime: t,
      operationName,
      process: {
        serviceName,
      },
      references: [
        {
          refType: 'CHILD_OF',
          spanID: missingSpanId,
          traceID: currentTraceId,
        },
      ],
    },
  ];
  const spansWithMultipleRootsWithOneWithoutRefs = [
    {
      spanID: firstSpanId,
      traceID: currentTraceId,
      startTime: t + 200,
      process: {},
      references: [
        {
          refType: 'CHILD_OF',
          spanID: thirdSpanId,
          traceID: currentTraceId,
        },
      ],
    },
    {
      spanID: secondSpanId,
      traceID: currentTraceId,
      startTime: t + 100,
      operationName,
      process: {
        serviceName,
      },
    },
    {
      spanID: thirdSpanId,
      traceID: currentTraceId,
      startTime: t,
      operationName: 'earlier-root',
      process: { serviceName: 'earlier-service' },
      references: [
        {
          refType: 'CHILD_OF',
          spanID: missingSpanId,
          traceID: currentTraceId,
        },
      ],
    },
  ];
  const spansWithOneRootWithRemoteRef = [
    {
      spanID: firstSpanId,
      traceID: currentTraceId,
      startTime: t + 200,
      process: {},
      references: [
        {
          refType: 'CHILD_OF',
          spanID: secondSpanId,
          traceID: currentTraceId,
        },
      ],
    },
    {
      spanID: secondSpanId,
      traceID: currentTraceId,
      startTime: t + 100,
      process: {},
      references: [
        {
          refType: 'CHILD_OF',
          spanID: thirdSpanId,
          traceID: currentTraceId,
        },
      ],
    },
    {
      spanID: thirdSpanId, // effective root span, since its parent is missing
      traceID: currentTraceId,
      startTime: t,
      operationName,
      process: {
        serviceName,
      },
      references: [
        {
          refType: 'CHILD_OF',
          spanID: missingSpanId,
          traceID: currentTraceId,
        },
      ],
    },
  ];
  const spansWithOneRootWithNoRefs = [
    {
      spanID: firstSpanId,
      traceID: currentTraceId,
      startTime: t + 200,
      process: {},
      references: [
        {
          refType: 'CHILD_OF',
          spanID: thirdSpanId,
          traceID: currentTraceId,
        },
      ],
    },
    {
      spanID: secondSpanId, // root span
      traceID: currentTraceId,
      startTime: t + 100,
      operationName,
      process: {
        serviceName,
      },
    },
    {
      spanID: thirdSpanId,
      traceID: currentTraceId,
      startTime: t,
      process: {},
      references: [
        {
          refType: 'CHILD_OF',
          spanID: secondSpanId,
          traceID: currentTraceId,
        },
      ],
    },
  ];

  const fullTracePageHeaderParts = { serviceName, operationName };

  it('returns an empty string if given spans with no root among them', () => {
    expect(getTracePageHeaderParts(spansWithNoRoots)).toEqual(null);
  });

  it('returns an id of root span with the earliest startTime', () => {
    expect(getTracePageHeaderParts(spansWithMultipleRootsDifferentByStartTime)).toEqual(
      fullTracePageHeaderParts
    );
  });

  it('chooses the earliest root even when a later root has no references', () => {
    const expected = { serviceName: 'earlier-service', operationName: 'earlier-root' };
    expect(getTracePageHeaderParts(spansWithMultipleRootsWithOneWithoutRefs)).toEqual(expected);
    expect(getTracePageHeaderParts([...spansWithMultipleRootsWithOneWithoutRefs].reverse())).toEqual(
      expected
    );
  });

  it('returns an id of root span with remote ref', () => {
    expect(getTracePageHeaderParts(spansWithOneRootWithRemoteRef)).toEqual(fullTracePageHeaderParts);
  });

  it('returns an id of root span with no refs', () => {
    expect(getTracePageHeaderParts(spansWithOneRootWithNoRefs)).toEqual(fullTracePageHeaderParts);
  });
});

describe('getIncompleteTraceTooltip', () => {
  it('uses singular noun and verb for count of 1', () => {
    const result = getIncompleteTraceTooltip(1);
    expect(result).toContain('1 span has missing parent span.');
  });

  it('uses plural noun and verb for count > 1', () => {
    const result = getIncompleteTraceTooltip(3);
    expect(result).toContain('3 spans have missing parent spans.');
  });

  it('includes the reload suggestion', () => {
    const result = getIncompleteTraceTooltip(1);
    expect(result).toContain('opening or reloading the trace');
  });
});
