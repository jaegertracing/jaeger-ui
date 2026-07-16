// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('../../utils/readJsonFile', () => ({
  default: jest.fn(),
}));

vi.mock('../../model/transform-trace-data', () => ({
  default: jest.fn(),
}));

vi.mock('../../model/trace-summary', () => ({
  traceToTraceSummary: jest.fn(),
}));

vi.mock('../../hooks/useTraceLoading', () => ({
  populateTraceCache: jest.fn(),
}));

vi.mock('antd', async () => {
  const antd = await vi.importActual('antd');
  const { Upload } = antd;
  const MockedDragger = ({ beforeUpload, onRemove, children, ...props }) => {
    global.mockBeforeUpload = beforeUpload;
    global.mockOnRemove = onRemove;
    return (
      <div data-testid="upload-dragger" {...props}>
        {children}
      </div>
    );
  };

  return {
    ...antd,
    Upload: {
      ...Upload,
      Dragger: MockedDragger,
    },
    message: {
      error: jest.fn(),
      warning: jest.fn(),
      success: jest.fn(),
    },
  };
});

import FileLoader, { loadTracesFromFile } from './FileLoader';
import readJsonFile from '../../utils/readJsonFile';
import transformTraceData from '../../model/transform-trace-data';
import { traceToTraceSummary } from '../../model/trace-summary';
import { populateTraceCache } from '../../hooks/useTraceLoading';

const makeFile = (name = 'trace.json') => new File(['{}'], name, { type: 'application/json' });

beforeEach(() => {
  readJsonFile.mockClear();
  transformTraceData.mockClear();
  traceToTraceSummary.mockClear();
  populateTraceCache.mockClear();
  global.mockBeforeUpload = null;
  global.mockOnRemove = null;
});

