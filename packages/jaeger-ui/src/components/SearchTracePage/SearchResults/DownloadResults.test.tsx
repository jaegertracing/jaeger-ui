// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, renderHook, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { message } from 'antd';
import { vi, describe, it, expect, afterEach } from 'vitest';

import DownloadResults, { createBlob } from './DownloadResults';
import readJsonFile from '../../../utils/readJsonFile';
import type { TraceSummary } from '../../../types/trace-summary';
import type { Microseconds } from '../../../types/units';
import { AppQueryClientProvider, queryClient } from '../../../query/app-query-client';
import { useUploadedTraces } from '../useUploadedTraces';
import { loadTracesFromFile } from '../FileLoader';
import { getCachedTrace } from '../../../hooks/useTraceLoading';
import numericUpload from '../../../utils/fixtures/otlp-upload-numeric.json';
import { GetTraceResponseSchema } from '../../../api/v3/schemas';
import { MAX_DETAIL_LENGTH } from '../../../utils/error-message';
import capture from '../../../api/v3/v3-trace-output.json';

const mockFetchTrace = vi.fn();
vi.mock('../../../api/v3/client', () => ({
  jaegerClient: {
    fetchTrace: (...args: unknown[]) => mockFetchTrace(...args),
  },
}));

// A real antd message renders into a React root of its own that Testing Library does not
// track, so nothing unmounts it and its animation and auto-dismiss timer keep committing
// updates after the test ends. React defers each commit's passive-effect flush to a
// scheduler callback that reads window.event, which throws once Vitest has torn the jsdom
// window down. FileLoader.test.jsx and ArchiveNotifier/index.test.jsx mock antd the same way.
vi.mock('antd', async () => {
  const antd = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...antd,
    message: {
      error: vi.fn(),
      warning: vi.fn(),
    },
  };
});

const baseTraces: TraceSummary[] = [
  {
    traceID: 'a',
    traceName: 'svc-a: op-a',
    rootServiceName: 'svc-a',
    rootOperationName: 'op-a',
    startTime: 0 as Microseconds,
    duration: 1000 as Microseconds,
    spanCount: 1,
    errorSpanCount: 0,
    orphanSpanCount: 0,
    services: [],
  },
  {
    traceID: 'b',
    traceName: 'svc-b: op-b',
    rootServiceName: 'svc-b',
    rootOperationName: 'op-b',
    startTime: 0 as Microseconds,
    duration: 1000 as Microseconds,
    spanCount: 1,
    errorSpanCount: 0,
    orphanSpanCount: 0,
    services: [],
  },
];

const baseRawTraces = [
  { traceID: 'a', spans: [], durationMicros: 1000, startTimeUnixMicros: 0, endTimeUnixMicros: 1000 },
  { traceID: 'b', spans: [], durationMicros: 1000, startTimeUnixMicros: 0, endTimeUnixMicros: 1000 },
];

// jaegerClient.fetchTrace resolves to the TracesData inside the /api/v3 response envelope.
const fetchedTraces = baseTraces.map(trace => ({
  resourceSpans: [{ scopeSpans: [{ spans: [{ traceId: trace.traceID }] }] }],
}));

