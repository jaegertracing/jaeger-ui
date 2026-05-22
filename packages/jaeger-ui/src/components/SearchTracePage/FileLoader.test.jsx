// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
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

  it('beforeUpload returns false to prevent default upload', () => {
    render(<FileLoader onTracesLoaded={mockOnTracesLoaded} />);
    const beforeUpload = global.mockBeforeUpload;
    expect(beforeUpload).toBeDefined();

    readJsonFile.mockResolvedValue({ data: [] });

    const file = new File(['{}'], 'trace.json', { type: 'application/json' });
    const result = beforeUpload(file, [file]);
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
    beforeUpload(file, [file]);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 0));

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
    beforeUpload(file, [file]);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockOnTracesLoaded).toHaveBeenCalledWith([], []);
  });

  it('handles multiple files being uploaded at once', async () => {
    const rawTrace1 = { traceID: 'a', spans: [] };
    const rawTrace2 = { traceID: 'b', spans: [] };
    const otelTrace1 = { traceID: 'a' };
    const otelTrace2 = { traceID: 'b' };
    const summary1 = { traceID: 'a', traceName: 's1: op1' };
    const summary2 = { traceID: 'b', traceName: 's2: op2' };

    readJsonFile.mockResolvedValueOnce({ data: [rawTrace1] }).mockResolvedValueOnce({ data: [rawTrace2] });
    transformTraceData.mockImplementation(raw => ({
      asOtelTrace: () => (raw.traceID === 'a' ? otelTrace1 : otelTrace2),
    }));
    traceToTraceSummary.mockImplementation(otel => (otel.traceID === 'a' ? summary1 : summary2));

    render(<FileLoader onTracesLoaded={mockOnTracesLoaded} />);
    const beforeUpload = global.mockBeforeUpload;

    const file1 = new File(['{}'], 'trace1.json', { type: 'application/json' });
    const file2 = new File(['{}'], 'trace2.json', { type: 'application/json' });
    beforeUpload(file1, [file1, file2]);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockOnTracesLoaded).toHaveBeenCalledTimes(2);
  });
});
