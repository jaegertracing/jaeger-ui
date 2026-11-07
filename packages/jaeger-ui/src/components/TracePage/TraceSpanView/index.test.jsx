// Copyright (c) 2026 The Jaeger Authors.
// Copyright (c) 2018 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TraceSpanView from './index';
import transformTraceData from '../../../model/transform-trace-data';
import getConfig from '../../../utils/config/get-config';

import testTrace from '../TraceStatistics/tableValuesTestTrace/testTrace.json';

const trace = transformTraceData(testTrace).asOtelTrace();

vi.mock('../../../utils/config/get-config', () => mockDefault(vi.fn(() => ({}))));

vi.mock('../../common/SearchableSelect', () => {
  return mockDefault(({ 'data-testid': testId, onChange, value, children }) => {
    const options = React.Children.toArray(children).map(child => ({
      value: child.props.value,
      label: child.props.children[0],
    }));

    return (
      <select
        data-testid={testId}
        value={value || []}
        onChange={e => {
          onChange([e.target.value]);
        }}
      >
        <option value="">Select...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  });
});

describe('<TraceSpanView>', () => {
  let defaultProps;

  beforeEach(() => {
    getConfig.mockReturnValue({});
    defaultProps = {
      trace,
      uiFind: undefined,
      uiFindVertexKeys: undefined,
    };
  });

  it.each([
    ['12h', 'October 15 2026, 3:04:05.123 pm (1ms)'],
    ['24h', 'October 15 2026, 15:04:05.123 (1ms)'],
  ])('uses the configured %s timestamp in the start time tooltip', async (timeFormat, expected) => {
    getConfig.mockReturnValue({ timeFormat });
    const startTime = new Date(2026, 9, 15, 15, 4, 5, 123).getTime() * 1000;
    const span = Object.create(trace.spans[0]);
    Object.defineProperties(span, {
      startTime: { value: startTime },
      relativeStartTime: { value: 1000 },
    });
    const singleSpanTrace = Object.create(trace);
    Object.defineProperty(singleSpanTrace, 'spans', { value: [span] });
    const { container } = render(<TraceSpanView {...defaultProps} trace={singleSpanTrace} />);
    const startTimeCell = container.querySelector('.ant-table-row').querySelectorAll('td')[4];
    fireEvent.mouseEnter(startTimeCell.querySelector('span'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(expected);
  });

  it('does not explode', () => {
    const { container } = render(<TraceSpanView {...defaultProps} />);

    expect(screen.getByText('Trace Tabular View')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();

    const spanViewTables = container.querySelectorAll('.span-view-table');
    expect(spanViewTables.length).toBe(1);

    expect(container.querySelector('colgroup')).toBeInTheDocument();

    const paginationElements = container.querySelectorAll('.ant-pagination');
    expect(paginationElements.length).toBe(1);

    expect(screen.getByText('Reset Filters')).toBeInTheDocument();

    const formControls = container.querySelectorAll('.ant-form-item-control-input');
    expect(formControls.length).toBe(3);
  });

  it('Should change value when onChange was called', () => {
    render(<TraceSpanView {...defaultProps} />);

    const serviceSelect = screen.getByTestId('select-service');

    fireEvent.change(serviceSelect, { target: { value: 'service2' } });

    expect(serviceSelect.value).toBe('service2');
  });

  it('Should change value when onChange and Rest the value when called reset', () => {
    render(<TraceSpanView {...defaultProps} />);

    const serviceSelect = screen.getByTestId('select-service');
    fireEvent.change(serviceSelect, { target: { value: 'service2' } });
    expect(serviceSelect.value).toBe('service2');

    const resetButton = screen.getByText('Reset Filters');
    fireEvent.click(resetButton);

    expect(serviceSelect.value).toBe('');
  });

  it('Should change value when onChange OperationName DD was called', () => {
    render(<TraceSpanView {...defaultProps} />);

    const operationSelect = screen.getByTestId('select-operation');

    fireEvent.change(operationSelect, { target: { value: 'op2' } });

    expect(operationSelect.value).toBe('op2');
  });

  it('filters the table rows by the selected service and operation', () => {
    const { container } = render(<TraceSpanView {...defaultProps} />);
    const renderedServiceNames = () =>
      Array.from(container.querySelectorAll('.ant-table-row')).map(
        row => row.querySelector('td').textContent
      );

    fireEvent.change(screen.getByTestId('select-service'), { target: { value: 'service2' } });
    expect(renderedServiceNames()).toEqual(['service2', 'service2', 'service2']);

    fireEvent.change(screen.getByTestId('select-operation'), { target: { value: 'op3' } });
    expect(renderedServiceNames()).toEqual(['service2']);
  });

  it('check handler', () => {
    render(<TraceSpanView {...defaultProps} />);

    const serviceSelect = screen.getByTestId('select-service');
    const serviceOptions = Array.from(serviceSelect.querySelectorAll('option')).slice(1);

    expect(serviceOptions.length).toBe(2);
    expect(serviceOptions[0].textContent).toBe('service1');
    expect(serviceOptions[1].textContent).toBe('service2');

    const operationSelect = screen.getByTestId('select-operation');
    const operationOptions = Array.from(operationSelect.querySelectorAll('option')).slice(1);

    expect(operationOptions.length).toBe(6);
    expect(operationOptions.map(opt => opt.textContent.trim())).toEqual(
      expect.arrayContaining(['op1', 'op2', 'op3', 'op4', 'op6', 'op7'])
    );
  });
});
