// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import { loadTracesFromFile } from './FileLoader';
import { createBlob } from './SearchResults/DownloadResults';
import { getCachedTrace } from '../../hooks/useTraceLoading';
import { queryClient } from '../../query/app-query-client';
import { uploadedTraceId } from '../../utils/otel-upload';
import numericUpload from '../../utils/fixtures/otlp-upload-numeric.json';

const traceId = 'abcdef0123456789abcdef0123456789';
const secondId = '1234567890abcdef1234567890abcdef';
const makeSpan = (id = traceId, spanId = '1111111111111111') => ({
  traceId: id,
  spanId,
  name: 'chat',
  startTimeUnixNano: '1000000',
  endTimeUnixNano: '2000000',
  attributes: [{ key: 'gen_ai.operation.name', value: { stringValue: 'chat' } }],
});
const payload = {
  resourceSpans: [
    {
      resource: { attributes: [{ key: 'service.name', value: { stringValue: 'assistant' } }] },
      scopeSpans: [{ scope: { name: 'upload-scope', version: '1' }, spans: [makeSpan()] }],
    },
  ],
};
const fetchMock = vi.fn<typeof fetch>();
const file = (body: unknown) => new File([JSON.stringify(body)], 'trace.json');

beforeEach(() => {
  queryClient.clear();
  fetchMock.mockReset().mockRejectedValue(new Error('Backend unreachable'));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  queryClient.clear();
  vi.unstubAllGlobals();
});

