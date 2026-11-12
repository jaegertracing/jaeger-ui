// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import {
  decodeClause,
  EMPTY_SPAN_FILTER,
  encodeClause,
  evaluateSpanFilter,
  hiddenServices,
  IClause,
  ISpanFilter,
  spanFiltersEqual,
  withHiddenServices,
  withoutHiddenSpans,
} from './spanFilter';
import genaiTestTrace from './TraceTimelineViewer/genaiTestTrace.json';
import { makeAttributes } from '../../model/attributes';
import transformTraceData from '../../model/transform-trace-data';
import { IAttribute, IOtelSpan, SpanKind, StatusCode } from '../../types/otel';

function makeSpan(
  spanID: string,
  serviceName: string,
  parentSpan?: IOtelSpan,
  overrides: Partial<Omit<IOtelSpan, 'duration'>> & { attrs?: IAttribute[]; duration?: number } = {}
): IOtelSpan {
  const { attrs = [], ...rest } = overrides;
  return {
    spanID,
    name: `op-${spanID}`,
    parentSpan,
    kind: SpanKind.INTERNAL,
    status: { code: StatusCode.UNSET },
    duration: 1000,
    attributes: makeAttributes(attrs),
    events: [],
    resource: {
      serviceName,
      attributes: makeAttributes([{ key: 'host.name', value: `host-${serviceName}` }]),
    },
    ...rest,
  } as unknown as IOtelSpan;
}

const filterOf = (...clauses: IClause[]): ISpanFilter => ({ ...EMPTY_SPAN_FILTER, clauses });
const liftFilterOf = (...clauses: IClause[]): ISpanFilter => ({ clauses, treeMode: 'lift' });

