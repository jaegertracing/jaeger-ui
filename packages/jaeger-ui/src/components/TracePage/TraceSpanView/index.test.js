// Copyright (c) 2018 The Jaeger Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TraceSpanView from './index';
import transformTraceData from '../../../model/transform-trace-data';

import testTrace from '../TraceStatistics/tableValuesTestTrace/testTrace.json';

const transformedTrace = transformTraceData(testTrace);

jest.mock('../../common/SearchableSelect', () => {
  const mockReact = jest.requireActual('react');

  return ({ 'data-testid': testId, onChange, value, children }) => {
    const options = mockReact.Children.toArray(children).map(child => ({
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
  };
});

describe('<TraceSpanView>', () => {
  let defaultProps;

  beforeEach(() => {
    defaultProps = {
      trace: transformedTrace,
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
