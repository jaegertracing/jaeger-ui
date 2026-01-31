// Copyright (c) 2020 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import { _getTracePageHeaderPartsImpl as getTracePageHeaderParts } from './trace-viewer';

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
          spanID: thirdSpanId,
          traceID: currentTraceId,
        },
      ],
    },
    {
      spanID: secondSpanId, // root span (as a span without any refs)
      traceID: currentTraceId,
      startTime: t + 100,
      operationName,
      process: {
        serviceName,
      },
    },
    {
      spanID: thirdSpanId, // may be a root span
      traceID: currentTraceId,
      startTime: t,
      process: {},
      references: [
        {
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

  it('returns an id of root span without any refs', () => {
    expect(getTracePageHeaderParts(spansWithMultipleRootsWithOneWithoutRefs)).toEqual(
      fullTracePageHeaderParts
    );
  });

  it('returns an id of root span with remote ref', () => {
    expect(getTracePageHeaderParts(spansWithOneRootWithRemoteRef)).toEqual(fullTracePageHeaderParts);
  });

  it('returns an id of root span with no refs', () => {
    expect(getTracePageHeaderParts(spansWithOneRootWithNoRefs)).toEqual(fullTracePageHeaderParts);
  });
});
