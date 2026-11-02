// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach } from 'vitest';

import { createBlob, downloadTraces } from './download-traces';
import { validateOtelUpload } from './otel-upload';
import { GetTraceResponseSchema } from '../api/v3/schemas';

const TRACE_ID = '0123456789abcdef0123456789abcdef';
const SPAN_ID = '1122334455667788';

// A wire trace with the values a model-based exporter loses: a whole-number double, an int64
// beyond 2^53, non-finite doubles, and two spans sharing an ID (the parser renames the second
// one to `${SPAN_ID}_1` in the model only).
const wireTrace = {
  resourceSpans: [
    {
      resource: { attributes: [{ key: 'host.name', value: { stringValue: 'h1' } }] },
      scopeSpans: [
        {
          scope: { name: 'lib' },
          spans: ['a', 'b'].map(name => ({
            traceId: TRACE_ID,
            spanId: SPAN_ID,
            name,
            kind: 2,
            startTimeUnixNano: '1700000000000000000',
            endTimeUnixNano: '1700000000001000000',
            attributes: [
              { key: 'whole.double', value: { doubleValue: 2 } },
              { key: 'big.int', value: { intValue: '9007199254740993' } },
              { key: 'nan', value: { doubleValue: 'NaN' } },
              { key: 'inf', value: { doubleValue: '-Infinity' } },
            ],
          })),
        },
      ],
    },
  ],
};

async function roundTrip(traces: unknown[]) {
  const { data } = JSON.parse(await createBlob(traces).text());
  return data.map((trace: Record<string, unknown>) => validateOtelUpload(trace));
}

describe('createBlob', () => {
  it('writes a fetched trace that the upload path reads back unchanged', async () => {
    const fetched = GetTraceResponseSchema.parse({ result: wireTrace }).result;

    const [uploaded] = await roundTrip([fetched]);

    expect(uploaded).toEqual(fetched);
    const [first, second] = uploaded.resourceSpans[0].scopeSpans[0].spans;
    expect(second.spanId).toBe(SPAN_ID);
    expect(first.attributes).toEqual([
      { key: 'whole.double', value: { doubleValue: 2 } },
      { key: 'big.int', value: { intValue: '9007199254740993' } },
      { key: 'nan', value: { doubleValue: NaN } },
      { key: 'inf', value: { doubleValue: -Infinity } },
    ]);
  });

  it('writes non-finite doubles as proto3 strings', async () => {
    const fetched = GetTraceResponseSchema.parse({ result: wireTrace }).result;

    const text = await createBlob([fetched]).text();

    expect(text).toContain('"doubleValue":"NaN"');
    expect(text).toContain('"doubleValue":"-Infinity"');
    expect(text).not.toContain('null');
  });
});

describe('downloadTraces', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves the traces under the given file name and cleans up', () => {
    const createObjectURL = vi.fn(() => 'blob:trace');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadTraces([wireTrace], 'trace-1.json');

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toBe('trace-1.json');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:trace');
    expect(document.querySelector('a[download]')).toBeNull();
    vi.unstubAllGlobals();
  });
});