describe('evaluateSpanFilter', () => {
  const root = makeSpan('root', 'svc-a', undefined, { kind: SpanKind.SERVER, duration: 10_000 });
  const child = makeSpan('child', 'svc-b', root, {
    status: { code: StatusCode.ERROR },
    attrs: [
      { key: 'http.method', value: 'GET' },
      { key: 'gen_ai.usage.input_tokens', value: 120 },
      { key: 'gen_ai.usage.output_tokens', value: 30 },
      { key: 'gen_ai.usage.cache_read.input_tokens', value: 80 },
    ],
    duration: 5_000,
  });
  const grandchild = makeSpan('grandchild', 'svc-c', child, { duration: 100 });
  const sibling = makeSpan('sibling', 'svc-c', root, { duration: 200 });
  const spans = [root, child, grandchild, sibling];
  const hidden = (filter: ISpanFilter) => evaluateSpanFilter(spans, filter).hiddenIDs;

  it('hides nothing when no service is pruned', () => {
    const a = evaluateSpanFilter(spans, EMPTY_SPAN_FILTER);
    expect(a.hiddenIDs).toEqual(new Set());
  });

  it('returns the same empty set every time nothing is pruned, so consumers can memoize on it', () => {
    const a = evaluateSpanFilter(spans, EMPTY_SPAN_FILTER);
    expect(evaluateSpanFilter([root], EMPTY_SPAN_FILTER).hiddenIDs).toBe(a.hiddenIDs);
    expect(evaluateSpanFilter(null, filterOf()).hiddenIDs).toBe(a.hiddenIDs);
    const hidesNothing = filterOf({
      verb: 'hide',
      criterion: { shape: 'set', property: 'status', values: ['no-such-status'] },
    });
    expect(evaluateSpanFilter(spans, hidesNothing).hiddenIDs).toBe(a.hiddenIDs);
  });

  it('returns the same result for the same spans and filter, so the page and the timeline share one evaluation', () => {
    const f = withHiddenServices(EMPTY_SPAN_FILTER, new Set(['svc-b']));
    expect(evaluateSpanFilter(spans, f)).toBe(evaluateSpanFilter(spans, f));
  });

  it('hides the spans of a pruned service and their descendants', () => {
    expect(hidden(withHiddenServices(EMPTY_SPAN_FILTER, new Set(['svc-b'])))).toEqual(
      new Set(['child', 'grandchild'])
    );
  });

  it('hides only the matching spans in lift mode', () => {
    expect(
      hidden(withHiddenServices({ ...EMPTY_SPAN_FILTER, treeMode: 'lift' }, new Set(['svc-b'])))
    ).toEqual(new Set(['child']));
  });

  it('leaves a span of a pruned service visible only when nothing above it is pruned', () => {
    expect(hidden(withHiddenServices(EMPTY_SPAN_FILTER, new Set(['svc-c'])))).toEqual(
      new Set(['grandchild', 'sibling'])
    );
  });

  it('hides nothing when there are no spans', () => {
    const result = evaluateSpanFilter(null, withHiddenServices(EMPTY_SPAN_FILTER, new Set(['svc-a'])));
    expect(result.hiddenIDs.size).toBe(0);
  });

  it('hides the whole trace when the root service is pruned', () => {
    expect(hidden(withHiddenServices(EMPTY_SPAN_FILTER, new Set(['svc-a'])))).toEqual(
      new Set(['root', 'child', 'grandchild', 'sibling'])
    );
  });

  it('hides the whole trace when a hide clause matches the root in remove mode', () => {
    const hideRoot: ISpanFilter = {
      clauses: [{ verb: 'hide', criterion: { shape: 'text', text: 'op-root' } }],
      treeMode: 'remove',
    };
    expect(hidden(hideRoot)).toEqual(new Set(['root', 'child', 'grandchild', 'sibling']));
  });

  it('keeps only the spans that match every keep clause', () => {
    const errors = liftFilterOf({
      verb: 'keep',
      criterion: { shape: 'set', property: 'status', values: ['error'] },
    });
    expect(hidden(errors)).toEqual(new Set(['root', 'grandchild', 'sibling']));
    const errorsOfC = liftFilterOf(
      { verb: 'keep', criterion: { shape: 'set', property: 'status', values: ['error'] } },
      { verb: 'keep', criterion: { shape: 'set', property: 'service', values: ['svc-c'] } }
    );
    expect(hidden(errorsOfC).size).toBe(4);
  });

  it('takes the whole trace with the root when a keep clause fails the root in remove mode', () => {
    const f = filterOf({ verb: 'keep', criterion: { shape: 'set', property: 'status', values: ['error'] } });
    expect(hidden(f)).toEqual(new Set(['root', 'child', 'grandchild', 'sibling']));
  });

  it('maps an unset status to ok, a GenAI kind to its lower-cased span type, and no usage to no tokens', () => {
    expect(
      hidden(liftFilterOf({ verb: 'keep', criterion: { shape: 'set', property: 'status', values: ['OK'] } }))
    ).toEqual(new Set(['child']));
    const llm = makeSpan('llm', 'svc-d', root, { genAIKind: 'LLM_CALL' } as Partial<IOtelSpan>);
    expect(
      evaluateSpanFilter(
        [root, llm],
        liftFilterOf({
          verb: 'hide',
          criterion: { shape: 'set', property: 'spanType', values: ['llm_call'] },
        })
      ).hiddenIDs
    ).toEqual(new Set(['llm']));
    // A span without usage has no token value, so neither a hide nor a keep range on tokens matches it.
    expect(
      hidden(
        liftFilterOf({ verb: 'hide', criterion: { shape: 'range', property: 'tokens', min: 0, max: 0 } })
      )
    ).toEqual(new Set());
    expect(
      hidden(
        liftFilterOf({ verb: 'keep', criterion: { shape: 'range', property: 'tokens', min: 0, max: 0 } })
      )
    ).toEqual(new Set(['root', 'child', 'grandchild', 'sibling']));
  });

  it('matches span kind case-insensitively and span type as none for plain spans', () => {
    expect(
      hidden(
        liftFilterOf({ verb: 'hide', criterion: { shape: 'set', property: 'kind', values: ['server'] } })
      )
    ).toEqual(new Set(['root']));
    expect(
      hidden(
        liftFilterOf({ verb: 'hide', criterion: { shape: 'set', property: 'spanType', values: ['none'] } })
      ).size
    ).toBe(4);
  });

  it('matches a duration range inclusively', () => {
    const f = liftFilterOf({
      verb: 'keep',
      criterion: { shape: 'range', property: 'duration', min: 100, max: 5_000 },
    });
    expect(hidden(f)).toEqual(new Set(['root']));
  });

  it('adds input and output tokens for the tokens range and does not double count their breakdowns', () => {
    const f = liftFilterOf({
      verb: 'keep',
      criterion: { shape: 'range', property: 'tokens', min: 140, max: 200 },
    });
    expect(hidden(f)).toEqual(new Set(['root', 'grandchild', 'sibling']));
  });

  it('matches an attribute criterion against key:value, a bare key and a bare value', () => {
    const hiddenByAttr = (text: string) =>
      hidden(liftFilterOf({ verb: 'hide', criterion: { shape: 'attr', text } }));
    expect(hiddenByAttr('http.method:GET')).toEqual(new Set(['child']));
    expect(hiddenByAttr('http.method')).toEqual(new Set(['child']));
    expect(hiddenByAttr('get')).toEqual(new Set(['child']));
    expect(hiddenByAttr('host.name:host-svc-c')).toEqual(new Set(['grandchild', 'sibling']));
    expect(
      hidden(liftFilterOf({ verb: 'hide', criterion: { shape: 'attr', text: 'http.method:POST' } })).size
    ).toBe(0);
  });

  it('skips an attribute without a value, as the search does', () => {
    const empty = makeSpan('empty', 'svc-a', undefined, {
      attrs: [{ key: 'note', value: null as unknown as string }],
    });
    const byAttr = (text: string) =>
      evaluateSpanFilter([empty], liftFilterOf({ verb: 'hide', criterion: { shape: 'attr', text } }))
        .hiddenIDs;
    expect(byAttr('note:null').size).toBe(0);
    expect(byAttr('null').size).toBe(0);
  });

  it('evaluates a text clause with the search semantics', () => {
    expect(
      hidden(liftFilterOf({ verb: 'hide', criterion: { shape: 'text', text: 'op-child svc-c' } }))
    ).toEqual(new Set(['child', 'grandchild', 'sibling']));
  });

  it('treats a GenAI span as hidden when a plain ancestor service is pruned', () => {
    const trace = transformTraceData(genaiTestTrace as never)!.asOtelTrace();
    const nestedLlm = trace.spans.find(
      s => s.resource.serviceName === 'summarizer-agent' && s.genAIKind !== undefined
    )!;
    const plainLeafServices = new Set([
      'auth-service',
      'metrics-backend',
      'trace-store',
      'k8s-api',
      'vector-store',
    ]);
    const hiddenBy = (services: Set<string>) =>
      evaluateSpanFilter(trace.spans, withHiddenServices(EMPTY_SPAN_FILTER, services)).hiddenIDs;
    expect(hiddenBy(new Set(['mcp-gateway'])).has(nestedLlm.spanID)).toBe(true);
    expect(hiddenBy(plainLeafServices).has(nestedLlm.spanID)).toBe(false);
  });
});

