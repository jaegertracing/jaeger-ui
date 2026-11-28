// Copyright (c) 2018 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import TraceSpanView from './index';
import { transformOtelTrace } from '../../../api/v3/parser';
import { validateTracesData } from '../../../api/v3/schemas';

import testTrace from '../testTrace.json';

const trace = transformOtelTrace(validateTracesData(testTrace));

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
    defaultProps = {
      trace,
      uiFind: undefined,
      uiFindVertexKeys: undefined,
    };
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

  // Rows start in the trace's tree order, and sorting keeps that order for ties: spans 40 and 60
  // both last 20000 µs, and several spans share a service or operation name. These expected orders
  // change if the tree order changes.
  it.each([
    ['Service Name', '10 20 30 21 60 12 13 14 40 50'],
    ['Operation', '10 40 20 50 21 30 70 60 12 13'],
    ['Span ID', '10 12 13 14 20 21 30 40 50 60'],
    ['Duration', '14 13 12 50 40 60 20 21 30 70'],
    ['Start Time', '10 20 30 40 50 21 60 12 13 14'],
  ])('sorts the rows ascending by %s when its header is clicked', (title, expectedSpanIDs) => {
    const { container } = render(<TraceSpanView {...defaultProps} />);
    fireEvent.click(within(screen.getByRole('table')).getByText(title));
    const rows = container.querySelectorAll('.ant-table-row');
    expect(rows).toHaveLength(10);
    const renderedSpanIDs = Array.from(rows).map(row => row.querySelector('.span-id-cell').textContent);
    expect(renderedSpanIDs).toEqual(expectedSpanIDs.split(' ').map(id => id.padStart(16, '0')));
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
