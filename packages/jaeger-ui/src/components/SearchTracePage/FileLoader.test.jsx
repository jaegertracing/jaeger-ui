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
  const MockedDragger = ({ beforeUpload, children, ...props }) => {
    global.mockBeforeUpload = beforeUpload;
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

import FileLoader from './FileLoader';
import readJsonFile from '../../utils/readJsonFile';
import transformTraceData from '../../model/transform-trace-data';
import { traceToTraceSummary } from '../../model/trace-summary';
import { populateTraceCache } from '../../hooks/useTraceLoading';

describe('<FileLoader />', () => {
  const mockOnTracesLoaded = jest.fn();

  beforeEach(() => {
    mockOnTracesLoaded.mockClear();
    readJsonFile.mockClear();
    transformTraceData.mockClear();
    traceToTraceSummary.mockClear();
    populateTraceCache.mockClear();
    global.mockBeforeUpload = null;
  });

  it('renders the file upload area', () => {
    render(<FileLoader onTracesLoaded={mockOnTracesLoaded} />);
    expect(screen.getByText('Click or drag files to this area.')).toBeInTheDocument();
    expect(screen.getByText('JSON files containing one or more traces are supported.')).toBeInTheDocument();
  });

  it('beforeUpload returns false to prevent default upload', async () => {
    render(<FileLoader onTracesLoaded={mockOnTracesLoaded} />);
    const beforeUpload = global.mockBeforeUpload;
    expect(beforeUpload).toBeDefined();

    readJsonFile.mockResolvedValue({ data: [] });

    const file = new File(['{}'], 'trace.json', { type: 'application/json' });
    let result;
    await act(async () => {
      result = beforeUpload(file, [file]);
    });
    expect(result).toBe(false);
  });

  it('calls onTracesLoaded with summaries and raw traces after parsing', async () => {
    const rawTrace = { traceID: 'abc', spans: [] };
    const otelTrace = { traceID: 'abc' };
    const summary = { traceID: 'abc', traceName: 'svc: op' };

    readJsonFile.mockResolvedValue({ data: [rawTrace] });
    transformTraceData.mockReturnValue({ asOtelTrace: () => otelTrace });
    traceToTraceSummary.mockReturnValue(summary);

    render(<FileLoader onTracesLoaded={mockOnTracesLoaded} />);
    const beforeUpload = global.mockBeforeUpload;

    const file = new File(['{}'], 'trace.json', { type: 'application/json' });
    await act(async () => {
      beforeUpload(file, [file]);
    });

    expect(readJsonFile).toHaveBeenCalledWith({ file });
    expect(transformTraceData).toHaveBeenCalledWith(rawTrace);
    expect(populateTraceCache).toHaveBeenCalledWith(otelTrace);
    expect(traceToTraceSummary).toHaveBeenCalledWith(otelTrace);
    expect(mockOnTracesLoaded).toHaveBeenCalledWith([summary], [rawTrace]);
  });

  it('skips traces where transformTraceData returns null', async () => {
    const rawTrace = { traceID: 'bad' };
    readJsonFile.mockResolvedValue({ data: [rawTrace] });
    transformTraceData.mockReturnValue(null);

    render(<FileLoader onTracesLoaded={mockOnTracesLoaded} />);
    const beforeUpload = global.mockBeforeUpload;

    const file = new File(['{}'], 'trace.json', { type: 'application/json' });
    await act(async () => {
      beforeUpload(file, [file]);
    });

    expect(mockOnTracesLoaded).not.toHaveBeenCalled();
  });

  it('normalizes parsed.data single object into an array', async () => {
    const rawTrace = { traceID: 'abc', spans: [] };
    const otelTrace = { traceID: 'abc' };
    const summary = { traceID: 'abc', traceName: 'svc: op' };

    // parsed.data is a single object, not an array
    readJsonFile.mockResolvedValue({ data: rawTrace });
    transformTraceData.mockReturnValue({ asOtelTrace: () => otelTrace });
    traceToTraceSummary.mockReturnValue(summary);

    render(<FileLoader onTracesLoaded={mockOnTracesLoaded} />);
    const beforeUpload = global.mockBeforeUpload;

    const file = new File(['{}'], 'trace.json', { type: 'application/json' });
    await act(async () => {
      beforeUpload(file, [file]);
    });

    expect(transformTraceData).toHaveBeenCalledWith(rawTrace);
    expect(mockOnTracesLoaded).toHaveBeenCalledWith([summary], [rawTrace]);
  });

  it('processes each file independently (no N×N duplication)', async () => {
    const rawTrace1 = { traceID: 'a', spans: [] };
    const otelTrace1 = { traceID: 'a' };
    const summary1 = { traceID: 'a', traceName: 's1: op1' };

    readJsonFile.mockResolvedValue({ data: [rawTrace1] });
    transformTraceData.mockReturnValue({ asOtelTrace: () => otelTrace1 });
    traceToTraceSummary.mockReturnValue(summary1);

    render(<FileLoader onTracesLoaded={mockOnTracesLoaded} />);
    const beforeUpload = global.mockBeforeUpload;

    const file1 = new File(['{}'], 'trace1.json', { type: 'application/json' });
    const file2 = new File(['{}'], 'trace2.json', { type: 'application/json' });

    // Simulate Ant Design calling beforeUpload once per file
    await act(async () => {
      beforeUpload(file1, [file1, file2]);
    });
    await act(async () => {
      beforeUpload(file2, [file1, file2]);
    });

    // Each call processes only its own file
    expect(readJsonFile).toHaveBeenCalledTimes(2);
    expect(readJsonFile).toHaveBeenNthCalledWith(1, { file: file1 });
    expect(readJsonFile).toHaveBeenNthCalledWith(2, { file: file2 });
    expect(mockOnTracesLoaded).toHaveBeenCalledTimes(2);
  });

  it('normalizes a top-level array (no data wrapper)', async () => {
    const rawTrace = { traceID: 'abc', spans: [] };
    const otelTrace = { traceID: 'abc' };
    const summary = { traceID: 'abc', traceName: 'svc: op' };

    // parsed is a bare array, not wrapped in { data: [...] }
    readJsonFile.mockResolvedValue([rawTrace]);
    transformTraceData.mockReturnValue({ asOtelTrace: () => otelTrace });
    traceToTraceSummary.mockReturnValue(summary);

    render(<FileLoader onTracesLoaded={mockOnTracesLoaded} />);
    const beforeUpload = global.mockBeforeUpload;

    const file = new File(['[{}]'], 'trace.json', { type: 'application/json' });
    await act(async () => {
      beforeUpload(file, [file]);
    });

    expect(transformTraceData).toHaveBeenCalledWith(rawTrace);
    expect(mockOnTracesLoaded).toHaveBeenCalledWith([summary], [rawTrace]);
  });

  it('normalizes a top-level object with no data property', async () => {
    const rawTrace = { traceID: 'abc', spans: [] };
    const otelTrace = { traceID: 'abc' };
    const summary = { traceID: 'abc', traceName: 'svc: op' };

    // parsed is a plain object with no .data field
    readJsonFile.mockResolvedValue(rawTrace);
    transformTraceData.mockReturnValue({ asOtelTrace: () => otelTrace });
    traceToTraceSummary.mockReturnValue(summary);

    render(<FileLoader onTracesLoaded={mockOnTracesLoaded} />);
    const beforeUpload = global.mockBeforeUpload;

    const file = new File(['{}'], 'trace.json', { type: 'application/json' });
    await act(async () => {
      beforeUpload(file, [file]);
    });

    expect(transformTraceData).toHaveBeenCalledWith(rawTrace);
    expect(mockOnTracesLoaded).toHaveBeenCalledWith([summary], [rawTrace]);
  });

  it('reports per-trace transform errors via message.error and skips failed traces', async () => {
    const { message } = await import('antd');
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

    render(<FileLoader onTracesLoaded={mockOnTracesLoaded} />);
    const beforeUpload = global.mockBeforeUpload;

    const file = new File(['{}'], 'traces.json', { type: 'application/json' });
    await act(async () => {
      beforeUpload(file, [file]);
    });

    expect(message.error).toHaveBeenCalledWith(expect.stringContaining('1 trace'));
    expect(mockOnTracesLoaded).toHaveBeenCalledWith([summary], [goodTrace]);
  });

  it('uses plural "traces" in error message when multiple traces fail', async () => {
    const { message } = await import('antd');
    const badTrace1 = { traceID: 'bad1' };
    const badTrace2 = { traceID: 'bad2' };

    readJsonFile.mockResolvedValue({ data: [badTrace1, badTrace2] });
    transformTraceData.mockImplementation(() => {
      throw new Error('transform failed');
    });

    render(<FileLoader onTracesLoaded={mockOnTracesLoaded} />);
    const beforeUpload = global.mockBeforeUpload;

    const file = new File(['{}'], 'traces.json', { type: 'application/json' });
    await act(async () => {
      beforeUpload(file, [file]);
    });

    expect(message.error).toHaveBeenCalledWith(expect.stringContaining('2 traces'));
    expect(mockOnTracesLoaded).not.toHaveBeenCalled();
  });

  it('shows warning when file has no traces (empty data array)', async () => {
    const { message } = await import('antd');
    readJsonFile.mockResolvedValue({ data: [] });

    render(<FileLoader onTracesLoaded={mockOnTracesLoaded} />);
    const beforeUpload = global.mockBeforeUpload;

    const file = new File(['{}'], 'empty.json', { type: 'application/json' });
    await act(async () => {
      beforeUpload(file, [file]);
    });

    expect(message.warning).toHaveBeenCalledWith(expect.stringContaining('empty.json'));
    expect(mockOnTracesLoaded).not.toHaveBeenCalled();
  });

  it('reports file parse errors via message.error (Error instance)', async () => {
    const { message } = await import('antd');
    readJsonFile.mockRejectedValue(new Error('not valid JSON'));

    render(<FileLoader onTracesLoaded={mockOnTracesLoaded} />);
    const beforeUpload = global.mockBeforeUpload;

    const file = new File(['bad'], 'bad.json', { type: 'application/json' });
    await act(async () => {
      beforeUpload(file, [file]);
    });

    expect(message.error).toHaveBeenCalledWith(expect.stringContaining('bad.json'));
    expect(message.error).toHaveBeenCalledWith(expect.stringContaining('not valid JSON'));
    expect(mockOnTracesLoaded).not.toHaveBeenCalled();
  });

  it('reports file parse errors via message.error (non-Error rejection)', async () => {
    const { message } = await import('antd');
    readJsonFile.mockRejectedValue('invalid file content');

    render(<FileLoader onTracesLoaded={mockOnTracesLoaded} />);
    const beforeUpload = global.mockBeforeUpload;

    const file = new File(['bad'], 'bad.json', { type: 'application/json' });
    await act(async () => {
      beforeUpload(file, [file]);
    });

    expect(message.error).toHaveBeenCalledWith(expect.stringContaining('invalid file content'));
    expect(mockOnTracesLoaded).not.toHaveBeenCalled();
  });
});