describe('hiddenServices and withHiddenServices', () => {
  it('round-trips the service hide set and leaves other clauses alone', () => {
    const base = filterOf({
      verb: 'keep',
      criterion: { shape: 'set', property: 'status', values: ['error'] },
    });
    const withServices = withHiddenServices(base, new Set(['b', 'a']));
    expect(hiddenServices(withServices)).toEqual(new Set(['a', 'b']));
    expect(withServices.clauses).toHaveLength(2);
    expect(withHiddenServices(withServices, new Set()).clauses).toEqual(base.clauses);
    expect(hiddenServices(base).size).toBe(0);
  });

  const status: IClause = {
    verb: 'keep',
    criterion: { shape: 'set', property: 'status', values: ['error'] },
  };
  const service = (...values: string[]): IClause => ({
    verb: 'hide',
    criterion: { shape: 'set', property: 'service', values },
  });

  it('keeps the place of an existing service hide clause and appends a new one', () => {
    const existing: ISpanFilter = { treeMode: 'lift', clauses: [service('svc-a'), status] };
    expect(withHiddenServices(existing, new Set(['svc-b', 'svc-a'])).clauses).toEqual([
      service('svc-a', 'svc-b'),
      status,
    ]);
    const fresh: ISpanFilter = { treeMode: 'lift', clauses: [status] };
    expect(withHiddenServices(fresh, new Set(['svc-a'])).clauses).toEqual([status, service('svc-a')]);
    expect(withHiddenServices(existing, new Set()).clauses).toEqual([status]);
  });
});

describe('withoutHiddenSpans', () => {
  it('returns the input unchanged when nothing is hidden', () => {
    const ids = new Set(['s1']);
    expect(withoutHiddenSpans(ids, new Set())).toBe(ids);
  });

  it('returns the input unchanged when it is null', () => {
    expect(withoutHiddenSpans(null, new Set(['s1']))).toBeNull();
  });

  it('removes the hidden spans', () => {
    expect(withoutHiddenSpans(new Set(['s1', 's2']), new Set(['s1']))).toEqual(new Set(['s2']));
  });

  it('returns an empty set, not null, when every match is hidden', () => {
    expect(withoutHiddenSpans(new Set(['s1']), new Set(['s1', 's2']))).toEqual(new Set());
  });
});

