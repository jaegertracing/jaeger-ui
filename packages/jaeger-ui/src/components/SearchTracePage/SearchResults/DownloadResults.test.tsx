// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { message } from 'antd';
import { vi, describe, it, expect, afterEach } from 'vitest';

import DownloadResults, { createBlob } from './DownloadResults';
import readJsonFile from '../../../utils/readJsonFile';
import type { TraceSummary } from '../../../types/trace-summary';
import type { Microseconds } from '../../../types/units';

const mockFetchTrace = vi.fn();
vi.mock('../../../api/jaeger', () => ({
  default: {
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

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('DownloadResults', () => {
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
    mockFetchTrace.mockResolvedValue({ data: [{ traceID: 'a', spans: [] }] });
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(<DownloadResults traceSummaries={baseTraces} rawTraces={[]} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));
    });

    await waitFor(() => expect(createObjectURLSpy).toHaveBeenCalledTimes(1));
    expect(mockFetchTrace).toHaveBeenCalledWith('a');
    expect(mockFetchTrace).toHaveBeenCalledWith('b');
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
  });

  it('fetches only the missing trace when one raw is already present', async () => {
    mockFetchTrace.mockResolvedValue({ data: [{ traceID: 'b', spans: [] }] });
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    // rawTraces only has 'a'; 'b' must be fetched
    render(<DownloadResults traceSummaries={baseTraces} rawTraces={[baseRawTraces[0]]} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));
    });

    await waitFor(() => expect(createObjectURLSpy).toHaveBeenCalledTimes(1));
    expect(mockFetchTrace).not.toHaveBeenCalledWith('a');
    expect(mockFetchTrace).toHaveBeenCalledWith('b');
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
    mockFetchTrace.mockResolvedValue({ data: [{}] });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(<DownloadResults traceSummaries={baseTraces} rawTraces={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /Retrieving traces/i })).toBeDisabled());

    await act(async () => {
      resolveA?.({ data: [{}] });
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
    mockFetchTrace.mockResolvedValue({ data: [{}] });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(<DownloadResults traceSummaries={baseTraces} rawTraces={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));

    await waitFor(() => expect(screen.getByRole('progressbar')).toBeInTheDocument());
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');

    await act(async () => {
      resolveA?.({ data: [{}] });
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
      resolveB?.({ data: [{}] });
    });

    // Button remains idle; no progressbar visible
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(message.error).toHaveBeenCalledWith('Failed to retrieve traces: network error');
  });

  it('shows a warning message when some traces could not be retrieved', async () => {
    mockFetchTrace.mockResolvedValueOnce({ data: [{ traceID: 'a', spans: [] }] });
    // Second trace returns null (trace not found/empty)
    mockFetchTrace.mockResolvedValueOnce(null);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(<DownloadResults traceSummaries={baseTraces} rawTraces={[]} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));
    });

    await waitFor(() =>
      expect(message.warning).toHaveBeenCalledWith(
        '1 trace could not be retrieved and will be omitted from the download.'
      )
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