describe('loadTracesFromFile', () => {
  it('returns summaries and raw traces for a valid { data: [...] } file', async () => {
    const rawTrace = { traceID: 'abc', spans: [] };
    const otelTrace = { traceID: 'abc' };
    const summary = { traceID: 'abc', traceName: 'svc: op' };

    readJsonFile.mockResolvedValue({ data: [rawTrace] });
    transformTraceData.mockReturnValue({ asOtelTrace: () => otelTrace });
    traceToTraceSummary.mockReturnValue(summary);

    const result = await loadTracesFromFile(makeFile());

    expect(transformTraceData).toHaveBeenCalledWith(rawTrace);
    expect(populateTraceCache).toHaveBeenCalledWith(otelTrace);
    expect(traceToTraceSummary).toHaveBeenCalledWith(otelTrace);
    expect(result).toEqual({ summaries: [summary], rawTraces: [rawTrace], errorCount: 0 });
  });

  it('normalizes a top-level array (no data wrapper)', async () => {
    const rawTrace = { traceID: 'abc', spans: [] };
    const otelTrace = { traceID: 'abc' };
    const summary = { traceID: 'abc', traceName: 'svc: op' };

    readJsonFile.mockResolvedValue([rawTrace]);
    transformTraceData.mockReturnValue({ asOtelTrace: () => otelTrace });
    traceToTraceSummary.mockReturnValue(summary);

    const result = await loadTracesFromFile(makeFile());

    expect(transformTraceData).toHaveBeenCalledWith(rawTrace);
    expect(result).toEqual({ summaries: [summary], rawTraces: [rawTrace], errorCount: 0 });
  });

  it('normalizes parsed.data single object into an array', async () => {
    const rawTrace = { traceID: 'abc', spans: [] };
    const otelTrace = { traceID: 'abc' };
    const summary = { traceID: 'abc', traceName: 'svc: op' };

    readJsonFile.mockResolvedValue({ data: rawTrace });
    transformTraceData.mockReturnValue({ asOtelTrace: () => otelTrace });
    traceToTraceSummary.mockReturnValue(summary);

    const result = await loadTracesFromFile(makeFile());

    expect(transformTraceData).toHaveBeenCalledWith(rawTrace);
    expect(result).toEqual({ summaries: [summary], rawTraces: [rawTrace], errorCount: 0 });
  });

  it('normalizes a top-level object with no data property', async () => {
    const rawTrace = { traceID: 'abc', spans: [] };
    const otelTrace = { traceID: 'abc' };
    const summary = { traceID: 'abc', traceName: 'svc: op' };

    readJsonFile.mockResolvedValue(rawTrace);
    transformTraceData.mockReturnValue({ asOtelTrace: () => otelTrace });
    traceToTraceSummary.mockReturnValue(summary);

    const result = await loadTracesFromFile(makeFile());

    expect(transformTraceData).toHaveBeenCalledWith(rawTrace);
    expect(result).toEqual({ summaries: [summary], rawTraces: [rawTrace], errorCount: 0 });
  });

  it('counts traces where transformTraceData returns null as errors', async () => {
    const rawTrace = { traceID: 'bad' };
    readJsonFile.mockResolvedValue({ data: [rawTrace] });
    transformTraceData.mockReturnValue(null);

    const result = await loadTracesFromFile(makeFile());

    expect(result).toEqual({ summaries: [], rawTraces: [], errorCount: 1 });
  });

  it('counts traces where transformTraceData throws as errors, continues with remaining traces', async () => {
    const badTrace = { traceID: 'bad' };
    const goodTrace = { traceID: 'good', spans: [] };
    const otelTrace = { traceID: 'good' };
    const summary = { traceID: 'good', traceName: 'svc: op' };

    readJsonFile.mockResolvedValue({ data: [badTrace, goodTrace] });
    transformTraceData
      .mockImplementationOnce(() => {
        throw new Error('transform failed');
      })
      .mockReturnValueOnce({ asOtelTrace: () => otelTrace });
    traceToTraceSummary.mockReturnValue(summary);

    const result = await loadTracesFromFile(makeFile());

    expect(result).toEqual({ summaries: [summary], rawTraces: [goodTrace], errorCount: 1 });
  });

  it('returns zero errorCount and empty summaries for an empty data array', async () => {
    readJsonFile.mockResolvedValue({ data: [] });

    const result = await loadTracesFromFile(makeFile());

    expect(result).toEqual({ summaries: [], rawTraces: [], errorCount: 0 });
  });
});