it('loads and re-uploads a numeric OTLP fixture offline', async () => {
  const first = await loadTracesFromFile(file(numericUpload));
  expect(first.errorCount).toBe(0);
  expect(first.summaries.map(summary => summary.traceID)).toEqual([traceId]);
  const trace = getCachedTrace(traceId)!;
  expect(trace.spans).toHaveLength(1);
  expect(trace.spans[0].startTime).toBe(1000);
  expect(trace.spans[0].attributes.getValue('count')).toBe(0);
  expect(trace.spans[0].events[0].timestamp).toBe(1500);
  queryClient.clear();
  const second = await loadTracesFromFile(new File([createBlob(first.rawTraces)], 'numeric-download.json'));
  expect(second.summaries).toEqual(first.summaries);
  expect(second.rawTraces).toEqual(first.rawTraces);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('tells uploaders to quote a numeric Unix-nano timestamp that lost precision', async () => {
  const upload = fs.readFileSync(
    path.resolve(import.meta.dirname, '../../utils/fixtures/otlp-upload-unsafe-timestamp.json'),
    'utf-8'
  );
  const result = await loadTracesFromFile(new File([upload], 'numeric.json'));
  expect(result).toMatchObject({ summaries: [], errorCount: 1, rejectedOtelDocumentCount: 1 });
  expect(result.errorDetail).toBe(
    'Numeric int64 value exceeds 2^53 and lost precision; send int64 values as quoted decimal strings ' +
      '(at resourceSpans.0.scopeSpans.0.spans.0.startTimeUnixNano)'
  );
  expect(getCachedTrace(traceId)).toBeUndefined();
});

it('loads valid spans beside omitted empty scope/span arrays', async () => {
  const input = {
    resourceSpans: [{}, { scopeSpans: [{}, payload.resourceSpans[0].scopeSpans[0]] }],
  };
  const result = await loadTracesFromFile(file(input));
  expect(result.errorCount).toBe(0);
  expect(getCachedTrace(traceId)!.spans).toHaveLength(1);
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each([{}, { result: {} }, { resourceSpans: [{}] }, { resourceSpans: [{ scopeSpans: [{}] }] }])(
  'returns no traces or errors for empty OTLP data with omitted repeated fields',
  async input => {
    expect(await loadTracesFromFile(file(input))).toEqual({ summaries: [], rawTraces: [], errorCount: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  }
);

it.each(['document', 'array', 'jsonl', 'envelope'] as const)(
  'loads an OTLP %s with no backend',
  async format => {
    const input = format === 'array' ? [payload] : format === 'envelope' ? { result: payload } : payload;
    const upload =
      format === 'jsonl' ? new File([`${JSON.stringify(payload)}\n`], 'trace.jsonl') : file(input);
    const result = await loadTracesFromFile(upload);
    expect(result.errorCount).toBe(0);
    expect(result.summaries.map(s => s.traceID)).toEqual([traceId]);
    expect(fetchMock).not.toHaveBeenCalled();
    const trace = getCachedTrace(traceId)!;
    expect(trace.spans).toHaveLength(1);
    expect(trace.isGenAITrace).toBe(true);
    expect(trace.spans[0].instrumentationScope).toMatchObject({ name: 'upload-scope', version: '1' });
    expect(trace.spans[0].resource.serviceName).toBe('assistant');
    expect(uploadedTraceId(result.rawTraces[0])).toBe(traceId);
  }
);

it('groups repeated IDs across resources and scopes without dropping metadata', async () => {
  const input = structuredClone(payload);
  input.resourceSpans[0].scopeSpans[0].spans.push(makeSpan(secondId, '2222222222222222'));
  input.resourceSpans.push({
    resource: { attributes: [{ key: 'service.name', value: { stringValue: 'tool-service' } }] },
    scopeSpans: [
      {
        scope: { name: 'tool-scope', version: '2' },
        spans: [makeSpan(traceId.toUpperCase(), '3333333333333333')],
      },
    ],
  });
  const before = JSON.stringify(input);
  const result = await loadTracesFromFile(file(input));
  expect(result.errorCount).toBe(0);
  expect(result.summaries.map(s => s.traceID)).toEqual([traceId, secondId]);
  expect(getCachedTrace(traceId)?.spans).toHaveLength(2);
  expect(getCachedTrace(secondId)?.spans).toHaveLength(1);
  const span = getCachedTrace(traceId)!.spanMap.get('3333333333333333')!;
  expect(span.resource.serviceName).toBe('tool-service');
  expect(span.instrumentationScope).toMatchObject({ name: 'tool-scope', version: '2' });
  expect(result.rawTraces.map(uploadedTraceId)).toEqual([traceId, secondId]);
  expect(JSON.stringify(input)).toBe(before);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('reloads downloaded native uploads without serializing enriched parent/child cycles', async () => {
  const input = structuredClone(payload);
  input.resourceSpans[0].scopeSpans[0].spans.push({
    ...makeSpan(traceId, '2222222222222222'),
    parentSpanId: '1111111111111111',
  } as ReturnType<typeof makeSpan>);
  const first = await loadTracesFromFile(file(input));
  expect(getCachedTrace(traceId)!.spans[0].childSpans).toHaveLength(1);
  const blob = createBlob(first.rawTraces);
  const downloaded = new File([blob], 'download.json');
  queryClient.clear();
  const second = await loadTracesFromFile(downloaded);
  expect(second.summaries).toEqual(first.summaries);
  expect(second.rawTraces).toEqual(first.rawTraces);
  expect(getCachedTrace(traceId)!.spans[0].childSpans).toHaveLength(1);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('counts invalid OTLP documents and still loads valid documents', async () => {
  const invalid = structuredClone(payload);
  invalid.resourceSpans[0].scopeSpans[0].spans[0].spanId = 'invalid';
  const secondInvalid = structuredClone(payload);
  secondInvalid.resourceSpans[0].scopeSpans[0].spans[0].traceId = 'invalid';
  const result = await loadTracesFromFile(file({ data: [invalid, secondInvalid, payload] }));
  expect(result.errorCount).toBe(2);
  expect(result.errorDetail).toBe(
    'Invalid span ID: must be 16-char hex string and not all zeros (at resourceSpans.0.scopeSpans.0.spans.0.spanId)'
  );
  expect(result.summaries.map(s => s.traceID)).toEqual([traceId]);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('returns no traces for empty OTLP data', async () => {
  expect(await loadTracesFromFile(file({ resourceSpans: [] }))).toEqual({
    summaries: [],
    rawTraces: [],
    errorCount: 0,
  });
  expect(fetchMock).not.toHaveBeenCalled();
});

it('merges multiple JSONL documents before grouping by trace ID', async () => {
  const second = structuredClone(payload);
  second.resourceSpans[0].scopeSpans[0].spans[0].traceId = secondId;
  const upload = new File([`${JSON.stringify(payload)}\n${JSON.stringify(second)}\n`], 'multi.jsonl');
  const result = await loadTracesFromFile(upload);
  expect(result.summaries.map(s => s.traceID)).toEqual([traceId, secondId]);
  expect(result.errorCount).toBe(0);
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each(['jsonl-envelopes', 'mixed-array', 'data-wrapper'] as const)(
  'combines the same trace across a whole %s before caching or downloading',
  async format => {
    const childDocument = structuredClone(payload);
    childDocument.resourceSpans[0].resource.attributes[0].value.stringValue = 'child-service';
    childDocument.resourceSpans[0].scopeSpans[0] = {
      scope: { name: 'child-scope', version: '2' },
      spans: [
        {
          ...makeSpan(traceId.toUpperCase(), '2222222222222222'),
          parentSpanId: '1111111111111111',
        } as ReturnType<typeof makeSpan>,
      ],
    };
    const documents = [{ result: payload }, childDocument];
    const upload =
      format === 'jsonl-envelopes'
        ? new File(
            [`${JSON.stringify({ result: payload })}\n${JSON.stringify({ result: childDocument })}\n`],
            'same-trace.jsonl'
          )
        : file(format === 'data-wrapper' ? { data: documents } : documents);
    const result = await loadTracesFromFile(upload);
    expect(result.errorCount).toBe(0);
    expect(result.summaries.map(s => s.traceID)).toEqual([traceId]);
    const trace = getCachedTrace(traceId)!;
    expect(trace.spans.map(s => s.spanID)).toEqual(['1111111111111111', '2222222222222222']);
    expect(trace.spans[0].childSpans[0]).toBe(trace.spans[1]);
    expect(trace.spans[1].parentSpan).toBe(trace.spans[0]);
    expect(trace.spans[1].resource.serviceName).toBe('child-service');
    expect(trace.spans[1].instrumentationScope).toMatchObject({ name: 'child-scope', version: '2' });
    expect(result.rawTraces).toHaveLength(1);
    queryClient.clear();
    const roundTrip = await loadTracesFromFile(new File([createBlob(result.rawTraces)], 'download.json'));
    expect(roundTrip.summaries).toEqual(result.summaries);
    expect(getCachedTrace(traceId)!.spans).toHaveLength(2);
    expect(fetchMock).not.toHaveBeenCalled();
  }
);

it.each(['bare-array', 'jsonl'] as const)(
  'retains valid OTLP documents beside a malformed document in %s',
  async format => {
    const invalid = { resourceSpans: null };
    const childDocument = structuredClone(payload);
    childDocument.resourceSpans[0].scopeSpans[0].spans[0].spanId = '2222222222222222';
    const documents = [payload, invalid, childDocument];
    const upload =
      format === 'bare-array'
        ? file(documents)
        : new File([documents.map(document => JSON.stringify(document)).join('\n')], 'partial.jsonl');
    const result = await loadTracesFromFile(upload);
    expect(result.errorCount).toBe(1);
    expect(result.summaries.map(s => s.traceID)).toEqual([traceId]);
    expect(getCachedTrace(traceId)!.spans).toHaveLength(2);
    expect(result.rawTraces).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  }
);

it.each(['otlp2jaeger-multi-in-combined.json', 'otlp2jaeger-multi-in.json.txt'])(
  'loads every span of the exported fixture %s, including a root with an empty parentSpanId',
  async name => {
    const fixture = fs.readFileSync(path.resolve(import.meta.dirname, '../../utils/fixtures', name), 'utf-8');
    const result = await loadTracesFromFile(new File([fixture], name));
    expect(result.errorCount).toBe(0);
    expect(result.summaries.map(s => s.traceID)).toEqual(['c620759e5d60fafb8ee0922b30e06bc6']);
    const trace = getCachedTrace('c620759e5d60fafb8ee0922b30e06bc6')!;
    expect(trace.spans).toHaveLength(4);
    expect(trace.rootSpans).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  }
);
