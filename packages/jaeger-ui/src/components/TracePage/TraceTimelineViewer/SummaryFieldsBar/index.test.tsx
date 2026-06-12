// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import SummaryFieldsBar from './index';
import transformTraceData from '../../../../model/transform-trace-data';
import { IOtelTrace } from '../../../../types/otel';
import { SpanData, TraceData } from '../../../../types/trace';

const barTestTrace: TraceData & { spans: SpanData[] } = {
  traceID: 'bar-test',
  processes: { p1: { serviceName: 'svc', tags: [] } },
  spans: [
    {
      spanID: 's1',
      traceID: 'bar-test',
      operationName: 'op',
      duration: 1,
      startTime: 1,
      processID: 'p1',
      references: [],
      tags: [
        { key: 'alpha', value: '1' },
        { key: 'beta', value: '2' },
        { key: 'gamma', value: '3' },
        { key: 'delta', value: '4' },
      ],
    },
    {
      spanID: 's2',
      traceID: 'bar-test',
      operationName: 'op',
      duration: 1,
      startTime: 2,
      processID: 'p1',
      references: [],
      tags: [{ key: 'alpha', value: '1' }],
    },
  ],
};

const trace = transformTraceData(barTestTrace)!.asOtelTrace();

const emptyTrace = {
  spans: [{ spanID: 's0', attributes: [] }],
} as unknown as IOtelTrace;

describe('SummaryFieldsBar', () => {
  let onSelectedFieldsChange: (fields: string[]) => void;

  beforeEach(() => {
    onSelectedFieldsChange = vi.fn<(fields: string[]) => void>();
  });

  it('renders null when trace has no attribute keys', () => {
    const { container } = render(
      <SummaryFieldsBar
        trace={emptyTrace}
        selectedFields={[]}
        onSelectedFieldsChange={onSelectedFieldsChange}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders bar with field checkboxes and count tag', () => {
    render(
      <SummaryFieldsBar trace={trace} selectedFields={[]} onSelectedFieldsChange={onSelectedFieldsChange} />
    );
    expect(screen.getByTestId('summary-fields-bar')).toBeInTheDocument();
    expect(screen.getByText('0 of 3')).toBeInTheDocument();
    expect(screen.getByText('alpha')).toBeInTheDocument();
  });

  it('adds a field when checkbox is checked', () => {
    render(
      <SummaryFieldsBar trace={trace} selectedFields={[]} onSelectedFieldsChange={onSelectedFieldsChange} />
    );
    fireEvent.click(screen.getByLabelText('Add alpha from summary fields'));
    expect(onSelectedFieldsChange).toHaveBeenCalledWith(['alpha']);
  });

  it('removes a field when checkbox is unchecked', () => {
    render(
      <SummaryFieldsBar
        trace={trace}
        selectedFields={['alpha']}
        onSelectedFieldsChange={onSelectedFieldsChange}
      />
    );
    fireEvent.click(screen.getByLabelText('Remove alpha from summary fields'));
    expect(onSelectedFieldsChange).toHaveBeenCalledWith([]);
  });

  it('does not add more than 3 fields', () => {
    render(
      <SummaryFieldsBar
        trace={trace}
        selectedFields={['alpha', 'beta', 'gamma']}
        onSelectedFieldsChange={onSelectedFieldsChange}
      />
    );
    const deltaCheckbox = screen.getByLabelText('Add delta from summary fields');
    expect(deltaCheckbox).toBeDisabled();
    fireEvent.click(deltaCheckbox);
    expect(onSelectedFieldsChange).not.toHaveBeenCalled();
  });

  it('filters fields by search query', () => {
    render(
      <SummaryFieldsBar trace={trace} selectedFields={[]} onSelectedFieldsChange={onSelectedFieldsChange} />
    );
    fireEvent.change(screen.getByPlaceholderText('Search attribute keys...'), { target: { value: 'alp' } });
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.queryByText('beta')).not.toBeInTheDocument();
  });
});