// toTraceIdHex pads the short summary IDs to the 32-hex v3 request format.
const requestIdA = '0000000000000000000000000000000a';
const requestIdB = '0000000000000000000000000000000b';

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('DownloadResults', () => {
  it('fetches missing traces when cached upload documents have no usable trace ID', async () => {
    const raw = [null, {}, { resourceSpans: null }, { resourceSpans: [{}, { scopeSpans: [{ spans: [] }] }] }];
    mockFetchTrace.mockResolvedValueOnce(fetchedTraces[0]).mockResolvedValueOnce(fetchedTraces[1]);
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(<DownloadResults traceSummaries={baseTraces} rawTraces={raw} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));
    });

    expect(mockFetchTrace).toHaveBeenCalledTimes(2);
    expect(mockFetchTrace).toHaveBeenCalledWith(requestIdA);
    expect(mockFetchTrace).toHaveBeenCalledWith(requestIdB);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(await readJsonFile({ file: new File([blob], 'download.json') })).toEqual({ data: fetchedTraces });
  });

  it('downloads locally uploaded OTLP data without retrieving it from the backend', async () => {
    const raw = baseTraces.map(trace => ({
      resourceSpans: [{ scopeSpans: [{ spans: [{ traceId: trace.traceID }] }] }],
    }));
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    render(<DownloadResults traceSummaries={baseTraces} rawTraces={raw} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));
    });
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(mockFetchTrace).not.toHaveBeenCalled();
  });

  it('renders the button with correct label', () => {
    render(<DownloadResults traceSummaries={baseTraces} rawTraces={baseRawTraces} />);
    expect(screen.getByRole('button', { name: /Download Results/i })).toBeInTheDocument();
  });

  it('downloads blob from rawTraces when all are present locally', () => {
    const origBlob = global.Blob;
    class MockBlob {
      text: unknown[];
      options?: BlobPropertyBag;
      constructor(text: unknown[], options?: BlobPropertyBag) {
        this.text = text;
        this.options = options;
      }
    }
    (global as unknown as { Blob: unknown }).Blob = MockBlob;

    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(<DownloadResults traceSummaries={baseTraces} rawTraces={baseRawTraces} />);
    fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURLSpy.mock.calls[0][0] as unknown as MockBlob;
    expect(blobArg.text).toEqual([`{"data":${JSON.stringify(baseRawTraces)}}`]);
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);

    (global as unknown as { Blob: unknown }).Blob = origBlob;
  });

  it('fetches traces from backend when rawTraces is empty', async () => {
    mockFetchTrace.mockResolvedValue(fetchedTraces[0]);
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(<DownloadResults traceSummaries={baseTraces} rawTraces={[]} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));
    });

    await waitFor(() => expect(createObjectURLSpy).toHaveBeenCalledTimes(1));
    expect(mockFetchTrace).toHaveBeenCalledWith(requestIdA);
    expect(mockFetchTrace).toHaveBeenCalledWith(requestIdB);
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
  });

  it('fetches only the missing trace when one raw is already present', async () => {
    mockFetchTrace.mockResolvedValue(fetchedTraces[1]);
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    // rawTraces only has 'a'; 'b' must be fetched
    render(<DownloadResults traceSummaries={baseTraces} rawTraces={[baseRawTraces[0]]} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));
    });

    await waitFor(() => expect(createObjectURLSpy).toHaveBeenCalledTimes(1));
    expect(mockFetchTrace).not.toHaveBeenCalledWith(requestIdA);
    expect(mockFetchTrace).toHaveBeenCalledWith(requestIdB);
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
  });

  it('shows "Retrieving traces…" and disables button while fetching', async () => {
    let resolveA: ((value: unknown) => void) | undefined;
    mockFetchTrace.mockImplementationOnce(
      () =>
        new Promise(r => {
          resolveA = r;
        })
    );
    mockFetchTrace.mockResolvedValue(fetchedTraces[1]);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(<DownloadResults traceSummaries={baseTraces} rawTraces={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /Retrieving traces/i })).toBeDisabled());

    await act(async () => {
      resolveA?.(fetchedTraces[0]);
    });
    await waitFor(() => expect(screen.getByRole('button', { name: /Download Results/i })).not.toBeDisabled());
  });

  it('renders progressbar with ARIA attributes while fetching', async () => {
    let resolveA: ((value: unknown) => void) | undefined;
    mockFetchTrace.mockImplementationOnce(
      () =>
        new Promise(r => {
          resolveA = r;
        })
    );
    mockFetchTrace.mockResolvedValue(fetchedTraces[1]);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(<DownloadResults traceSummaries={baseTraces} rawTraces={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));

    await waitFor(() => expect(screen.getByRole('progressbar')).toBeInTheDocument());
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');

    await act(async () => {
      resolveA?.(fetchedTraces[0]);
    });
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
  });

  it('does not call setProgress after fetch errors (cancelled flag)', async () => {
    // First fetch throws; the second is slow. After the error the cancelled flag
    // must prevent the slow worker from updating progress state.
    let resolveB: ((value: unknown) => void) | undefined;
    mockFetchTrace.mockRejectedValueOnce(new Error('network error'));
    mockFetchTrace.mockImplementationOnce(
      () =>
        new Promise(r => {
          resolveB = r;
        })
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(<DownloadResults traceSummaries={baseTraces} rawTraces={[]} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));
    });

    // After the error the button should be back to idle (not "Retrieving traces…")
    await waitFor(() => expect(screen.getByRole('button', { name: /Download Results/i })).not.toBeDisabled());

    // Resolve the late fetch — should not crash or update state
    await act(async () => {
      resolveB?.(fetchedTraces[1]);
    });

    // Button remains idle; no progressbar visible
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(message.error).toHaveBeenCalledWith('Failed to retrieve traces: network error');
  });

  it.each([
    ['the server message', 'trace not found', '{ "message": "trace not found", "code": 5 }'],
    ['the nested server message', 'trace not found', '{ "error": { "message": "trace not found" } }'],
    ['JSON without a message', '{ "code": 5 }'],
    ['a non-string message', '{ "message": 404 }'],
    ['an empty message', '{ "message": "" }'],
    ['a blank message', '{ "message": "  " }'],
    ['a JSON primitive', 'null'],
    ['invalid JSON', '{ "message":'],
    ['a response at the length limit', 'x'.repeat(MAX_DETAIL_LENGTH)],
    ['a truncated long server response', `${'x'.repeat(MAX_DETAIL_LENGTH - 3)}...`, 'x'.repeat(2000)],
    [
      'a truncated long message',
      `${'x'.repeat(MAX_DETAIL_LENGTH - 3)}...`,
      JSON.stringify({ message: 'x'.repeat(2000) }),
    ],
  ])('adds %s to the error toast', async (_, shown, httpBody = shown) => {
    const error = Object.assign(new Error(`Failed to fetch trace ${requestIdA}: 404 Not Found`), {
      httpBody,
    });
    mockFetchTrace.mockRejectedValueOnce(error);

    render(<DownloadResults traceSummaries={[baseTraces[0]]} rawTraces={[]} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));
    });

    expect(message.error).toHaveBeenCalledWith(
      `Failed to retrieve traces: Failed to fetch trace ${requestIdA}: 404 Not Found: ${shown}`
    );
  });

  it('blob can be read back as JSON', async () => {
    const content = `{"data":${JSON.stringify(baseRawTraces)}}`;
    const blob = createBlob(baseRawTraces);
    const blobText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    const file = new File([blobText], 'test.json');
    const contentFile = await readJsonFile({ file });
    expect(JSON.stringify(contentFile)).toBe(content);
  });
});

