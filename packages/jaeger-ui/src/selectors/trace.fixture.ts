// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

// See https://github.com/jaegertracing/jaeger-ui/issues/115 for details.

export const followsFromRef = {
  processes: {
    p1: {
      serviceName: 'issue115',
      tags: [],
    },
  },
  spans: [
    {
      duration: 1173,
      flags: 1,
      logs: [],
      operationName: 'thread',
      processID: 'p1',
      references: [
        {
          refType: 'FOLLOWS_FROM',
          spanID: 'ea7cfaca83f0724b',
          traceID: '2992f2a5b5d037a8aabffd08ef384237',
        },
      ],
      spanID: '1bdf4201221bb2ac',
      startTime: 1509533706521220,
      tags: [],
      traceID: '2992f2a5b5d037a8aabffd08ef384237',
      warnings: null,
    },
    {
      duration: 70406,
      flags: 1,
      logs: [],
      operationName: 'demo',
      processID: 'p1',
      references: [],
      spanID: 'ea7cfaca83f0724b',
      startTime: 1509533706470949,
      tags: [],
      traceID: '2992f2a5b5d037a8aabffd08ef384237',
      warnings: null,
    },
  ],
  traceID: '2992f2a5b5d037a8aabffd08ef384237',
  warnings: null,
};
