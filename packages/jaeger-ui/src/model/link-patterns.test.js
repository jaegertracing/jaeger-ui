// Copyright (c) 2017 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import {
  processTemplate,
  createTestFunction,
  getParameterInAncestor,
  getParameterInTrace,
  getParameterInSpanIntrinsic,
  getParameterInResource,
  getParameterInSpan,
  getParameterInParent,
  getParameterInAncestors,
  resolveParameter,
  processLinkPattern,
  computeLinks,
  createGetLinks,
  computeTraceLink,
  getTraceLinks,
} from './link-patterns';
import { makeAttributes } from './attributes';

// Wraps a partial span fixture's attribute arrays into IAttributes in place,
// mirroring how real spans store attributes.
function wrapSpanAttrs(span) {
  if (Array.isArray(span.attributes)) span.attributes = makeAttributes(span.attributes);
  if (span.resource && Array.isArray(span.resource.attributes)) {
    span.resource.attributes = makeAttributes(span.resource.attributes);
  }
  if (Array.isArray(span.events)) {
    span.events.forEach(event => {
      if (Array.isArray(event.attributes)) event.attributes = makeAttributes(event.attributes);
    });
  }
  return span;
}

describe('processTemplate()', () => {
  it('correctly replaces variables', () => {
    const processedTemplate = processTemplate(
      'this is a test with #{oneVariable}#{anotherVariable} and the same #{oneVariable}',
      a => a
    );
    expect(processedTemplate.parameters).toEqual(['oneVariable', 'anotherVariable']);
    expect(processedTemplate.template({ oneVariable: 'MYFIRSTVAR', anotherVariable: 'SECOND' })).toBe(
      'this is a test with MYFIRSTVARSECOND and the same MYFIRSTVAR'
    );
  });

  it('correctly uses the encoding function', () => {
    const processedTemplate = processTemplate(
      'this is a test with #{oneVariable}#{anotherVariable} and the same #{oneVariable}',
      e => `/${e}\\`
    );
    expect(processedTemplate.parameters).toEqual(['oneVariable', 'anotherVariable']);
    expect(processedTemplate.template({ oneVariable: 'MYFIRSTVAR', anotherVariable: 'SECOND' })).toBe(
      'this is a test with /MYFIRSTVAR\\/SECOND\\ and the same /MYFIRSTVAR\\'
    );
  });

  it('correctly returns the same object when passing an already processed template', () => {
    const alreadyProcessed = {
      parameters: ['b'],
      template: data => `a${data.b}c`,
    };
    const processedTemplate = processTemplate(alreadyProcessed, a => a);
    expect(processedTemplate).toBe(alreadyProcessed);
  });

  it('reports an error when passing an object that does not look like an already processed template', () => {
    expect(() =>
      processTemplate(
        {
          template: data => `a${data.b}c`,
        },
        a => a
      )
    ).toThrow('Invalid template');
    expect(() =>
      processTemplate(
        {
          parameters: ['b'],
        },
        a => a
      )
    ).toThrow('Invalid template');
    expect(() => processTemplate({}, a => a)).toThrow('Invalid template');
  });
});

