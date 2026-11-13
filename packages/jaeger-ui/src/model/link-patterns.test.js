// Copyright (c) 2017 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import {
  processTemplate,
  createTestFunction,
  getParameterInAncestor,
  getParameterInTrace,
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

  it('executes formatters exactly once in trace links', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const patterns = [
      {
        type: 'traces',
        url: 'http://example.com/?from=#{startTime | add 1000000}',
        text: 'link (#{startTime | add 1000000})',
      },
      {
        type: 'traces',
        url: 'http://example.com/?date=#{startTime | epoch_micros_to_date_iso}',
        text: 'date link (#{startTime | epoch_micros_to_date_iso})',
      },
      {
        type: 'traces',
        url: 'http://example.com/?id=#{traceID | pad_start 8 0}',
        text: 'id link (#{traceID | pad_start 8 0})',
      },
    ].map(processLinkPattern);

    const testTrace = {
      resource: { attributes: [] },
      traceName: 'theTrace',
      traceID: '123',
      spans: [],
      startTime: 5000000,
      endTime: 6000000,
      duration: 1000000,
      services: [],
    };

    expect(computeTraceLink(patterns, testTrace)).toEqual([
      {
        url: 'http://example.com/?from=6000000',
        text: 'link (6000000)',
      },
      {
        url: 'http://example.com/?date=1970-01-01T00%3A00%3A05.000Z',
        text: 'date link (1970-01-01T00:00:05.000Z)',
      },
      {
        url: 'http://example.com/?id=00000123',
        text: 'id link (00000123)',
      },
    ]);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('handles multiple independently formatted placeholders for the same trace parameter', () => {
    const patterns = [
      {
        type: 'traces',
        url: 'http://example.com/?from=#{startTime | add -1000000}&to=#{startTime | add 1000000}',
        text: 'range: #{startTime | add -1000000} to #{startTime | add 1000000}',
      },
    ].map(processLinkPattern);

    const testTrace = {
      resource: { attributes: [] },
      traceName: 'theTrace',
      traceID: 'trc1',
      spans: [],
      startTime: 5000000,
      endTime: 6000000,
      duration: 1000000,
      services: [],
    };

    expect(computeTraceLink(patterns, testTrace)).toEqual([
      {
        url: 'http://example.com/?from=4000000&to=6000000',
        text: 'range: 4000000 to 6000000',
      },
    ]);
  });

  it('formats numeric zero and supports unformatted parameters in trace links', () => {
    const patterns = [
      {
        type: 'traces',
        url: 'http://example.com/?id=#{traceID}&start=#{startTime | add 5}&rawStart=#{startTime}',
        text: 'trace #{traceID} at #{startTime | add 5} (raw: #{startTime})',
      },
    ].map(processLinkPattern);

    const testTrace = {
      resource: { attributes: [] },
      traceName: 'theTrace',
      traceID: 'trc1',
      spans: [],
      startTime: 0,
      endTime: 1000,
      duration: 1000,
      services: [],
    };

    expect(computeTraceLink(patterns, testTrace)).toEqual([
      {
        url: 'http://example.com/?id=trc1&start=5&rawStart=0',
        text: 'trace trc1 at 5 (raw: 0)',
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

  it('applies formatters to attribute (tag), process (resource), and event (log) links', () => {
    const formattedPatterns = [
      {
        type: 'attributes',
        key: 'http.status_code',
        url: 'http://example.com/?code=#{http.status_code | add 1}',
        text: 'status code (#{http.status_code | add 1})',
      },
      {
        type: 'process',
        key: 'service.version',
        url: 'http://example.com/?version=#{service.version | pad_start 5 0}',
        text: 'version (#{service.version | pad_start 5 0})',
      },
      {
        type: 'logs',
        key: 'log.count',
        url: 'http://example.com/?count=#{log.count | add 10}',
        text: 'log count (#{log.count | add 10})',
      },
    ].map(processLinkPattern);

    const span = wrapSpanAttrs({
      depth: 0,
      resource: { attributes: [{ key: 'service.version', value: '7' }] },
      attributes: [{ key: 'http.status_code', value: 200 }],
      events: [{ attributes: [{ key: 'log.count', value: 5 }] }],
    });

    expect(computeLinks(formattedPatterns, span, span.attributes, 0)).toEqual([
      {
        url: 'http://example.com/?code=201',
        text: 'status code (201)',
      },
    ]);
    expect(computeLinks(formattedPatterns, span, span.resource.attributes, 0)).toEqual([
      {
        url: 'http://example.com/?version=00007',
        text: 'version (00007)',
      },
    ]);
    expect(computeLinks(formattedPatterns, span, span.events[0].attributes, 0)).toEqual([
      {
        url: 'http://example.com/?count=15',
        text: 'log count (15)',
      },
    ]);
  });

  it('resolves trace-prefixed parameters with formatters in span links', () => {
    const tracePrefixedPatterns = [
      {
        type: 'attributes',
        key: 'myKey',
        url: 'http://example.com/?start=#{trace.startTime | add 1000}&id=#{trace.traceID | pad_start 8 0}',
        text: 'trace start: #{trace.startTime | add 1000}',
      },
    ].map(processLinkPattern);

    const span = wrapSpanAttrs({
      depth: 0,
      resource: {},
      attributes: [{ key: 'myKey', value: 'myVal' }],
    });

    expect(computeLinks(tracePrefixedPatterns, span, span.attributes, 0, trace)).toEqual([
      {
        url: 'http://example.com/?start=2000&id=0000trc1',
        text: 'trace start: 2000',
      },
    ]);
  });

  it('formats numeric zero in span attributes and supports independent formatters', () => {
    const patterns = [
      {
        type: 'attributes',
        key: 'n',
        url: 'http://example.com/?inc=#{n | add 5}&dec=#{n | add -5}&raw=#{n}',
        text: 'inc: #{n | add 5}, dec: #{n | add -5}, raw: #{n}',
      },
    ].map(processLinkPattern);

    const span = wrapSpanAttrs({
      depth: 0,
      resource: {},
      attributes: [{ key: 'n', value: 0 }],
    });

    expect(computeLinks(patterns, span, span.attributes, 0)).toEqual([
      {
        url: 'http://example.com/?inc=5&dec=-5&raw=0',
        text: 'inc: 5, dec: -5, raw: 0',
      },
    ]);
  });

  it('logs a warning and skips link when a parameter with formatters is missing', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const patterns = [
      {
        type: 'attributes',
        key: 'myKey',
        url: 'http://example.com/?missing=#{nonExistent | add 1}',
        text: 'missing link',
      },
    ].map(processLinkPattern);

    const span = wrapSpanAttrs({
      depth: 0,
      resource: {},
      attributes: [{ key: 'myKey', value: 'myVal' }],
    });

    expect(computeLinks(patterns, span, span.attributes, 0)).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      'Skipping link pattern, missing parameter nonExistent | add 1 for key myKey in attributes.',
      expect.anything()
    );
    warnSpy.mockRestore();
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