describe('clause codec', () => {
  const cases: Array<[string, IClause]> = [
    ['k:status:error', { verb: 'keep', criterion: { shape: 'set', property: 'status', values: ['error'] } }],
    [
      'h:spanType:none',
      { verb: 'hide', criterion: { shape: 'set', property: 'spanType', values: ['none'] } },
    ],
    [
      'h:service:a%2Cb,c',
      { verb: 'hide', criterion: { shape: 'set', property: 'service', values: ['a,b', 'c'] } },
    ],
    [
      'k:duration:120ms-2300ms',
      { verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 120_000, max: 2_300_000 } },
    ],
    [
      'k:duration:1234567us-2s',
      { verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 1_234_567, max: 2_000_000 } },
    ],
    [
      'k:duration:50us-999us',
      { verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 50, max: 999 } },
    ],
    [
      'k:tokens:1000-19000',
      { verb: 'keep', criterion: { shape: 'range', property: 'tokens', min: 1000, max: 19000 } },
    ],
    [
      'h:service:100%25,a%2Cb',
      { verb: 'hide', criterion: { shape: 'set', property: 'service', values: ['100%', 'a,b'] } },
    ],
    ['h:service:%252C', { verb: 'hide', criterion: { shape: 'set', property: 'service', values: ['%2C'] } }],
    [
      'k:duration:2s-',
      { verb: 'keep', criterion: { shape: 'range', property: 'duration', min: 2_000_000, max: Infinity } },
    ],
    ['k:tokens:0-500', { verb: 'keep', criterion: { shape: 'range', property: 'tokens', min: 0, max: 500 } }],
    ['h:text:tools/call auth', { verb: 'hide', criterion: { shape: 'text', text: 'tools/call auth' } }],
    ['k:attr:http.method:GET', { verb: 'keep', criterion: { shape: 'attr', text: 'http.method:GET' } }],
  ];

  it.each(cases)('round-trips %s', (encoded, clause) => {
    expect(encodeClause(clause)).toBe(encoded);
    expect(decodeClause(encoded)).toEqual(clause);
  });

  it.each([
    'nonsense',
    'x:status:error',
    'f:status:error',
    'k:unknown:1',
    'k:status:',
    'k:text:',
    'k:text:   ',
    'k:duration:1ms',
    'k:duration:2s-1s',
    'k:duration:fast-slow',
    'k:tokens:a-b',
    'k:tokens:0x10-1e3',
    'k:tokens:99999999999999999999999-',
    'k:duration:9999999999999999s-',
  ])('rejects %s', encoded => {
    expect(decodeClause(encoded)).toBeNull();
  });

  it('reads an empty lower bound as zero', () => {
    expect(decodeClause('k:tokens:-5')).toEqual({
      verb: 'keep',
      criterion: { shape: 'range', property: 'tokens', min: 0, max: 5 },
    });
  });

  it('reads a range with both bounds open as everything', () => {
    expect(decodeClause('k:tokens:-')).toEqual({
      verb: 'keep',
      criterion: { shape: 'range', property: 'tokens', min: 0, max: Infinity },
    });
  });

  it('trims set values and drops the empty ones', () => {
    expect(decodeClause('h:kind: server , ,client')).toEqual({
      verb: 'hide',
      criterion: { shape: 'set', property: 'kind', values: ['server', 'client'] },
    });
  });

  it('trims text and attribute criteria the way the decoder does', () => {
    expect(encodeClause({ verb: 'keep', criterion: { shape: 'text', text: ' padded ' } })).toBe(
      'k:text:padded'
    );
    expect(encodeClause({ verb: 'keep', criterion: { shape: 'attr', text: 'http.method: ' } })).toBe(
      'k:attr:http.method:'
    );
  });

  it('rounds a fractional duration to whole microseconds and sorts set values', () => {
    expect(decodeClause('k:duration:2.3s-2.3s')).toEqual({
      verb: 'keep',
      criterion: { shape: 'range', property: 'duration', min: 2_300_000, max: 2_300_000 },
    });
    expect(
      encodeClause({ verb: 'keep', criterion: { shape: 'set', property: 'status', values: ['ok', 'error'] } })
    ).toBe('k:status:error,ok');
  });
});

describe('spanFiltersEqual', () => {
  const a = filterOf({ verb: 'keep', criterion: { shape: 'set', property: 'status', values: ['error'] } });
  it('compares clauses and tree mode by value', () => {
    expect(spanFiltersEqual(a, filterOf(...a.clauses.map(c => ({ ...c }))))).toBe(true);
    expect(spanFiltersEqual(a, { ...a, treeMode: 'lift' })).toBe(false);
    expect(spanFiltersEqual(a, EMPTY_SPAN_FILTER)).toBe(false);
    const ab = filterOf({
      verb: 'keep',
      criterion: { shape: 'set', property: 'status', values: ['a', 'b'] },
    });
    const ba = filterOf({
      verb: 'keep',
      criterion: { shape: 'set', property: 'status', values: ['b', 'a'] },
    });
    expect(spanFiltersEqual(ab, ba)).toBe(true);
  });
});