describe('createTestFunction()', () => {
  it('accepts a string', () => {
    const testFn = createTestFunction('myValue');
    expect(testFn('myValue')).toBe(true);
    expect(testFn('myFirstValue')).toBe(false);
    expect(testFn('mySecondValue')).toBe(false);
    expect(testFn('otherValue')).toBe(false);
  });

  it('accepts an array', () => {
    const testFn = createTestFunction(['myFirstValue', 'mySecondValue']);
    expect(testFn('myValue')).toBe(false);
    expect(testFn('myFirstValue')).toBe(true);
    expect(testFn('mySecondValue')).toBe(true);
    expect(testFn('otherValue')).toBe(false);
  });

  it('accepts a regular expression', () => {
    const testFn = createTestFunction(/^my.*Value$/);
    expect(testFn('myValue')).toBe(true);
    expect(testFn('myFirstValue')).toBe(true);
    expect(testFn('mySecondValue')).toBe(true);
    expect(testFn('otherValue')).toBe(false);
  });

  it('accepts a function', () => {
    const mockCallback = jest.fn();
    mockCallback
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValue(false);
    const testFn = createTestFunction(mockCallback);
    expect(testFn('myValue')).toBe(true);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith('myValue');
    expect(testFn('myFirstValue')).toBe(false);
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenCalledWith('myFirstValue');
    expect(testFn('mySecondValue')).toBe(true);
    expect(mockCallback).toHaveBeenCalledTimes(3);
    expect(mockCallback).toHaveBeenCalledWith('mySecondValue');
    expect(testFn('otherValue')).toBe(false);
    expect(mockCallback).toHaveBeenCalledTimes(4);
    expect(mockCallback).toHaveBeenCalledWith('otherValue');
  });

  it('accepts undefined', () => {
    const testFn = createTestFunction();
    expect(testFn('myValue')).toBe(true);
    expect(testFn('myFirstValue')).toBe(true);
    expect(testFn('mySecondValue')).toBe(true);
    expect(testFn('otherValue')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(() => createTestFunction({})).toThrow(/Invalid value/);
    expect(() => createTestFunction(true)).toThrow(/Invalid value/);
    expect(() => createTestFunction(false)).toThrow(/Invalid value/);
    expect(() => createTestFunction(0)).toThrow(/Invalid value/);
    expect(() => createTestFunction(5)).toThrow(/Invalid value/);
  });
});

describe('getParameterInAncestor()', () => {
  const spans = [
    {
      depth: 0,
      resource: {
        attributes: [
          { key: 'a', value: 'a7' },
          { key: 'b', value: 'b7' },
          { key: 'c', value: 'c7' },
          { key: 'd', value: 'd7' },
          { key: 'e', value: 'e7' },
          { key: 'f', value: 'f7' },
          { key: 'g', value: 'g7' },
          { key: 'h', value: 'h7' },
        ],
      },
      attributes: [
        { key: 'a', value: 'a6' },
        { key: 'b', value: 'b6' },
        { key: 'c', value: 'c6' },
        { key: 'd', value: 'd6' },
        { key: 'e', value: 'e6' },
        { key: 'f', value: 'f6' },
        { key: 'g', value: 'g6' },
      ],
    },
    {
      depth: 1,
      resource: {
        attributes: [
          { key: 'a', value: 'a5' },
          { key: 'b', value: 'b5' },
          { key: 'c', value: 'c5' },
          { key: 'd', value: 'd5' },
          { key: 'e', value: 'e5' },
          { key: 'f', value: 'f5' },
        ],
      },
      attributes: [
        { key: 'a', value: 'a4' },
        { key: 'b', value: 'b4' },
        { key: 'c', value: 'c4' },
        { key: 'd', value: 'd4' },
        { key: 'e', value: 'e4' },
      ],
    },
    {
      depth: 1,
      resource: {
        attributes: [
          { key: 'a', value: 'a3' },
          { key: 'b', value: 'b3' },
          { key: 'c', value: 'c3' },
          { key: 'd', value: 'd3' },
        ],
      },
      attributes: [
        { key: 'a', value: 'a2' },
        { key: 'b', value: 'b2' },
        { key: 'c', value: 'c2' },
      ],
    },
    {
      depth: 2,
      resource: {
        attributes: [
          { key: 'a', value: 'a1' },
          { key: 'b', value: 'b1' },
        ],
      },
      attributes: [{ key: 'a', value: 'a0' }],
    },
  ];
  spans[1].parentSpan = spans[0];
  spans[2].parentSpan = spans[0];
  spans[3].parentSpan = spans[2];
  spans.forEach(wrapSpanAttrs);

  it('uses current span attributes', () => {
    expect(getParameterInAncestor('a', spans[3])).toEqual({ key: 'a', value: 'a0' });
    expect(getParameterInAncestor('a', spans[2])).toEqual({ key: 'a', value: 'a2' });
    expect(getParameterInAncestor('a', spans[1])).toEqual({ key: 'a', value: 'a4' });
    expect(getParameterInAncestor('a', spans[0])).toEqual({ key: 'a', value: 'a6' });
  });

  it('uses current span resource attributes', () => {
    expect(getParameterInAncestor('b', spans[3])).toEqual({ key: 'b', value: 'b1' });
    expect(getParameterInAncestor('d', spans[2])).toEqual({ key: 'd', value: 'd3' });
    expect(getParameterInAncestor('f', spans[1])).toEqual({ key: 'f', value: 'f5' });
    expect(getParameterInAncestor('h', spans[0])).toEqual({ key: 'h', value: 'h7' });
  });

  it('uses parent span attributes', () => {
    expect(getParameterInAncestor('c', spans[3])).toEqual({ key: 'c', value: 'c2' });
    expect(getParameterInAncestor('e', spans[2])).toEqual({ key: 'e', value: 'e6' });
    expect(getParameterInAncestor('f', spans[2])).toEqual({ key: 'f', value: 'f6' });
    expect(getParameterInAncestor('g', spans[2])).toEqual({ key: 'g', value: 'g6' });
    expect(getParameterInAncestor('g', spans[1])).toEqual({ key: 'g', value: 'g6' });
  });

  it('uses parent span resource attributes', () => {
    expect(getParameterInAncestor('d', spans[3])).toEqual({ key: 'd', value: 'd3' });
    expect(getParameterInAncestor('h', spans[2])).toEqual({ key: 'h', value: 'h7' });
    expect(getParameterInAncestor('h', spans[1])).toEqual({ key: 'h', value: 'h7' });
  });

  it('uses grand-parent span attributes', () => {
    expect(getParameterInAncestor('e', spans[3])).toEqual({ key: 'e', value: 'e6' });
    expect(getParameterInAncestor('f', spans[3])).toEqual({ key: 'f', value: 'f6' });
    expect(getParameterInAncestor('g', spans[3])).toEqual({ key: 'g', value: 'g6' });
  });

  it('uses grand-parent resource attributes', () => {
    expect(getParameterInAncestor('h', spans[3])).toEqual({ key: 'h', value: 'h7' });
  });

  it('returns undefined when the entry cannot be found', () => {
    expect(getParameterInAncestor('i', spans[3])).toBeUndefined();
  });

  it('does not break if some attributes are not defined', () => {
    const spansWithUndefinedAttrs = [
      {
        depth: 0,
        resource: {},
      },
    ];
    expect(getParameterInAncestor('a', spansWithUndefinedAttrs[0])).toBeUndefined();
  });
});

describe('getParameterInTrace()', () => {
  const trace = {
    resource: { attributes: [] },
    traceName: 'theTrace',
    traceID: 'trc1',
    spans: [],
    startTime: 1000,
    endTime: 3000,
    duration: 2000,
    services: [],
  };

  it('returns an entry that is present', () => {
    expect(getParameterInTrace('startTime', trace)).toEqual({
      key: 'startTime',
      value: trace.startTime,
    });
  });

  it('returns undefined when the entry cannot be found', () => {
    expect(getParameterInTrace('someThingElse', trace)).toBeUndefined();
  });
});

describe('computeTraceLink()', () => {
  const linkPatterns = [
    {
      type: 'traces',
      url: 'http://example.com/?traceID=#{traceID}',
      text: 'first link (#{traceID})',
    },
    {
      type: 'traces',
      url: 'http://example.com/?traceID#{traceID}&myKey=#{myKey}',
      text: 'second link will not render because myKey is not in the trace',
    },
    {
      type: 'traces',
      url: 'http://example.com/?traceID=#{traceID}&traceName=#{traceName}&startTime=#{startTime}&endTime=#{endTime}&duration=#{duration}',
      text: 'third link (#{traceID}, #{traceName}, #{startTime}, #{endTime}, #{duration})',
    },
    {
      type: 'traces',
      url: 'http://example.com/?startTime=#{startTime | epoch_micros_to_date_iso}&endTime=#{endTime | epoch_micros_to_date_iso}',
      text: 'third link (#{startTime | epoch_micros_to_date_iso}, #{endTime | epoch_micros_to_date_iso})',
    },
  ].map(processLinkPattern);

  const trace = {
    resource: { attributes: [] },
    traceName: 'theTrace',
    traceID: 'trc1',
    spans: [],
    startTime: 1000,
    endTime: 3000000000000,
    duration: 2000,
    services: [],
  };

  it('correctly computes trace scoped links', () => {
    expect(computeTraceLink(linkPatterns, trace)).toEqual([
      {
        url: 'http://example.com/?traceID=trc1',
        text: 'first link (trc1)',
      },
      {
        url: 'http://example.com/?traceID=trc1&traceName=theTrace&startTime=1000&endTime=3000000000000&duration=2000',
        text: 'third link (trc1, theTrace, 1000, 3000000000000, 2000)',
      },
      {
        text: 'third link (1970-01-01T00:00:00.001Z, 1970-02-04T17:20:00.000Z)',
        url: 'http://example.com/?startTime=1970-01-01T00%3A00%3A00.001Z&endTime=1970-02-04T17%3A20%3A00.000Z',
      },
    ]);
  });
});

describe('computeLinks()', () => {
  const linkPatterns = [
    {
      type: 'attributes',
      key: 'myKey',
      url: 'http://example.com/?myKey=#{myKey}',
      text: 'first link (#{myKey})',
    },
    {
      key: 'myOtherKey',
      url: 'http://example.com/?myKey=#{myOtherKey}&myKey=#{myKey}',
      text: 'second link (#{myOtherKey})',
    },
    {
      type: 'events',
      key: 'myThirdKey',
      url: 'http://example.com/?myKey1=#{myKey}&myKey=#{myThirdKey}&traceID=#{trace.traceID}&startTime=#{trace.startTime}',
      text: 'third link (#{myThirdKey}) for traceID - #{trace.traceID}',
    },
  ].map(processLinkPattern);

  const spans = [
    { depth: 0, resource: {}, attributes: [{ key: 'myKey', value: 'valueOfMyKey' }] },
    {
      depth: 1,
      resource: {},
      events: [
        {
          attributes: [
            { key: 'myOtherKey', value: 'valueOfMy+Other+Key' },
            { key: 'myThirdKey', value: 'valueOfThirdMyKey' },
          ],
        },
      ],
    },
  ];
  spans[1].parentSpan = spans[0];
  spans.forEach(wrapSpanAttrs);

  const trace = {
    resource: { attributes: [] },
    traceName: 'theTrace',
    traceID: 'trc1',
    spans: [],
    startTime: 1000,
    endTime: 3000,
    duration: 2000,
    services: [],
  };

  it('correctly computes links', () => {
    expect(computeLinks(linkPatterns, spans[0], spans[0].attributes, 0)).toEqual([
      {
        url: 'http://example.com/?myKey=valueOfMyKey',
        text: 'first link (valueOfMyKey)',
      },
    ]);
    expect(computeLinks(linkPatterns, spans[1], spans[1].events[0].attributes, 0)).toEqual([
      {
        url: 'http://example.com/?myKey=valueOfMy%2BOther%2BKey&myKey=valueOfMyKey',
        text: 'second link (valueOfMy+Other+Key)',
      },
    ]);
    expect(computeLinks(linkPatterns, spans[1], spans[1].events[0].attributes, 1, trace)).toEqual([
      {
        url: 'http://example.com/?myKey1=valueOfMyKey&myKey=valueOfThirdMyKey&traceID=trc1&startTime=1000',
        text: 'third link (valueOfThirdMyKey) for traceID - trc1',
      },
    ]);
  });

  it('correctly computes links for legacy patterns', () => {
    const legacyPatterns = [
      {
        type: 'tags',
        key: 'myKey',
        url: 'http://example.com/?myKey=#{myKey}',
        text: 'legacy tag link (#{myKey})',
      },
      {
        type: 'process',
        key: 'procKey',
        url: 'http://example.com/?procKey=#{procKey}',
        text: 'legacy process link (#{procKey})',
      },
      {
        type: 'logs',
        key: 'logKey',
        url: 'http://example.com/?logKey=#{logKey}',
        text: 'legacy log link (#{logKey})',
      },
    ].map(processLinkPattern);

    const span = wrapSpanAttrs({
      depth: 0,
      resource: { attributes: [{ key: 'procKey', value: 'procVal' }] },
      attributes: [{ key: 'myKey', value: 'myVal' }],
      events: [{ attributes: [{ key: 'logKey', value: 'logVal' }] }],
    });

    expect(computeLinks(legacyPatterns, span, span.attributes, 0)).toEqual([
      {
        url: 'http://example.com/?myKey=myVal',
        text: 'legacy tag link (myVal)',
      },
    ]);
    expect(computeLinks(legacyPatterns, span, span.resource.attributes, 0)).toEqual([
      {
        url: 'http://example.com/?procKey=procVal',
        text: 'legacy process link (procVal)',
      },
    ]);
    expect(computeLinks(legacyPatterns, span, span.events[0].attributes, 0)).toEqual([
      {
        url: 'http://example.com/?logKey=logVal',
        text: 'legacy log link (logVal)',
      },
    ]);
  });
});

describe('getLinks()', () => {
  const linkPatterns = [
    {
      key: 'mySpecialKey',
      url: 'http://example.com/?mySpecialKey=#{mySpecialKey}',
      text: 'special key link (#{mySpecialKey})',
    },
  ].map(processLinkPattern);
  const template = jest.spyOn(linkPatterns[0].url, 'template');

  const span = wrapSpanAttrs({
    depth: 0,
    resource: {},
    attributes: [{ key: 'mySpecialKey', value: 'valueOfMyKey' }],
  });

  let cache;

  beforeEach(() => {
    cache = new WeakMap();
    template.mockClear();
  });

  it('does not access the cache if there is no link pattern', () => {
    cache.get = jest.fn();
    const getLinks = createGetLinks([], cache);
    expect(getLinks(span, span.attributes, 0)).toEqual([]);
    expect(cache.get).not.toHaveBeenCalled();
  });

  it('returns the result from the cache', () => {
    const result = [];
    cache.set(span.attributes.entries()[0], result);
    const getLinks = createGetLinks(linkPatterns, cache);
    expect(getLinks(span, span.attributes, 0)).toBe(result);
    expect(template).not.toHaveBeenCalled();
  });

  it('adds the result to the cache', () => {
    const getLinks = createGetLinks(linkPatterns, cache);
    const result = getLinks(span, span.attributes, 0);
    expect(template).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        url: 'http://example.com/?mySpecialKey=valueOfMyKey',
        text: 'special key link (valueOfMyKey)',
      },
    ]);
    expect(cache.get(span.attributes.entries()[0])).toBe(result);
  });

  it('returns trace links when valid trace is passed', () => {
    const trace = {
      resource: { attributes: [] },
      traceName: 'theTrace',
      traceID: 'trc1',
      spans: [],
      startTime: 1000,
      endTime: 2000,
      duration: 1000,
      services: [],
    };
    expect(getTraceLinks(trace)).toBeInstanceOf(Array);
  });
});

