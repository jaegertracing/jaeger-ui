// Copyright (c) 2018 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { getTraceName } from './trace-viewer';

describe('getTraceName', () => {
  const firstSpanId = 'firstSpanId';
  const secondSpanId = 'secondSpanId';
  const thirdSpanId = 'thirdSpanId';
  const remoteSpanId = 'remoteSpanId';

  const serviceName = 'serviceName';
  const operationName = 'operationName';

  const spansWithNoRoots = [
    {
      spanID: firstSpanId,
      startTime: 1583758690000,
      references: [
        {
          spanID: secondSpanId,
          refType: 'CHILD_OF',
        },
      ],
    },
    {
      spanID: secondSpanId,
      startTime: 1583758680000,
      references: [
        {
          spanID: thirdSpanId,
          refType: 'CHILD_OF',
        },
      ],
    },
    {
      spanID: thirdSpanId,
      startTime: 1583758670000,
      references: [
        {
          spanID: firstSpanId,
          refType: 'CHILD_OF',
        },
      ],
    },
  ];
  const spansWithMultipleRoots = [
    {
      spanID: firstSpanId,
      startTime: 1583758690000,
      references: [
        {
          spanID: thirdSpanId,
          refType: 'CHILD_OF',
        },
      ],
    },
    {
      spanID: secondSpanId, // root span
      startTime: 1583758680000,
    },
    {
      spanID: thirdSpanId, // root span
      startTime: 1583758670000,
      operationName,
      process: {
        serviceName,
      },
      references: [
        {
          spanID: remoteSpanId,
          refType: 'CHILD_OF',
        },
      ],
    },
  ];
  const spansWithOneRootWithRemoteRef = [
    {
      spanID: firstSpanId,
      startTime: 1583758690000,
      references: [
        {
          spanID: secondSpanId,
          refType: 'CHILD_OF',
        },
      ],
    },
    {
      spanID: secondSpanId,
      startTime: 1583758680000,
      references: [
        {
          spanID: thirdSpanId,
          refType: 'CHILD_OF',
        },
      ],
    },
    {
      spanID: thirdSpanId, // root span
      startTime: 1583758670000,
      operationName,
      process: {
        serviceName,
      },
      references: [
        {
          spanID: remoteSpanId,
          refType: 'CHILD_OF',
        },
      ],
    },
  ];
  const spansWithOneRootWithNoRefs = [
    {
      spanID: firstSpanId,
      startTime: 1583758690000,
      references: [
        {
          spanID: thirdSpanId,
          refType: 'CHILD_OF',
        },
      ],
    },
    {
      spanID: secondSpanId, // root span
      startTime: 1583758680000,
      operationName,
      process: {
        serviceName,
      },
    },
    {
      spanID: thirdSpanId,
      startTime: 1583758670000,
      references: [
        {
          spanID: secondSpanId,
          refType: 'CHILD_OF',
        },
      ],
    },
  ];

  const fullTraceName = `${serviceName}: ${operationName}`;

  it('returns an empty string if given spans with no root among them', () => {
    expect(getTraceName(spansWithNoRoots)).toEqual('');
  });

  it('returns an id of root span with the earliest startTime', () => {
    expect(getTraceName(spansWithMultipleRoots)).toEqual(fullTraceName);
  });

  it('returns an id of root span with remote ref', () => {
    expect(getTraceName(spansWithOneRootWithRemoteRef)).toEqual(fullTraceName);
  });

  it('returns an id of root span with no refs', () => {
    expect(getTraceName(spansWithOneRootWithNoRefs)).toEqual(fullTraceName);
  });
});
