// Copyright (c) 2023 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import DownloadResults, { createBlob } from './DownloadResults';
import readJsonFile from '../../../utils/readJsonFile';

const mockFetchTrace = jest.fn();
vi.mock('../../../api/jaeger', () => ({ default: { fetchTrace: (...args) => mockFetchTrace(...args) } }));

const baseTraces = [
  {
    traceID: 'a',
    traceName: 'svc-a: op-a',
    rootServiceName: 'svc-a',
    rootOperationName: 'op-a',
    startTime: 0,
    duration: 1000,
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
    startTime: 0,
    duration: 1000,
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
});

describe('DownloadResults', () => {
  it('renders the button with correct label', () => {
    render(<DownloadResults traceSummaries={baseTraces} rawTraces={baseRawTraces} />);
    expect(screen.getByRole('button', { name: /Download Results/i })).toBeInTheDocument();
  });

  it('downloads blob from rawTraces when they are present', () => {
    const orig = global.Blob;
    global.Blob = class {
      constructor(text, options) {
        this.text = text;
        this.options = options;
      }
    };
    URL.createObjectURL = jest.fn(() => 'blob://url');
    URL.revokeObjectURL = jest.fn();

    render(<DownloadResults traceSummaries={baseTraces} rawTraces={baseRawTraces} />);
    fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = URL.createObjectURL.mock.calls[0][0];
    expect(blobArg.text).toEqual([`{"data":${JSON.stringify(baseRawTraces)}}`]);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);

    global.Blob = orig;
  });

  it('fetches traces from backend when rawTraces is empty', async () => {
    mockFetchTrace.mockResolvedValue({ data: [{ traceID: 'a', spans: [] }] });
    URL.createObjectURL = jest.fn(() => 'blob://url');
    URL.revokeObjectURL = jest.fn();

    render(<DownloadResults traceSummaries={baseTraces} rawTraces={[]} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));
    });

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
    expect(mockFetchTrace).toHaveBeenCalledWith('a');
    expect(mockFetchTrace).toHaveBeenCalledWith('b');
  });

  it('shows "Retrieving traces…" and disables button while fetching', async () => {
    let resolveA;
    mockFetchTrace.mockImplementationOnce(() => new Promise(r => (resolveA = r)));
    mockFetchTrace.mockResolvedValue({ data: [{}] });
    URL.createObjectURL = jest.fn(() => 'blob://url');
    URL.revokeObjectURL = jest.fn();

    render(<DownloadResults traceSummaries={baseTraces} rawTraces={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Download Results/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /Retrieving traces/i })).toBeDisabled());

    await act(async () => {
      resolveA({ data: [{}] });
    });
    await waitFor(() => expect(screen.getByRole('button', { name: /Download Results/i })).not.toBeDisabled());
  });

  it('blob can be read back as JSON', async () => {
    const content = `{"data":${JSON.stringify(baseRawTraces)}}`;
    const blob = createBlob(baseRawTraces);
    const blobText = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    const file = new File([blobText], 'test.json');
    const contentFile = await readJsonFile({ file });
    expect(JSON.stringify(contentFile)).toBe(content);
  });
});
