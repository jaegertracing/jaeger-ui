// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import filterSpans, { matchesExactAttributeTerm, parseExactAttributeTerm } from './filter-spans';
import { makeAttributes } from '../model/attributes';

const makeOtelSpan = (spanID, attrs, resourceAttrs = [], eventAttrs = []) => ({
  spanID,
  name: 'op',
  resource: { serviceName: 'svc', attributes: makeAttributes(resourceAttrs) },
  attributes: makeAttributes(attrs),
  events: [{ attributes: makeAttributes(eventAttrs) }],
});

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

  it('should match spanIDs as exact opaque strings', () => {
    expect(filterSpans('spanID', spans)).toEqual(new Set([]));
    expect(filterSpans(spanID0, spans)).toEqual(new Set([spanID0]));
    expect(filterSpans(spanID2, spans)).toEqual(new Set([spanID2]));
    // Leading zeros produce a different string — no match
    expect(filterSpans(`00${spanID0}`, spans)).toEqual(new Set([]));
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

  describe('object and array attribute values (OTel spans)', () => {
    it('matches text inside an object attribute value', () => {
      const span = makeOtelSpan('obj-span', [
        { key: 'gen_ai.message', value: { role: 'user', content: 'hello world' } },
      ]);
      expect(filterSpans('hello', [span])).toEqual(new Set(['obj-span']));
      expect(filterSpans('user', [span])).toEqual(new Set(['obj-span']));
      expect(filterSpans('notfound', [span])).toEqual(new Set([]));
    });

    it('matches text inside an array attribute value', () => {
      const span = makeOtelSpan('arr-span', [
        { key: 'http.request.header.accept', value: ['application/json', 'text/html'] },
      ]);
      expect(filterSpans('application/json', [span])).toEqual(new Set(['arr-span']));
      expect(filterSpans('text/html', [span])).toEqual(new Set(['arr-span']));
      expect(filterSpans('notfound', [span])).toEqual(new Set([]));
    });

    it('does not confuse object values with "[object Object]"', () => {
      const span = makeOtelSpan('obj-span', [{ key: 'meta', value: { foo: 'bar' } }]);
      expect(filterSpans('[object Object]', [span])).toEqual(new Set([]));
      expect(filterSpans('bar', [span])).toEqual(new Set(['obj-span']));
    });

    it('supports key=value search for object attribute values', () => {
      const span = makeOtelSpan('obj-span', [{ key: 'payload', value: { status: 'ok' } }]);
      expect(filterSpans('payload={"status":"ok"}', [span])).toEqual(new Set(['obj-span']));
    });

    it('does not throw on circular reference values, falls back to String()', () => {
      const circular = {};
      circular.self = circular;
      const span = makeOtelSpan('circ-span', [{ key: 'meta', value: circular }]);
      expect(() => filterSpans('meta', [span])).not.toThrow();
    });
  });
});

describe('parseExactAttributeTerm', () => {
  it.each([
    { term: 'http.status_code==200', expected: { key: 'http.status_code', value: '200' } },
    { term: 'HTTP.Method==Get', expected: { key: 'http.method', value: 'get' } },
    { term: ' db.system == sql server ', expected: { key: 'db.system', value: 'sql server' } },
    { term: 'expr==a==b', expected: { key: 'expr', value: 'a==b' } },
    { term: 'note==', expected: null },
    { term: 'dGVzdA==', expected: null },
    { term: '==200', expected: null },
    { term: 'http.status_code=200', expected: null },
    { term: 'auth', expected: null },
    { term: '', expected: null },
  ])('reads $term as $expected', ({ term, expected }) => {
    expect(parseExactAttributeTerm(term)).toEqual(expected);
  });
});

describe('matchesExactAttributeTerm', () => {
  const exactAttributeTerm = { key: 'http.status_code', value: '200' };

  it.each([
    { name: 'the same key and value', attribute: { key: 'http.status_code', value: '200' }, expected: true },
    {
      name: 'a numeric value with the same text',
      attribute: { key: 'http.status_code', value: 200 },
      expected: true,
    },
    {
      name: 'another case and surrounding spaces',
      attribute: { key: 'HTTP.Status_Code', value: ' 200 ' },
      expected: true,
    },
    { name: 'a longer value', attribute: { key: 'http.status_code', value: '2000' }, expected: false },
    { name: 'a longer key', attribute: { key: 'http.status_code.raw', value: '200' }, expected: false },
    {
      name: 'a key that ends with the key',
      attribute: { key: 'x.http.status_code', value: '200' },
      expected: false,
    },
    { name: 'no value', attribute: { key: 'http.status_code', value: null }, expected: false },
  ])('is $expected for $name', ({ attribute, expected }) => {
    expect(matchesExactAttributeTerm(attribute, exactAttributeTerm)).toBe(expected);
  });
});

describe('filterSpans with a key==value term', () => {
  const spans = [
    makeOtelSpan('status-200', [{ key: 'http.status_code', value: 200 }]),
    makeOtelSpan('status-2000', [{ key: 'http.status_code', value: 2000 }]),
    makeOtelSpan('resource-200', [], [{ key: 'http.status_code', value: '200' }]),
    makeOtelSpan('event-200', [], [], [{ key: 'http.status_code', value: '200' }]),
    makeOtelSpan('model-spaces', [{ key: 'gen_ai.request.model', value: 'model a' }]),
    makeOtelSpan('literal-text', [{ key: 'db.statement', value: 'where http.status_code==2' }]),
  ];

  it('finds the attribute with the whole key and the whole value, where = finds by substring', () => {
    expect(filterSpans('http.status_code=200', spans)).toEqual(
      new Set(['status-200', 'status-2000', 'resource-200', 'event-200'])
    );
    expect(filterSpans('http.status_code==200', spans)).toEqual(
      new Set(['status-200', 'resource-200', 'event-200'])
    );
  });

  it('reads a quoted term with spaces as one exact attribute', () => {
    expect(filterSpans('"gen_ai.request.model==model a"', spans)).toEqual(new Set(['model-spaces']));
    expect(filterSpans('"gen_ai.request.model==model"', spans)).toEqual(new Set());
  });

  it('does not search the term as text, which would find the longer values again', () => {
    expect(filterSpans('http.status_code==2', spans)).toEqual(new Set());
  });

  it('searches text that ends in == as text', () => {
    const paddedSpan = makeOtelSpan('padded', [{ key: 'auth.token', value: 'dGVzdA==' }]);
    expect(filterSpans('dGVzdA==', [...spans, paddedSpan])).toEqual(new Set(['padded']));
  });

  it('searches a term without a key as text', () => {
    expect(filterSpans('==2', spans)).toEqual(new Set(['literal-text']));
  });

  it('leaves out an attribute whose key an exclude term names', () => {
    expect(filterSpans('http.status_code==200 -status_code', spans)).toEqual(new Set());
  });
});