describe('<FileLoader />', () => {
  const mockOnTracesLoaded = jest.fn();
  const mockOnUploadedTracesClear = jest.fn();

  const renderFileLoader = () =>
    render(
      <FileLoader onTracesLoaded={mockOnTracesLoaded} onUploadedTracesClear={mockOnUploadedTracesClear} />
    );

  beforeEach(() => {
    mockOnTracesLoaded.mockClear();
    mockOnUploadedTracesClear.mockClear();
  });

  it('renders the file upload area', () => {
    renderFileLoader();
    expect(screen.getByText('Click or drag files to this area.')).toBeInTheDocument();
    expect(screen.getByText('JSON files containing one or more traces are supported.')).toBeInTheDocument();
  });

  it('beforeUpload returns false to prevent default upload', async () => {
    renderFileLoader();
    readJsonFile.mockResolvedValue({ data: [] });

    const file = makeFile();
    let result;
    await act(async () => {
      result = global.mockBeforeUpload(file);
    });
    expect(result).toBe(false);
  });

  it('calls onTracesLoaded after successful parse', async () => {
    const rawTrace = { traceID: 'abc', spans: [] };
    const otelTrace = { traceID: 'abc' };
    const summary = { traceID: 'abc', traceName: 'svc: op' };

    readJsonFile.mockResolvedValue({ data: [rawTrace] });
    transformTraceData.mockReturnValue({ asOtelTrace: () => otelTrace });
    traceToTraceSummary.mockReturnValue(summary);

    renderFileLoader();
    const file = makeFile();
    await act(async () => {
      global.mockBeforeUpload(file);
    });

    expect(mockOnTracesLoaded).toHaveBeenCalledWith([summary], [rawTrace]);
  });

  it('calls onUploadedTracesClear when a file is removed', () => {
    renderFileLoader();
    expect(global.mockOnRemove).toEqual(expect.any(Function));
    global.mockOnRemove({ name: 'trace.json' });
    expect(mockOnUploadedTracesClear).toHaveBeenCalledTimes(1);
  });

  it('does not call onTracesLoaded when remove invalidates an in-flight parse', async () => {
    const rawTrace = { traceID: 'abc', spans: [] };
    const otelTrace = { traceID: 'abc' };
    const summary = { traceID: 'abc', traceName: 'svc: op' };
    let resolveRead;
    readJsonFile.mockReturnValue(
      new Promise(resolve => {
        resolveRead = resolve;
      })
    );
    transformTraceData.mockReturnValue({ asOtelTrace: () => otelTrace });
    traceToTraceSummary.mockReturnValue(summary);

    renderFileLoader();
    const file = makeFile();
    global.mockBeforeUpload(file);
    global.mockOnRemove({ name: 'trace.json' });

    await act(async () => {
      resolveRead({ data: [rawTrace] });
    });

    expect(mockOnUploadedTracesClear).toHaveBeenCalledTimes(1);
    expect(mockOnTracesLoaded).not.toHaveBeenCalled();
  });

  it('shows error message when traces fail to parse', async () => {
    const { message } = await import('antd');
    readJsonFile.mockResolvedValue({ data: [{ traceID: 'bad' }, { traceID: 'bad2' }] });
    transformTraceData.mockImplementation(() => {
      throw new Error('fail');
    });

    renderFileLoader();
    await act(async () => {
      global.mockBeforeUpload(makeFile('traces.json'));
    });

    expect(message.error).toHaveBeenCalledWith(expect.stringContaining('2 traces'));
    expect(mockOnTracesLoaded).not.toHaveBeenCalled();
  });

  it('shows warning when file contains no traces', async () => {
    const { message } = await import('antd');
    readJsonFile.mockResolvedValue({ data: [] });

    renderFileLoader();
    await act(async () => {
      global.mockBeforeUpload(makeFile('empty.json'));
    });

    expect(message.warning).toHaveBeenCalledWith(expect.stringContaining('empty.json'));
    expect(mockOnTracesLoaded).not.toHaveBeenCalled();
  });

  it('shows error message when file cannot be parsed', async () => {
    const { message } = await import('antd');
    readJsonFile.mockRejectedValue(new Error('not valid JSON'));

    renderFileLoader();
    await act(async () => {
      global.mockBeforeUpload(makeFile('bad.json'));
    });

    expect(message.error).toHaveBeenCalledWith(expect.stringContaining('not valid JSON'));
    expect(mockOnTracesLoaded).not.toHaveBeenCalled();
  });

  it('each beforeUpload call processes only its own file (no N² duplication)', async () => {
    const rawTrace = { traceID: 'a', spans: [] };
    readJsonFile.mockResolvedValue({ data: [rawTrace] });
    transformTraceData.mockReturnValue({ asOtelTrace: () => ({ traceID: 'a' }) });
    traceToTraceSummary.mockReturnValue({ traceID: 'a' });

    renderFileLoader();
    const file1 = makeFile('trace1.json');
    const file2 = makeFile('trace2.json');

    await act(async () => {
      global.mockBeforeUpload(file1);
    });
    await act(async () => {
      global.mockBeforeUpload(file2);
    });

    expect(readJsonFile).toHaveBeenCalledTimes(2);
    expect(readJsonFile).toHaveBeenNthCalledWith(1, { file: file1 });
    expect(readJsonFile).toHaveBeenNthCalledWith(2, { file: file2 });
  });
});