describe('uploaded trace registry and offline downloads', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it.each(['one file', 'separate files'])(
    'preserves distinct OTLP traces from %s through the registry and download/re-upload',
    async mode => {
      const second = structuredClone(numericUpload);
      second.resourceSpans[0].scopeSpans[0].spans[0].traceId = '1234567890abcdef1234567890abcdef';
      const documents = [numericUpload, second];
      const { result } = renderHook(() => useUploadedTraces(), { wrapper: AppQueryClientProvider });
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Backend offline'));
      mockFetchTrace.mockRejectedValue(new Error('Backend offline'));
      const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      for (const input of mode === 'one file' ? [documents] : documents) {
        const loaded = await loadTracesFromFile(new File([JSON.stringify(input)], 'upload.json'));
        expect(loaded.errorCount).toBe(0);
        act(() => result.current.handleTracesLoaded(loaded.summaries, loaded.rawTraces));
      }
      await waitFor(() => {
        expect(result.current.uploadedSummaries).toHaveLength(2);
        expect(result.current.uploadedRawTraces).toHaveLength(2);
      });
      // Re-uploading either trace must not add another registry entry.
      const duplicate = await loadTracesFromFile(new File([JSON.stringify(second)], 'duplicate.json'));
      act(() => result.current.handleTracesLoaded(duplicate.summaries, duplicate.rawTraces));
      await waitFor(() => expect(result.current.uploadedRawTraces).toHaveLength(2));

      render(
        <DownloadResults
          traceSummaries={result.current.uploadedSummaries}
          rawTraces={result.current.uploadedRawTraces}
        />
      );
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));
      });
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const blob = createObjectURL.mock.calls[0][0] as Blob;
      const exported = await readJsonFile({ file: new File([blob], 'download.json') });
      expect(exported).toEqual({ data: result.current.uploadedRawTraces });
      queryClient.clear();
      const roundTrip = await loadTracesFromFile(new File([blob], 'download.json'));
      expect(roundTrip.errorCount).toBe(0);
      expect(roundTrip.summaries.map(summary => summary.traceID)).toEqual(
        documents.map(document => document.resourceSpans[0].scopeSpans[0].spans[0].traceId)
      );
      expect(mockFetchTrace).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    }
  );

  it('re-uploads fetched OTLP traces and legacy uploads from one download', async () => {
    const fetched = GetTraceResponseSchema.parse(capture).result;
    const fetchedId = capture.result.resourceSpans[0].scopeSpans[0].spans[0].traceId;
    const legacyId = '0123456789abcdef';
    const legacyUpload = {
      traceID: legacyId,
      spans: [
        {
          traceID: legacyId,
          spanID: '1111111111111111',
          operationName: 'legacy-operation',
          references: [],
          startTime: 1000,
          duration: 10,
          tags: [],
          logs: [],
          processID: 'p1',
        },
      ],
      processes: { p1: { serviceName: 'svc', tags: [] } },
    };
    const legacy = await loadTracesFromFile(new File([JSON.stringify(legacyUpload)], 'legacy.json'));
    expect(legacy.errorCount).toBe(0);
    mockFetchTrace.mockResolvedValue(fetched);
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(
      <DownloadResults
        traceSummaries={[{ ...baseTraces[0], traceID: fetchedId }, ...legacy.summaries]}
        rawTraces={legacy.rawTraces}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));
    });

    expect(mockFetchTrace).toHaveBeenCalledTimes(1);
    expect(mockFetchTrace).toHaveBeenCalledWith(fetchedId);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(await readJsonFile({ file: new File([blob], 'download.json') })).toEqual({
      data: [fetched, ...legacy.rawTraces],
    });
    queryClient.clear();
    const roundTrip = await loadTracesFromFile(new File([blob], 'download.json'));
    expect(roundTrip.errorCount).toBe(0);
    expect(roundTrip.summaries.map(summary => [summary.traceID, summary.spanCount])).toEqual([
      [fetchedId, 3],
      [legacyId, 1],
    ]);
  });

  it('re-uploads fetched non-finite double attributes as proto3 strings', async () => {
    const response = structuredClone(capture);
    const fetchedId = response.result.resourceSpans[0].scopeSpans[0].spans[0].traceId;
    (response.result.resourceSpans[0].scopeSpans[0].spans[0].attributes as unknown[]).push(
      { key: 'nan', value: { doubleValue: 'NaN' } },
      { key: 'infinity', value: { doubleValue: 'Infinity' } },
      { key: 'negative-infinity', value: { doubleValue: '-Infinity' } },
      { key: 'array', value: { arrayValue: { values: [{ doubleValue: 'NaN' }] } } },
      {
        key: 'kvlist',
        value: { kvlistValue: { values: [{ key: 'nested', value: { doubleValue: 'Infinity' } }] } },
      }
    );
    mockFetchTrace.mockResolvedValue(GetTraceResponseSchema.parse(response).result);
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(<DownloadResults traceSummaries={[{ ...baseTraces[0], traceID: fetchedId }]} rawTraces={[]} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));
    });

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(await readJsonFile({ file: new File([blob], 'download.json') })).toEqual({
      data: [response.result],
    });
    queryClient.clear();
    const roundTrip = await loadTracesFromFile(new File([blob], 'download.json'));
    expect(roundTrip.errorCount).toBe(0);
    expect(roundTrip.summaries.map(summary => [summary.traceID, summary.spanCount])).toEqual([
      [fetchedId, 3],
    ]);
  });

  it('keeps the last upload of a trace ID in the cache, summaries, and download', async () => {
    const traceId = numericUpload.resourceSpans[0].scopeSpans[0].spans[0].traceId;
    const updated = structuredClone(numericUpload);
    updated.resourceSpans[0].scopeSpans[0].spans[0].name = 'updated-operation';
    const { result } = renderHook(() => useUploadedTraces(), { wrapper: AppQueryClientProvider });
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const first = await loadTracesFromFile(new File([JSON.stringify(numericUpload)], 'first.json'));
    act(() => result.current.handleTracesLoaded(first.summaries, first.rawTraces));
    const second = await loadTracesFromFile(new File([JSON.stringify(updated)], 'second.json'));
    act(() => result.current.handleTracesLoaded(second.summaries, second.rawTraces));

    expect(first.summaries).not.toEqual(second.summaries);
    await waitFor(() => {
      expect(result.current.uploadedSummaries).toEqual(second.summaries);
      expect(result.current.uploadedRawTraces).toEqual(second.rawTraces);
    });
    expect(getCachedTrace(traceId)!.spans[0].name).toBe('updated-operation');

    render(
      <DownloadResults
        traceSummaries={result.current.uploadedSummaries}
        rawTraces={result.current.uploadedRawTraces}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));
    });
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    queryClient.clear();
    const roundTrip = await loadTracesFromFile(new File([blob], 'download.json'));
    expect(roundTrip.summaries).toEqual(second.summaries);
    expect(getCachedTrace(traceId)!.spans[0].name).toBe('updated-operation');
  });

  it('replaces a re-uploaded trace in its original position', async () => {
    const other = structuredClone(numericUpload);
    other.resourceSpans[0].scopeSpans[0].spans[0].traceId = '1234567890abcdef1234567890abcdef';
    const updated = structuredClone(numericUpload);
    updated.resourceSpans[0].scopeSpans[0].spans[0].name = 'updated-operation';
    const load = (input: unknown) => loadTracesFromFile(new File([JSON.stringify(input)], 'upload.json'));
    const a = await load(numericUpload);
    const b = await load(other);
    const aUpdated = await load(updated);
    expect(aUpdated.rawTraces).not.toEqual(a.rawTraces);
    const { result } = renderHook(() => useUploadedTraces(), { wrapper: AppQueryClientProvider });

    act(() => result.current.handleTracesLoaded(a.summaries, a.rawTraces));
    act(() => result.current.handleTracesLoaded(b.summaries, b.rawTraces));
    act(() => result.current.handleTracesLoaded(aUpdated.summaries, aUpdated.rawTraces));

    await waitFor(() => {
      expect(result.current.uploadedSummaries).toEqual([...aUpdated.summaries, ...b.summaries]);
      expect(result.current.uploadedRawTraces).toEqual([...aUpdated.rawTraces, ...b.rawTraces]);
    });
  });

  it('keeps the last legacy document when one file repeats a trace ID', async () => {
    const traceId = '0123456789abcdef';
    const legacyTrace = (operationName: string) => ({
      traceID: traceId,
      spans: [
        {
          traceID: traceId,
          spanID: '1111111111111111',
          operationName,
          references: [],
          startTime: 1000,
          duration: 10,
          tags: [],
          logs: [],
          processID: 'p1',
        },
      ],
      processes: { p1: { serviceName: 'svc', tags: [] } },
    });
    const upload = { data: [legacyTrace('first-operation'), legacyTrace('last-operation')] };
    const loaded = await loadTracesFromFile(new File([JSON.stringify(upload)], 'repeated.json'));
    expect(loaded.errorCount).toBe(0);
    const { result } = renderHook(() => useUploadedTraces(), { wrapper: AppQueryClientProvider });
    act(() => result.current.handleTracesLoaded(loaded.summaries, loaded.rawTraces));

    await waitFor(() => {
      expect(result.current.uploadedSummaries).toEqual([loaded.summaries[1]]);
      expect(result.current.uploadedRawTraces).toEqual([loaded.rawTraces[1]]);
    });
    expect(getCachedTrace(traceId)!.spans[0].name).toBe('last-operation');
  });

  it('deduplicates legacy and OTLP raw documents by their own trace IDs', async () => {
    const loaded = await loadTracesFromFile(new File([JSON.stringify(numericUpload)], 'upload.json'));
    const legacy = { ...baseRawTraces[0], result: { unrelated: true } };
    const { result } = renderHook(() => useUploadedTraces(), { wrapper: AppQueryClientProvider });
    act(() => {
      result.current.handleTracesLoaded([...loaded.summaries, baseTraces[0]], [...loaded.rawTraces, legacy]);
      result.current.handleTracesLoaded(
        [...loaded.summaries, baseTraces[0]],
        [...loaded.rawTraces, legacy, {}]
      );
    });
    await waitFor(() => {
      expect(result.current.uploadedSummaries).toHaveLength(2);
      expect(result.current.uploadedRawTraces).toEqual([...loaded.rawTraces, legacy]);
    });
  });
});
