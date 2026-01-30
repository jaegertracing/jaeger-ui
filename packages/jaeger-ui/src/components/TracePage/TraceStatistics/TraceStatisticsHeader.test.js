import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TraceStatisticsHeader from './TraceStatisticsHeader';
import * as tableValues from './tableValues';
import * as generateDropdownValue from './generateDropdownValue';
import * as generateColor from './generateColor';

// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

jest.mock('./tableValues');
jest.mock('./generateDropdownValue');
jest.mock('./generateColor');

describe('TraceStatisticsHeader', () => {
  const mockTrace = {
    traceID: 'test-trace-id',
    spans: [],
    processes: {},
  };

  const mockTableValue = [
    { name: 'span1', count: 5, total: 100 },
    { name: 'span2', count: 3, total: 50 },
  ];

  const mockWholeTable = [
    { name: 'span1', count: 5, total: 100 },
    { name: 'span2', count: 3, total: 50 },
    { name: 'span3', count: 2, total: 25 },
  ];

  const mockHandler = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    tableValues.getServiceName.mockReturnValue('test-service');
    tableValues.getColumnValues.mockReturnValue(mockTableValue);
    tableValues.getColumnValuesSecondDropdown.mockReturnValue(mockTableValue);
    generateDropdownValue.generateDropdownValue.mockReturnValue(['service', 'operation', 'status']);
    generateDropdownValue.generateSecondDropdownValue.mockReturnValue(['option1', 'option2']);
    generateColor.default.mockImplementation(data => data);
  });

  it('should render without crashing', () => {
    render(
      <TraceStatisticsHeader
        trace={mockTrace}
        tableValue={mockTableValue}
        wholeTable={mockWholeTable}
        handler={mockHandler}
        useOtelTerms={false}
      />
    );

    expect(screen.getByText('Group By:')).toBeInTheDocument();
    expect(screen.getByText('Sub-Group:')).toBeInTheDocument();
    expect(screen.getByText('Color by:')).toBeInTheDocument();
  });

  it('should initialize with service name on mount', () => {
    render(
      <TraceStatisticsHeader
        trace={mockTrace}
        tableValue={mockTableValue}
        wholeTable={mockWholeTable}
        handler={mockHandler}
        useOtelTerms={false}
      />
    );

    expect(tableValues.getServiceName).toHaveBeenCalled();
    expect(tableValues.getColumnValues).toHaveBeenCalledWith('test-service', mockTrace, false);
    expect(mockHandler).toHaveBeenCalledWith(mockTableValue, mockTableValue, 'test-service', null);
  });

  it('should call handler with useOtelTerms=true when prop is true', () => {
    render(
      <TraceStatisticsHeader
        trace={mockTrace}
        tableValue={mockTableValue}
        wholeTable={mockWholeTable}
        handler={mockHandler}
        useOtelTerms={true}
      />
    );

    expect(tableValues.getColumnValues).toHaveBeenCalledWith('test-service', mockTrace, true);
  });

  it('should update primary selector and reset secondary selector', async () => {
    const { container } = render(
      <TraceStatisticsHeader
        trace={mockTrace}
        tableValue={mockTableValue}
        wholeTable={mockWholeTable}
        handler={mockHandler}
        useOtelTerms={false}
      />
    );

    const groupBySelect = container.querySelector('.TraceStatisticsHeader--select');
    fireEvent.mouseDown(groupBySelect);

    await waitFor(() => {
      const operationOption = screen.getByText('operation');
      fireEvent.click(operationOption);
    });

    expect(tableValues.getColumnValues).toHaveBeenCalledWith('operation', mockTrace, false);
    expect(mockHandler).toHaveBeenCalledWith(mockTableValue, mockTableValue, 'operation', null);
  });

  it('should update secondary selector', async () => {
    const { container } = render(
      <TraceStatisticsHeader
        trace={mockTrace}
        tableValue={mockTableValue}
        wholeTable={mockWholeTable}
        handler={mockHandler}
        useOtelTerms={false}
      />
    );

    const subGroupSelects = container.querySelectorAll('.TraceStatisticsHeader--select');
    const subGroupSelect = subGroupSelects[1];
    fireEvent.mouseDown(subGroupSelect);

    await waitFor(() => {
      const option1 = screen.getByText('option1');
      fireEvent.click(option1);
    });

    expect(tableValues.getColumnValuesSecondDropdown).toHaveBeenCalled();
    expect(mockHandler).toHaveBeenCalledWith(mockTableValue, mockTableValue, 'test-service', 'option1');
  });

  it('should clear secondary selector', async () => {
    const { container } = render(
      <TraceStatisticsHeader
        trace={mockTrace}
        tableValue={mockTableValue}
        wholeTable={mockWholeTable}
        handler={mockHandler}
        useOtelTerms={false}
      />
    );

    const subGroupSelects = container.querySelectorAll('.TraceStatisticsHeader--select');
    const subGroupSelect = subGroupSelects[1];

    // First set a value
    fireEvent.mouseDown(subGroupSelect);
    await waitFor(() => {
      const option1 = screen.getByText('option1');
      fireEvent.click(option1);
    });

    // Then clear it
    const clearButton = container.querySelector('.ant-select-clear');
    if (clearButton) {
      fireEvent.click(clearButton);
    }

    await waitFor(() => {
      expect(mockHandler).toHaveBeenCalledWith(mockTableValue, mockTableValue, 'test-service', null);
    });
  });

  it('should update color by selector', async () => {
    const { container } = render(
      <TraceStatisticsHeader
        trace={mockTrace}
        tableValue={mockTableValue}
        wholeTable={mockWholeTable}
        handler={mockHandler}
        useOtelTerms={false}
      />
    );

    const colorBySelects = container.querySelectorAll('.TraceStatisticsHeader--select');
    const colorBySelect = colorBySelects[2];
    fireEvent.mouseDown(colorBySelect);

    await waitFor(() => {
      const totalOption = screen.getByText('Total');
      fireEvent.click(totalOption);
    });

    expect(generateColor.default).toHaveBeenCalledWith(mockTableValue, 'total', false);
    expect(mockHandler).toHaveBeenCalled();
  });

  it('should toggle checkbox and apply colors', () => {
    const { container } = render(
      <TraceStatisticsHeader
        trace={mockTrace}
        tableValue={mockTableValue}
        wholeTable={mockWholeTable}
        handler={mockHandler}
        useOtelTerms={false}
      />
    );

    const checkbox = container.querySelector('.TraceStatisticsHeader--checkbox input');
    fireEvent.click(checkbox);

    expect(generateColor.default).toHaveBeenCalledWith(mockTableValue, 'count', true);
    expect(generateColor.default).toHaveBeenCalledWith(mockWholeTable, 'count', true);
    expect(mockHandler).toHaveBeenCalled();
  });

  it('should generate correct color value options', async () => {
    const { container } = render(
      <TraceStatisticsHeader
        trace={mockTrace}
        tableValue={mockTableValue}
        wholeTable={mockWholeTable}
        handler={mockHandler}
        useOtelTerms={false}
      />
    );

    const colorBySelects = container.querySelectorAll('.TraceStatisticsHeader--select');
    const colorBySelect = colorBySelects[2];
    fireEvent.mouseDown(colorBySelect);

    await waitFor(() => {
      expect(screen.getAllByText('Count').length).toBeGreaterThan(0);
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('Avg')).toBeInTheDocument();
      expect(screen.getByText('Min')).toBeInTheDocument();
      expect(screen.getByText('Max')).toBeInTheDocument();
      expect(screen.getByText('ST Total')).toBeInTheDocument();
      expect(screen.getByText('ST Avg')).toBeInTheDocument();
      expect(screen.getByText('ST Min')).toBeInTheDocument();
      expect(screen.getByText('ST Max')).toBeInTheDocument();
      expect(screen.getByText('ST in Duration')).toBeInTheDocument();
    });
  });

  it('should handle color value with checkbox enabled', () => {
    const { container } = render(
      <TraceStatisticsHeader
        trace={mockTrace}
        tableValue={mockTableValue}
        wholeTable={mockWholeTable}
        handler={mockHandler}
        useOtelTerms={false}
      />
    );

    const checkbox = container.querySelector('.TraceStatisticsHeader--checkbox input');
    fireEvent.click(checkbox);

    expect(generateColor.default).toHaveBeenCalledWith(expect.anything(), 'count', true);
  });

  it('should update trace and re-initialize', () => {
    const { rerender } = render(
      <TraceStatisticsHeader
        trace={mockTrace}
        tableValue={mockTableValue}
        wholeTable={mockWholeTable}
        handler={mockHandler}
        useOtelTerms={false}
      />
    );

    const newTrace = { ...mockTrace, traceID: 'new-trace-id' };
    mockHandler.mockClear();

    rerender(
      <TraceStatisticsHeader
        trace={newTrace}
        tableValue={mockTableValue}
        wholeTable={mockWholeTable}
        handler={mockHandler}
        useOtelTerms={false}
      />
    );

    expect(tableValues.getColumnValues).toHaveBeenCalledWith('test-service', newTrace, false);
    expect(mockHandler).toHaveBeenCalled();
  });
});