describe('Structured Scoping (Issue #1179)', () => {
  const rootSpan = wrapSpanAttrs({
    depth: 0,
    spanID: 'root-span-id',
    traceID: 'trace-xyz',
    name: 'root-operation',
    duration: 5000,
    startTime: 1000,
    endTime: 6000,
    attributes: [
      { key: 'rootAttr', value: 'root-val' },
      { key: 'sharedAttr', value: 'shared-root' },
    ],
    resource: {
      serviceName: 'root-service',
      attributes: [
        { key: 'rootResAttr', value: 'root-res-val' },
        { key: 'cluster', value: 'us-east-1' },
      ],
    },
  });

  const parentSpan = wrapSpanAttrs({
    depth: 1,
    spanID: 'parent-span-id',
    traceID: 'trace-xyz',
    name: 'parent-operation',
    duration: 3000,
    startTime: 1500,
    endTime: 4500,
    parentSpan: rootSpan,
    attributes: [
      { key: 'parentAttr', value: 'parent-val' },
      { key: 'sharedAttr', value: 'shared-parent' },
    ],
    resource: {
      serviceName: 'parent-service',
      attributes: [
        { key: 'parentResAttr', value: 'parent-res-val' },
        { key: 'zone', value: 'zone-b' },
      ],
    },
  });

  const childSpan = wrapSpanAttrs({
    depth: 2,
    spanID: 'child-span-id',
    traceID: 'trace-xyz',
    name: 'child-operation',
    duration: 1000,
    startTime: 2000,
    endTime: 3000,
    parentSpan,
    attributes: [
      { key: 'childAttr', value: 'child-val' },
      { key: 'sharedAttr', value: 'shared-child' },
      { key: 'span.literalKey', value: 'literal-span-val' },
      { key: 'trace.literalTraceKey', value: 'literal-trace-val' },
    ],
    resource: {
      serviceName: 'child-service',
      attributes: [
        { key: 'childResAttr', value: 'child-res-val' },
        { key: 'env', value: 'prod' },
      ],
    },
    events: [
      {
        attributes: [
          { key: 'eventAttr', value: 'event-val' },
          { key: 'sharedAttr', value: 'shared-event' },
        ],
      },
    ],
  });

  const trace = {
    resource: { attributes: [] },
    traceName: 'theTrace',
    traceID: 'trace-xyz',
    spans: [rootSpan, parentSpan, childSpan],
    startTime: 1000,
    endTime: 7000,
    duration: 6000,
    services: [],
  };

  describe('getParameterInSpanIntrinsic()', () => {
    it('returns intrinsic fields for a span', () => {
      expect(getParameterInSpanIntrinsic('spanID', childSpan)).toEqual({
        key: 'spanID',
        value: 'child-span-id',
      });
      expect(getParameterInSpanIntrinsic('traceID', childSpan)).toEqual({
        key: 'traceID',
        value: 'trace-xyz',
      });
      expect(getParameterInSpanIntrinsic('operationName', childSpan)).toEqual({
        key: 'operationName',
        value: 'child-operation',
      });
      expect(getParameterInSpanIntrinsic('name', childSpan)).toEqual({
        key: 'name',
        value: 'child-operation',
      });
      expect(getParameterInSpanIntrinsic('duration', childSpan)).toEqual({
        key: 'duration',
        value: 1000,
      });
      expect(getParameterInSpanIntrinsic('startTime', childSpan)).toEqual({
        key: 'startTime',
        value: 2000,
      });
      expect(getParameterInSpanIntrinsic('endTime', childSpan)).toEqual({
        key: 'endTime',
        value: 3000,
      });
      expect(getParameterInSpanIntrinsic('serviceName', childSpan)).toEqual({
        key: 'serviceName',
        value: 'child-service',
      });
    });

    it('returns undefined for non-intrinsic fields', () => {
      expect(getParameterInSpanIntrinsic('customAttr', childSpan)).toBeUndefined();
    });
  });

  describe('getParameterInResource()', () => {
    it('returns resource attributes', () => {
      expect(getParameterInResource('childResAttr', childSpan)).toEqual({
        key: 'childResAttr',
        value: 'child-res-val',
      });
      expect(getParameterInResource('env', childSpan)).toEqual({
        key: 'env',
        value: 'prod',
      });
    });

    it('resolves serviceName and service.name from resource', () => {
      expect(getParameterInResource('serviceName', childSpan)).toEqual({
        key: 'serviceName',
        value: 'child-service',
      });
    });

    it('returns undefined for attributes not in resource', () => {
      expect(getParameterInResource('childAttr', childSpan)).toBeUndefined();
      expect(getParameterInResource('parentResAttr', childSpan)).toBeUndefined();
    });
  });

  describe('getParameterInSpan()', () => {
    it('returns intrinsic fields and span attributes without ascending', () => {
      expect(getParameterInSpan('childAttr', childSpan)).toEqual({
        key: 'childAttr',
        value: 'child-val',
      });
      expect(getParameterInSpan('operationName', childSpan)).toEqual({
        key: 'operationName',
        value: 'child-operation',
      });
      // Does not ascend to parent span
      expect(getParameterInSpan('parentAttr', childSpan)).toBeUndefined();
    });
  });

  describe('getParameterInParent()', () => {
    it('returns direct parent span attributes and intrinsics', () => {
      expect(getParameterInParent('spanID', childSpan)).toEqual({
        key: 'spanID',
        value: 'parent-span-id',
      });
      expect(getParameterInParent('operationName', childSpan)).toEqual({
        key: 'operationName',
        value: 'parent-operation',
      });
      expect(getParameterInParent('parentAttr', childSpan)).toEqual({
        key: 'parentAttr',
        value: 'parent-val',
      });
      expect(getParameterInParent('serviceName', childSpan)).toEqual({
        key: 'serviceName',
        value: 'parent-service',
      });
    });

    it('supports resource. and process. subscopes on parent', () => {
      expect(getParameterInParent('resource.zone', childSpan)).toEqual({
        key: 'zone',
        value: 'zone-b',
      });
      expect(getParameterInParent('process.zone', childSpan)).toEqual({
        key: 'zone',
        value: 'zone-b',
      });
      expect(getParameterInParent('resource.serviceName', childSpan)).toEqual({
        key: 'serviceName',
        value: 'parent-service',
      });
    });

    it('supports span. subscope on parent', () => {
      expect(getParameterInParent('span.parentAttr', childSpan)).toEqual({
        key: 'parentAttr',
        value: 'parent-val',
      });
      expect(getParameterInParent('span.operationName', childSpan)).toEqual({
        key: 'operationName',
        value: 'parent-operation',
      });
    });

    it('does not ascend past the immediate parent to grandparent', () => {
      expect(getParameterInParent('rootAttr', childSpan)).toBeUndefined();
    });

    it('returns undefined if span has no parent', () => {
      expect(getParameterInParent('spanID', rootSpan)).toBeUndefined();
      expect(getParameterInParent('parentAttr', rootSpan)).toBeUndefined();
    });
  });

  describe('getParameterInAncestors()', () => {
    it('walks up ancestors to find attributes', () => {
      // Direct parent
      expect(getParameterInAncestors('parentAttr', childSpan)).toEqual({
        key: 'parentAttr',
        value: 'parent-val',
      });
      // Grandparent
      expect(getParameterInAncestors('rootAttr', childSpan)).toEqual({
        key: 'rootAttr',
        value: 'root-val',
      });
      // Closest ancestor wins when shared
      expect(getParameterInAncestors('sharedAttr', childSpan)).toEqual({
        key: 'sharedAttr',
        value: 'shared-parent',
      });
    });

    it('supports resource. and process. subscopes on ancestors', () => {
      expect(getParameterInAncestors('resource.cluster', childSpan)).toEqual({
        key: 'cluster',
        value: 'us-east-1',
      });
      expect(getParameterInAncestors('process.cluster', childSpan)).toEqual({
        key: 'cluster',
        value: 'us-east-1',
      });
      expect(getParameterInAncestors('resource.zone', childSpan)).toEqual({
        key: 'zone',
        value: 'zone-b',
      });
    });

    it('supports span. subscope on ancestors', () => {
      expect(getParameterInAncestors('span.rootAttr', childSpan)).toEqual({
        key: 'rootAttr',
        value: 'root-val',
      });
      expect(getParameterInAncestors('span.operationName', childSpan)).toEqual({
        key: 'operationName',
        value: 'parent-operation',
      });
    });

    it('returns undefined when no ancestor has the attribute or on root span', () => {
      expect(getParameterInAncestors('nonExistent', childSpan)).toBeUndefined();
      expect(getParameterInAncestors('rootAttr', rootSpan)).toBeUndefined();
    });
  });

  describe('resolveParameter()', () => {
    it('resolves trace. scope', () => {
      expect(resolveParameter('trace.traceID', childSpan, childSpan.attributes, 'attributes', trace)).toEqual(
        {
          key: 'traceID',
          value: 'trace-xyz',
        }
      );
      expect(
        resolveParameter('trace.startTime', childSpan, childSpan.attributes, 'attributes', trace)
      ).toEqual({
        key: 'startTime',
        value: 1000,
      });
      expect(
        resolveParameter('trace.duration', childSpan, childSpan.attributes, 'attributes', trace)
      ).toEqual({
        key: 'duration',
        value: 6000,
      });
      // Falls back to literal attribute if key exists literally on items/span
      expect(
        resolveParameter('trace.literalTraceKey', childSpan, childSpan.attributes, 'attributes', trace)
      ).toEqual({
        key: 'trace.literalTraceKey',
        value: 'literal-trace-val',
      });
    });

    it('resolves span. scope', () => {
      expect(resolveParameter('span.childAttr', childSpan, childSpan.attributes, 'attributes')).toEqual({
        key: 'childAttr',
        value: 'child-val',
      });
      expect(resolveParameter('span.operationName', childSpan, childSpan.attributes, 'attributes')).toEqual({
        key: 'operationName',
        value: 'child-operation',
      });
      expect(resolveParameter('span.serviceName', childSpan, childSpan.attributes, 'attributes')).toEqual({
        key: 'serviceName',
        value: 'child-service',
      });
      // Does not ascend to parent
      expect(
        resolveParameter('span.parentAttr', childSpan, childSpan.attributes, 'attributes')
      ).toBeUndefined();
      // Falls back to literal attribute name if present
      expect(resolveParameter('span.literalKey', childSpan, childSpan.attributes, 'attributes')).toEqual({
        key: 'span.literalKey',
        value: 'literal-span-val',
      });
    });

    it('resolves process. and resource. scopes', () => {
      expect(
        resolveParameter('resource.childResAttr', childSpan, childSpan.attributes, 'attributes')
      ).toEqual({
        key: 'childResAttr',
        value: 'child-res-val',
      });
      expect(resolveParameter('process.childResAttr', childSpan, childSpan.attributes, 'attributes')).toEqual(
        {
          key: 'childResAttr',
          value: 'child-res-val',
        }
      );
      expect(resolveParameter('resource.serviceName', childSpan, childSpan.attributes, 'attributes')).toEqual(
        {
          key: 'serviceName',
          value: 'child-service',
        }
      );
      expect(resolveParameter('process.serviceName', childSpan, childSpan.attributes, 'attributes')).toEqual({
        key: 'serviceName',
        value: 'child-service',
      });
      // span.resource. and span.process.
      expect(
        resolveParameter('span.resource.childResAttr', childSpan, childSpan.attributes, 'attributes')
      ).toEqual({
        key: 'childResAttr',
        value: 'child-res-val',
      });
      expect(
        resolveParameter('span.process.childResAttr', childSpan, childSpan.attributes, 'attributes')
      ).toEqual({
        key: 'childResAttr',
        value: 'child-res-val',
      });
    });

    it('resolves parent. and span.parent. scopes', () => {
      expect(resolveParameter('parent.parentAttr', childSpan, childSpan.attributes, 'attributes')).toEqual({
        key: 'parentAttr',
        value: 'parent-val',
      });
      expect(
        resolveParameter('span.parent.parentAttr', childSpan, childSpan.attributes, 'attributes')
      ).toEqual({
        key: 'parentAttr',
        value: 'parent-val',
      });
      expect(resolveParameter('parent.spanID', childSpan, childSpan.attributes, 'attributes')).toEqual({
        key: 'spanID',
        value: 'parent-span-id',
      });
      expect(resolveParameter('parent.resource.zone', childSpan, childSpan.attributes, 'attributes')).toEqual(
        {
          key: 'zone',
          value: 'zone-b',
        }
      );
      expect(resolveParameter('parent.process.zone', childSpan, childSpan.attributes, 'attributes')).toEqual({
        key: 'zone',
        value: 'zone-b',
      });
      // Immediate parent only (not grandparent)
      expect(
        resolveParameter('parent.rootAttr', childSpan, childSpan.attributes, 'attributes')
      ).toBeUndefined();
    });

    it('resolves ancestor. and span.ancestor. scopes', () => {
      expect(resolveParameter('ancestor.parentAttr', childSpan, childSpan.attributes, 'attributes')).toEqual({
        key: 'parentAttr',
        value: 'parent-val',
      });
      expect(resolveParameter('ancestor.rootAttr', childSpan, childSpan.attributes, 'attributes')).toEqual({
        key: 'rootAttr',
        value: 'root-val',
      });
      expect(
        resolveParameter('span.ancestor.rootAttr', childSpan, childSpan.attributes, 'attributes')
      ).toEqual({
        key: 'rootAttr',
        value: 'root-val',
      });
      expect(
        resolveParameter('ancestor.resource.cluster', childSpan, childSpan.attributes, 'attributes')
      ).toEqual({
        key: 'cluster',
        value: 'us-east-1',
      });
      expect(
        resolveParameter('ancestor.process.cluster', childSpan, childSpan.attributes, 'attributes')
      ).toEqual({
        key: 'cluster',
        value: 'us-east-1',
      });
    });

    it('falls back to backward-compatible unqualified resolution', () => {
      // From event items first
      expect(resolveParameter('eventAttr', childSpan, childSpan.events[0].attributes, 'events')).toEqual({
        key: 'eventAttr',
        value: 'event-val',
      });
      expect(resolveParameter('sharedAttr', childSpan, childSpan.events[0].attributes, 'events')).toEqual({
        key: 'sharedAttr',
        value: 'shared-event',
      });
      // From span attributes
      expect(resolveParameter('childAttr', childSpan, childSpan.attributes, 'attributes')).toEqual({
        key: 'childAttr',
        value: 'child-val',
      });
      // From resource attributes
      expect(resolveParameter('childResAttr', childSpan, childSpan.attributes, 'attributes')).toEqual({
        key: 'childResAttr',
        value: 'child-res-val',
      });
      // From parent span attributes
      expect(resolveParameter('parentAttr', childSpan, childSpan.attributes, 'attributes')).toEqual({
        key: 'parentAttr',
        value: 'parent-val',
      });
      // From grandparent attributes
      expect(resolveParameter('rootAttr', childSpan, childSpan.attributes, 'attributes')).toEqual({
        key: 'rootAttr',
        value: 'root-val',
      });
      // Unqualified intrinsic fields
      expect(resolveParameter('serviceName', childSpan, childSpan.attributes, 'attributes')).toEqual({
        key: 'serviceName',
        value: 'child-service',
      });
      expect(resolveParameter('operationName', childSpan, childSpan.attributes, 'attributes')).toEqual({
        key: 'operationName',
        value: 'child-operation',
      });
    });
  });

  describe('computeLinks() with structured scopes', () => {
    it('correctly resolves full URL and text using all structured scopes', () => {
      const pattern = [
        {
          type: 'attributes',
          key: 'childAttr',
          url: 'http://example.com/?trace=#{trace.traceID}&span=#{span.spanID}&op=#{span.operationName}&parent=#{parent.spanID}&svc=#{resource.serviceName}&ancestor=#{ancestor.cluster}',
          text: 'Link for #{span.name} (svc: #{process.serviceName}, parent: #{span.parent.operationName})',
        },
      ].map(processLinkPattern);

      const links = computeLinks(pattern, childSpan, childSpan.attributes, 0, trace);
      expect(links).toEqual([
        {
          url: 'http://example.com/?trace=trace-xyz&span=child-span-id&op=child-operation&parent=parent-span-id&svc=child-service&ancestor=us-east-1',
          text: 'Link for child-operation (svc: child-service, parent: parent-operation)',
        },
      ]);
    });

    it('works with formatters on structured scoped parameters', () => {
      const pattern = [
        {
          type: 'attributes',
          key: 'childAttr',
          url: 'http://example.com/?time=#{trace.startTime | epoch_micros_to_date_iso}&dur=#{span.duration | add 50}',
          text: 'Formatted #{trace.startTime | epoch_micros_to_date_iso}',
        },
      ].map(processLinkPattern);

      const links = computeLinks(pattern, childSpan, childSpan.attributes, 0, trace);
      expect(links).toEqual([
        {
          url: 'http://example.com/?time=1970-01-01T00%3A00%3A00.001Z&dur=1050',
          text: 'Formatted 1970-01-01T00:00:00.001Z',
        },
      ]);
    });

    it('supports trace. prefix in trace pattern links', () => {
      const pattern = [
        {
          type: 'traces',
          url: 'http://example.com/?trace=#{trace.traceID}&dur=#{trace.duration}',
          text: 'Trace #{trace.traceID}',
        },
      ].map(processLinkPattern);

      const links = computeTraceLink(pattern, trace);
      expect(links).toEqual([
        {
          url: 'http://example.com/?trace=trace-xyz&dur=6000',
          text: 'Trace trace-xyz',
        },
      ]);
    });
  });
});
