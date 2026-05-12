// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

vi.mock('./tableValues', () => ({
  getServiceName: vi.fn(() => 'service.name'),
  getColumnValues: vi.fn((name, _trace, _useOtel) => [{ name: `cols-for-${name}` }]),
  getColumnValuesSecondDropdown: vi.fn((rows, n1, n2) => [{ name: `sub-${n1}-${n2}-from-${rows.length}` }]),
}));

vi.mock('./generateDropdownValue', () => ({
  generateDropdownValue: vi.fn(() => ['service.name', 'operation', 'kind']),
  generateSecondDropdownValue: vi.fn(() => ['operation', 'kind']),
}));

import TraceStatisticsHeader from './TraceStatisticsHeader';
import { getColumnValues, getColumnValuesSecondDropdown } from './tableValues';

const baseProps = () => ({
  trace: { traceID: 't', spans: [] },
  tableValue: [{ name: 'a' }, { name: 'b' }],
  wholeTable: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
  handler: vi.fn(),
  useOtelTerms: false,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('<TraceStatisticsHeader>', () => {
  it('renders the three select boxes and the checkbox', () => {
    const props = baseProps();
    render(<TraceStatisticsHeader {...props} />);
    expect(screen.getByText('Group By:')).toBeInTheDocument();
    expect(screen.getByText('Sub-Group:')).toBeInTheDocument();
    expect(screen.getByText('Color by:')).toBeInTheDocument();
  });

  it('calls handler once on mount with the initial service name', () => {
    const props = baseProps();
    render(<TraceStatisticsHeader {...props} />);
    expect(props.handler).toHaveBeenCalledTimes(1);
    const [tableArg, wholeArg, name1, name2, colorBy] = props.handler.mock.calls[0];
    expect(name1).toBe('service.name');
    expect(name2).toBeNull();
    expect(colorBy).toBe('count');
    expect(tableArg).toEqual([{ name: 'cols-for-service.name' }]);
    expect(wholeArg).toEqual([{ name: 'cols-for-service.name' }]);
  });

  it('does not re-invoke the on-mount handler when props change', () => {
    const props = baseProps();
    const { rerender } = render(<TraceStatisticsHeader {...props} />);
    expect(props.handler).toHaveBeenCalledTimes(1);
    rerender(<TraceStatisticsHeader {...props} useOtelTerms />);
    expect(props.handler).toHaveBeenCalledTimes(1);
  });

  it('calls handler with the new value when the first dropdown changes, resetting the second', async () => {
    const props = baseProps();
    render(<TraceStatisticsHeader {...props} />);
    props.handler.mockClear();

    const groupBy = screen.getAllByRole('combobox')[0];
    await userEvent.click(groupBy);
    fireEvent.click(await screen.findByText('operation'));

    expect(props.handler).toHaveBeenCalledWith(
      [{ name: 'cols-for-operation' }],
      [{ name: 'cols-for-operation' }],
      'operation',
      null,
      'count'
    );
    expect(getColumnValues).toHaveBeenCalledWith('operation', props.trace, props.useOtelTerms);
  });

  it('calls handler with both names when the second dropdown changes', async () => {
    const props = baseProps();
    render(<TraceStatisticsHeader {...props} />);
    props.handler.mockClear();

    const subGroup = screen.getAllByRole('combobox')[1];
    await userEvent.click(subGroup);
    fireEvent.click(await screen.findByText('kind'));

    expect(props.handler).toHaveBeenLastCalledWith(
      expect.any(Array),
      expect.any(Array),
      'service.name',
      'kind',
      'count'
    );
    expect(getColumnValuesSecondDropdown).toHaveBeenCalledWith(
      props.tableValue,
      'service.name',
      'kind',
      props.trace,
      props.useOtelTerms
    );
  });

  it('calls handler when the third dropdown changes the color metric', async () => {
    const props = baseProps();
    render(<TraceStatisticsHeader {...props} />);
    props.handler.mockClear();

    const colorBy = screen.getAllByRole('combobox')[2];
    await userEvent.click(colorBy);
    fireEvent.click(await screen.findByText('ST in Duration'));

    expect(props.handler).toHaveBeenLastCalledWith(
      expect.any(Array),
      expect.any(Array),
      'service.name',
      null,
      'percent'
    );
  });

  it('calls handler when the checkbox toggles', () => {
    const props = baseProps();
    const { container } = render(<TraceStatisticsHeader {...props} />);
    props.handler.mockClear();

    const checkbox = container.querySelector('.TraceStatisticsHeader--checkbox input');
    fireEvent.click(checkbox);

    expect(props.handler).toHaveBeenCalledTimes(1);
    expect(props.handler).toHaveBeenLastCalledWith(
      expect.any(Array),
      expect.any(Array),
      'service.name',
      null,
      ''
    );
  });

  it('calls handler with a null sub-group when the second dropdown is cleared', async () => {
    const props = baseProps();
    const { container } = render(<TraceStatisticsHeader {...props} />);

    // populate the second dropdown so the clear icon appears
    const subGroup = screen.getAllByRole('combobox')[1];
    await userEvent.click(subGroup);
    fireEvent.click(await screen.findByText('kind'));

    props.handler.mockClear();

    const clearIcons = container.querySelectorAll('.ant-select-clear');
    expect(clearIcons.length).toBeGreaterThan(0);
    fireEvent.mouseDown(clearIcons[0]);
    fireEvent.click(clearIcons[0]);

    expect(props.handler).toHaveBeenCalledTimes(1);
    expect(props.handler).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      'service.name',
      null,
      'count'
    );
    const subGroupArgs = props.handler.mock.calls.map(call => call[3]);
    expect(subGroupArgs).not.toContain(undefined);
    expect(getColumnValues).toHaveBeenCalledWith('service.name', props.trace, props.useOtelTerms);
  });
});
