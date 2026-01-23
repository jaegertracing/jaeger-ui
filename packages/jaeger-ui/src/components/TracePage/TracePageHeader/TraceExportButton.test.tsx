// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TraceExportButton } from './TraceExportButton';
import * as traceExport from '../../../utils/trace-export';
import { IOtelTrace } from '../../../types/otel';
import { Microseconds } from '../../../types/units';

jest.mock('../../../utils/trace-export');

describe('TraceExportButton', () => {
  const mockTrace: IOtelTrace = {
    traceID: 'test-trace-123',
    traceName: 'Test Trace',
    startTime: 1000000 as unknown as Microseconds,
    endTime: 5000000 as unknown as Microseconds,
    duration: 4000000 as unknown as Microseconds,
    spans: [],
    spanMap: new Map(),
    rootSpans: [],
    services: [],
    orphanSpanCount: 0,
    tracePageTitle: 'Test Trace',
    traceEmoji: '',
    hasErrors: () => false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render export button', () => {
    render(<TraceExportButton trace={mockTrace} />);
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('should render with download icon', () => {
    const { container } = render(<TraceExportButton trace={mockTrace} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<TraceExportButton trace={mockTrace} disabled />);
    const button = screen.getByRole('button', { name: /export/i });
    expect(button).toBeDisabled();
  });

  it('should open dropdown menu on click', async () => {
    const user = userEvent.setup();
    render(<TraceExportButton trace={mockTrace} />);

    const button = screen.getByRole('button', { name: /export/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText('CSV')).toBeInTheDocument();
      expect(screen.getByText('HAR (HTTP Archive)')).toBeInTheDocument();
    });
  });

  it('should call exportAndDownloadTrace with JSON format', async () => {
    const user = userEvent.setup();
    const mockExport = jest.spyOn(traceExport, 'exportAndDownloadTrace');

    render(<TraceExportButton trace={mockTrace} />);

    const button = screen.getByRole('button', { name: /export/i });
    await user.click(button);

    const jsonOption = screen.getByText('JSON');
    await user.click(jsonOption);

    await waitFor(() => {
      expect(mockExport).toHaveBeenCalledWith(mockTrace, 'json');
    });
  });

  it('should call exportAndDownloadTrace with CSV format', async () => {
    const user = userEvent.setup();
    const mockExport = jest.spyOn(traceExport, 'exportAndDownloadTrace');

    render(<TraceExportButton trace={mockTrace} />);

    const button = screen.getByRole('button', { name: /export/i });
    await user.click(button);

    const csvOption = screen.getByText('CSV');
    await user.click(csvOption);

    await waitFor(() => {
      expect(mockExport).toHaveBeenCalledWith(mockTrace, 'csv');
    });
  });

  it('should call exportAndDownloadTrace with HAR format', async () => {
    const user = userEvent.setup();
    const mockExport = jest.spyOn(traceExport, 'exportAndDownloadTrace');

    render(<TraceExportButton trace={mockTrace} />);

    const button = screen.getByRole('button', { name: /export/i });
    await user.click(button);

    const harOption = screen.getByText('HAR (HTTP Archive)');
    await user.click(harOption);

    await waitFor(() => {
      expect(mockExport).toHaveBeenCalledWith(mockTrace, 'har');
    });
  });

  it('should handle export errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(traceExport, 'exportAndDownloadTrace').mockImplementation(() => {
      throw new Error('Export failed');
    });

    render(<TraceExportButton trace={mockTrace} />);

    const button = screen.getByRole('button', { name: /export/i });
    await user.click(button);

    const jsonOption = screen.getByText('JSON');
    await user.click(jsonOption);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('should have proper accessibility attributes', () => {
    render(<TraceExportButton trace={mockTrace} />);
    const button = screen.getByRole('button', { name: /export/i });
    expect(button).toHaveAttribute('aria-label', 'Export trace');
  });
});
