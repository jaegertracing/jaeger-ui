// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import SummaryFieldsSelect from './index';
import transformTraceData from '../../../../model/transform-trace-data';
import { IOtelTrace } from '../../../../types/otel';
import { SpanData, TraceData } from '../../../../types/trace';
import { buildAvailableFields } from '../../TraceTimelineViewer/summaryFieldsUtils';

const selectTestTrace: TraceData & { spans: SpanData[] } = {
  traceID: 'select-test',
  processes: { p1: { serviceName: 'svc', tags: [] } },
  spans: [
    {
      spanID: 's1',
      traceID: 'select-test',
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
      traceID: 'select-test',
      operationName: 'op',
      duration: 1,
      startTime: 2,
      processID: 'p1',
      references: [],
      tags: [{ key: 'alpha', value: '1' }],
    },
  ],
};

const trace = transformTraceData(selectTestTrace)!.asOtelTrace();
const availableFields = buildAvailableFields(trace);

const emptyTrace = {
  spans: [{ spanID: 's0', attributes: [] }],
} as unknown as IOtelTrace;
const emptyAvailableFields = buildAvailableFields(emptyTrace);

describe('SummaryFieldsSelect', () => {
  let onSelectedFieldsChange: (fields: string[]) => void;

  beforeEach(() => {
    onSelectedFieldsChange = vi.fn<(fields: string[]) => void>();
  });

  it('renders null when trace has no attribute keys', () => {
    const { container } = render(
      <SummaryFieldsSelect
        availableFields={emptyAvailableFields}
        selectedFields={[]}
        onSelectedFieldsChange={onSelectedFieldsChange}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders collapsed trigger with placeholder and count', () => {
    render(
      <SummaryFieldsSelect
        availableFields={availableFields}
        selectedFields={[]}
        onSelectedFieldsChange={onSelectedFieldsChange}
      />
    );
    expect(screen.getByTestId('summary-fields-select')).toBeInTheDocument();
    expect(screen.getByText('Select up to 3 fields...')).toBeInTheDocument();
    expect(screen.getByText('0/3')).toBeInTheDocument();
    expect(screen.queryByTestId('summary-fields-list')).not.toBeInTheDocument();
  });

  it('expands checkbox list inside the panel when trigger is clicked', async () => {
    render(
      <SummaryFieldsSelect
        availableFields={availableFields}
        selectedFields={[]}
        onSelectedFieldsChange={onSelectedFieldsChange}
      />
    );
    await userEvent.click(screen.getByTestId('summary-fields-trigger'));
    expect(screen.getByTestId('summary-fields-list')).toBeInTheDocument();
    expect(screen.getByText('alpha')).toBeInTheDocument();
  });

  it('shows summary label for multiple selected fields when collapsed', () => {
    render(
      <SummaryFieldsSelect
        availableFields={availableFields}
        selectedFields={['alpha', 'beta']}
        onSelectedFieldsChange={onSelectedFieldsChange}
      />
    );
    expect(screen.getByText('2 fields selected')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
  });

  it('adds a field when checkbox is checked', async () => {
    render(
      <SummaryFieldsSelect
        availableFields={availableFields}
        selectedFields={[]}
        onSelectedFieldsChange={onSelectedFieldsChange}
      />
    );
    await userEvent.click(screen.getByTestId('summary-fields-trigger'));
    fireEvent.click(screen.getByLabelText('Add alpha from summary fields'));
    expect(onSelectedFieldsChange).toHaveBeenCalledWith(['alpha']);
  });

  it('removes a field when checkbox is unchecked', async () => {
    render(
      <SummaryFieldsSelect
        availableFields={availableFields}
        selectedFields={['alpha']}
        onSelectedFieldsChange={onSelectedFieldsChange}
      />
    );
    await userEvent.click(screen.getByTestId('summary-fields-trigger'));
    fireEvent.click(screen.getByLabelText('Remove alpha from summary fields'));
    expect(onSelectedFieldsChange).toHaveBeenCalledWith([]);
  });

  it('does not add more than 3 fields', async () => {
    render(
      <SummaryFieldsSelect
        availableFields={availableFields}
        selectedFields={['alpha', 'beta', 'gamma']}
        onSelectedFieldsChange={onSelectedFieldsChange}
      />
    );
    await userEvent.click(screen.getByTestId('summary-fields-trigger'));
    const deltaCheckbox = screen.getByLabelText('Add delta from summary fields');
    expect(deltaCheckbox).toBeDisabled();
    fireEvent.click(deltaCheckbox);
    expect(onSelectedFieldsChange).not.toHaveBeenCalled();
  });

  it('filters fields by search query', async () => {
    render(
      <SummaryFieldsSelect
        availableFields={availableFields}
        selectedFields={[]}
        onSelectedFieldsChange={onSelectedFieldsChange}
      />
    );
    await userEvent.click(screen.getByTestId('summary-fields-trigger'));
    fireEvent.change(screen.getByPlaceholderText('Search attribute keys...'), { target: { value: 'alp' } });
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.queryByText('beta')).not.toBeInTheDocument();
  });
});
