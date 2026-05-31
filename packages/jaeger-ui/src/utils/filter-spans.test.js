// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import filterSpans from './filter-spans';

describe('filterSpans', () => {
  // span0 contains strings that end in 0 or 1
  const spanID0 = 'span-id-0';
  const span0 = {
    spanID: spanID0,
    operationName: 'operationName0',
    process: {
      serviceName: 'serviceName0',
      tags: [
        {
          key: 'processTagKey0',
          value: 'processTagValue0',
        },
        {
          key: 'processTagKey1',
          value: 'processTagValue1',
        },
        {
          key: 'processTagKey3',
          value: 'processTagValue3',
        },
      ],
    },
    tags: [
      {
        key: 'tagKey0',
        value: 'tagValue0',
      },
      {
        key: 'tagKey1',
        value: 'tagValue1',
      },
      {
        key: 'tagKey3',
        value: 'tagValue3',
      },
    ],
    logs: [
      {
        fields: [
          {
            key: 'logFieldKey0',
            value: 'logFieldValue0',
          },
          {
            key: 'logFieldKey1',
            value: 'logFieldValue1',
          },
        ],
      },
    ],
  };
  // span2 contains strings that end in 1 or 2, for overlap with span0
  // KVs in span2 have different numbers for key and value to facilitate excludesKey testing
  const spanID2 = 'span-id-2';
  const span2 = {
    spanID: spanID2,
    operationName: 'operationName2',
    process: {
      serviceName: 'serviceName2',
      tags: [
        {
          key: 'processTagKey2',
          value: 'processTagValue1',
        },
        {
          key: 'processTagKey1',
          value: 'processTagValue2',
        },
        {
          key: 'processTagKey3',
          value: 'processTag Value3',
        },
      ],
    },
    tags: [
      {
        key: 'tagKey2',
        value: 'tagValue1',
      },
      {
        key: 'tagKey1',
        value: 'tagValue2',
      },
      {
        key: 'tagKey3',
        value: 'tag Value3',
      },
    ],
    logs: [
      {
        fields: [
          {
            key: 'logFieldKey2',
            value: 'logFieldValue1',
          },
          {
            key: 'logFieldKey1',
            value: 'logFieldValue2',
          },
        ],
      },
    ],
  };

  // span3 contain empty logs
  const spanID3 = 'span-id-3';
  const span3 = {
    spanID: spanID3,
    operationName: 'operationName3',
    process: {
      serviceName: 'serviceName3',
    },
  };
  const spans = [span0, span2];

  it('should return `null` if spans is falsy', () => {
    expect(filterSpans('operationName', null)).toBe(null);
  });

  it('should return spans whose spanID exactly match a filter', () => {
    expect(filterSpans('spanID', spans)).toEqual(new Set([]));
    expect(filterSpans(spanID0, spans)).toEqual(new Set([spanID0]));
    expect(filterSpans(spanID2, spans)).toEqual(new Set([spanID2]));
  });

  it('should find a span with leading zeros by typing only its significant digits', () => {
    // Span IDs from the backend keep their leading zeros (opaque blobs).
    // The filter is padded to the span's length so users can type just the significant
    // hex digits and still get a match.
    const spanWithZeros0 = { ...span0, spanID: `00${spanID0}` };
    const spanWithZeros2 = { ...span2, spanID: `00${spanID2}` };
    const spansWithZeros = [spanWithZeros0, spanWithZeros2];

    expect(filterSpans(spanID0, spansWithZeros)).toEqual(new Set([`00${spanID0}`]));
    expect(filterSpans(spanID2, spansWithZeros)).toEqual(new Set([`00${spanID2}`]));
    // Typing the full padded ID also works
    expect(filterSpans(`00${spanID0}`, spansWithZeros)).toEqual(new Set([`00${spanID0}`]));
  });

  it('should find an IOtelSpan with leading zeros by typing only its significant digits', () => {
    const fullSpanID = '00abc123def456';
    const otelSpan = {
      spanID: fullSpanID,
      name: 'otelOperation',
      resource: { serviceName: 'otelService', attributes: [] },
      attributes: [],
      events: [],
    };
    // Short filter padded to the span's length matches
    expect(filterSpans('abc123def456', [otelSpan])).toEqual(new Set([fullSpanID]));
    // Full form also matches
    expect(filterSpans(fullSpanID, [otelSpan])).toEqual(new Set([fullSpanID]));
  });

  it('should return spans whose operationName match a filter', () => {
    expect(filterSpans('operationName', spans)).toEqual(new Set([spanID0, spanID2]));
    expect(filterSpans('operationName0', spans)).toEqual(new Set([spanID0]));
    expect(filterSpans('operationName2', spans)).toEqual(new Set([spanID2]));
  });

  it('should return spans whose serviceName match a filter', () => {
    expect(filterSpans('serviceName', spans)).toEqual(new Set([spanID0, spanID2]));
    expect(filterSpans('serviceName0', spans)).toEqual(new Set([spanID0]));
    expect(filterSpans('serviceName2', spans)).toEqual(new Set([spanID2]));
  });

  it("should return spans whose tags' kv.key match a filter", () => {
    expect(filterSpans('tagKey1', spans)).toEqual(new Set([spanID0, spanID2]));
    expect(filterSpans('tagKey0', spans)).toEqual(new Set([spanID0]));
    expect(filterSpans('tagKey2', spans)).toEqual(new Set([spanID2]));
  });

  it("should return spans whose tags' kv.value match a filter", () => {
    expect(filterSpans('tagValue1', spans)).toEqual(new Set([spanID0, spanID2]));
    expect(filterSpans('tagValue0', spans)).toEqual(new Set([spanID0]));
    expect(filterSpans('tagValue2', spans)).toEqual(new Set([spanID2]));
    expect(filterSpans('"tag Value3"', spans)).toEqual(new Set([spanID2]));
  });

  it("should return spans whose tags' kv.key=kv.value match a filter", () => {
    expect(filterSpans('tagKey1=tagValue1', spans)).toEqual(new Set([spanID0]));
    expect(filterSpans('tagKey0=tagValue0', spans)).toEqual(new Set([spanID0]));
    expect(filterSpans('tagKey2=tagValue1', spans)).toEqual(new Set([spanID2]));
  });

  it("should exclude span whose tags' kv.value or kv.key match a filter if the key matches an excludeKey", () => {
    expect(filterSpans('tagValue1 -tagKey2', spans)).toEqual(new Set([spanID0]));
    expect(filterSpans('tagValue1 -tagKey1', spans)).toEqual(new Set([spanID2]));
    expect(filterSpans('"tag Value3" -tagKey3', spans)).toEqual(new Set());
  });

  it('should return spans whose logs have a field whose kv.key match a filter', () => {
    expect(filterSpans('logFieldKey1', spans)).toEqual(new Set([spanID0, spanID2]));
    expect(filterSpans('logFieldKey0', spans)).toEqual(new Set([spanID0]));
    expect(filterSpans('logFieldKey2', spans)).toEqual(new Set([spanID2]));
  });

  it('should return spans whose logs have a field whose kv.value match a filter', () => {
    expect(filterSpans('logFieldValue1', spans)).toEqual(new Set([spanID0, spanID2]));
    expect(filterSpans('logFieldValue0', spans)).toEqual(new Set([spanID0]));
    expect(filterSpans('logFieldValue2', spans)).toEqual(new Set([spanID2]));
  });

  it('should return spans whose logs have a field whose kv.key=kv.value match a filter', () => {
    expect(filterSpans('logFieldKey1=logFieldValue1', spans)).toEqual(new Set([spanID0]));
    expect(filterSpans('logFieldKey0=logFieldValue0', spans)).toEqual(new Set([spanID0]));
    expect(filterSpans('logFieldKey2=logFieldValue1', spans)).toEqual(new Set([spanID2]));
  });

  it('should exclude span whose logs have a field whose kv.value or kv.key match a filter if the key matches an excludeKey', () => {
    expect(filterSpans('logFieldValue1 -logFieldKey2', spans)).toEqual(new Set([spanID0]));
    expect(filterSpans('logFieldValue1 -logFieldKey1', spans)).toEqual(new Set([spanID2]));
  });

  it("should return spans whose process.tags' kv.key match a filter", () => {
    expect(filterSpans('processTagKey1', spans)).toEqual(new Set([spanID0, spanID2]));
    expect(filterSpans('processTagKey0', spans)).toEqual(new Set([spanID0]));
    expect(filterSpans('processTagKey2', spans)).toEqual(new Set([spanID2]));
  });

  it('should return no spans when logs is null', () => {
    const nullSpan = { ...span0, logs: null };
    expect(filterSpans('logFieldKey1', [nullSpan])).toEqual(new Set([]));
  });

  it("should return spans whose process.processTags' kv.value match a filter", () => {
    expect(filterSpans('processTagValue1', spans)).toEqual(new Set([spanID0, spanID2]));
    expect(filterSpans('processTagValue0', spans)).toEqual(new Set([spanID0]));
    expect(filterSpans('processTagValue2', spans)).toEqual(new Set([spanID2]));
    expect(filterSpans('"processTag Value3"', spans)).toEqual(new Set([spanID2]));
  });

  it("should return spans whose process.processTags' kv.key=kv.value match a filter", () => {
    expect(filterSpans('processTagKey1=processTagValue1', spans)).toEqual(new Set([spanID0]));
    expect(filterSpans('processTagKey0=processTagValue0', spans)).toEqual(new Set([spanID0]));
    expect(filterSpans('processTagKey2=processTagValue1', spans)).toEqual(new Set([spanID2]));
  });

  it("should exclude span whose process.processTags' kv.value or kv.key match a filter if the key matches an excludeKey", () => {
    expect(filterSpans('processTagValue1 -processTagKey2', spans)).toEqual(new Set([spanID0]));
    expect(filterSpans('processTagValue1 -processTagKey1', spans)).toEqual(new Set([spanID2]));
    expect(filterSpans('"processTag Value3" -processTagKey3', spans)).toEqual(new Set());
  });

  it("span without log shouldn't break filtering", () => {
    expect(filterSpans('operationName2', [span2, span3])).toEqual(new Set([spanID2]));
  });

  // This test may false positive if other tests are failing
  it('should return an empty set if no spans match the filter', () => {
    expect(filterSpans('-processTagKey1', spans)).toEqual(new Set());
  });
});
