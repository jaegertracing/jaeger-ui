// Copyright (c) 2025 The Jaeger Authors
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
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DAGOptions from './DAGOptions';

const mockDependencies = [
  { parent: 'service-1', child: 'service-2', callCount: 1000 },
  { parent: 'service-2', child: 'service-3', callCount: 2000 },
];

const defaultProps = {
  dependencies: mockDependencies,
  onServiceSelect: jest.fn(),
  onLayoutSelect: jest.fn(),
  onDepthChange: jest.fn(),
  selectedService: null,
  selectedLayout: 'dot',
  selectedDepth: 5,
  onReset: jest.fn(),
  isHierarchicalDisabled: false,
};

describe('DAGOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all selectors and inputs', () => {
    render(<DAGOptions {...defaultProps} />);

    expect(screen.getByTestId('dag-options')).toBeInTheDocument();
    expect(screen.getByTestId('layout-select')).toBeInTheDocument();
    expect(screen.getByTestId('service-select')).toBeInTheDocument();
    expect(screen.getByTestId('depth-input')).toBeInTheDocument();
    expect(screen.getByTestId('reset-button')).toBeInTheDocument();
  });

  it('displays all help icons', () => {
    render(<DAGOptions {...defaultProps} />);

    expect(screen.getByTestId('layout-help-icon')).toBeInTheDocument();
    expect(screen.getByTestId('service-help-icon')).toBeInTheDocument();
    expect(screen.getByTestId('depth-help-icon')).toBeInTheDocument();
  });

  it('shows popover content when clicking help icon', () => {
    render(<DAGOptions {...defaultProps} />);

    fireEvent.click(screen.getByTestId('layout-help-icon'));

    expect(screen.getByText('Layout Options')).toBeInTheDocument();
    expect(
      screen.getByText('Hierarchical Layout: Displays nodes in a top-down tree structure')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Force Directed Layout: Uses physics simulation to position nodes')
    ).toBeInTheDocument();
  });

  it('handles layout selection', () => {
    render(<DAGOptions {...defaultProps} />);
    const layoutSelect = screen.getByTestId('layout-select');

    const selectElement = within(layoutSelect).getByRole('combobox');
    fireEvent.mouseDown(selectElement);

    const forceDirectedOption = screen.getByRole('option', { name: 'Force Directed Layout' });
    fireEvent.click(forceDirectedOption);

    expect(defaultProps.onLayoutSelect).toHaveBeenCalledWith('sfdp');
  });

  it('handles service selection', () => {
    render(<DAGOptions {...defaultProps} />);
    const serviceSelect = screen.getByTestId('service-select');

    const selectElement = within(serviceSelect).getByRole('combobox');
    fireEvent.mouseDown(selectElement);

    const serviceOption = screen.getByRole('option', { name: 'service-1' });
    fireEvent.click(serviceOption);

    expect(defaultProps.onServiceSelect).toHaveBeenCalledWith('service-1');
  });

  it('handles depth change', () => {
    render(<DAGOptions {...defaultProps} selectedService="service-1" />);

    const depthInput = screen.getByTestId('depth-input');
    fireEvent.change(depthInput, { target: { value: '10' } });

    expect(defaultProps.onDepthChange).toHaveBeenCalledWith(10);
  });

  it('handles reset button click', () => {
    render(<DAGOptions {...defaultProps} />);

    const resetButton = screen.getByTestId('reset-button');
    fireEvent.click(resetButton);

    expect(defaultProps.onReset).toHaveBeenCalled();
  });

  it('disables depth input when no service is selected', () => {
    render(<DAGOptions {...defaultProps} selectedService={null} />);

    const depthInput = screen.getByTestId('depth-input');
    expect(depthInput).toBeDisabled();
  });

  it('enables depth input when a service is selected', () => {
    render(<DAGOptions {...defaultProps} selectedService="service-1" />);

    const depthInput = screen.getByTestId('depth-input');
    expect(depthInput).not.toBeDisabled();
  });

  it('disables hierarchical layout option when isHierarchicalDisabled is true', () => {
    render(<DAGOptions {...defaultProps} isHierarchicalDisabled={true} />);
    const layoutSelect = screen.getByTestId('layout-select');

    const selectElement = within(layoutSelect).getByRole('combobox');
    fireEvent.mouseDown(selectElement);

    const hierarchicalOption = screen.getByRole('option', { name: 'Hierarchical Layout' });
    expect(hierarchicalOption).toHaveClass('ant-select-item-option-disabled');
  });

  it('displays all unique services in the service selector', () => {
    render(<DAGOptions {...defaultProps} />);
    const serviceSelect = screen.getByTestId('service-select');

    const selectElement = within(serviceSelect).getByRole('combobox');
    fireEvent.mouseDown(selectElement);

    const options = screen.getAllByRole('option');
    const serviceNames = options.map(option => option.textContent);
    expect(serviceNames).toContain('service-1');
    expect(serviceNames).toContain('service-2');
    expect(serviceNames).toContain('service-3');
  });

  it('maintains selected values correctly', () => {
    render(
      <DAGOptions {...defaultProps} selectedService="service-1" selectedLayout="sfdp" selectedDepth={10} />
    );

    const layoutSelect = screen.getByTestId('layout-select');
    const layoutValue = within(layoutSelect).getByRole('combobox');
    expect(layoutValue).toHaveAttribute('aria-expanded', 'false');
    expect(within(layoutSelect).getByText('Force Directed Layout')).toBeInTheDocument();

    const serviceSelect = screen.getByTestId('service-select');
    const serviceValue = within(serviceSelect).getByRole('combobox');
    expect(serviceValue).toHaveAttribute('aria-expanded', 'false');
    expect(within(serviceSelect).getByText('service-1')).toBeInTheDocument();

    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
  });

  it('handles empty dependencies array', () => {
    render(<DAGOptions {...defaultProps} dependencies={[]} />);
    const serviceSelect = screen.getByTestId('service-select');

    const selectElement = within(serviceSelect).getByRole('combobox');
    fireEvent.mouseDown(selectElement);

    expect(screen.queryByText('service-1')).not.toBeInTheDocument();
    expect(screen.queryByText('service-2')).not.toBeInTheDocument();
    expect(screen.queryByText('service-3')).not.toBeInTheDocument();
  });

  it('handles service popover content', () => {
    render(<DAGOptions {...defaultProps} />);

    fireEvent.click(screen.getByTestId('service-help-icon'));

    expect(screen.getByText('Select a service to focus on its dependencies')).toBeInTheDocument();
    expect(
      screen.getByText('Shows direct connections to other services up to the nearest neighbors')
    ).toBeInTheDocument();
  });

  it('handles depth popover content', () => {
    render(<DAGOptions {...defaultProps} />);

    fireEvent.click(screen.getByTestId('depth-help-icon'));

    expect(screen.getByText('Number of direct service connections to display')).toBeInTheDocument();
    expect(
      screen.getByText('Higher values show more dependencies but may be less readable')
    ).toBeInTheDocument();
  });

  it('handles undefined dependencies', () => {
    render(<DAGOptions {...defaultProps} dependencies={undefined} />);

    const serviceSelect = screen.getByTestId('service-select');
    fireEvent.mouseDown(serviceSelect);

    expect(screen.queryByText('service-1')).not.toBeInTheDocument();
    expect(screen.queryByText('service-2')).not.toBeInTheDocument();
    expect(screen.queryByText('service-3')).not.toBeInTheDocument();
  });

  it('handles default props correctly', () => {
    render(<DAGOptions {...defaultProps} />);

    expect(screen.getByText('Hierarchical Layout')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('handles null service selection', () => {
    render(<DAGOptions {...defaultProps} selectedService={null} />);

    const depthInput = screen.getByTestId('depth-input');
    expect(depthInput).toBeDisabled();
  });

  it('handles undefined service selection', () => {
    render(<DAGOptions {...defaultProps} selectedService={undefined} />);

    const depthInput = screen.getByTestId('depth-input');
    expect(depthInput).toBeDisabled();
  });

  it('handles undefined layout selection', () => {
    render(<DAGOptions {...defaultProps} selectedLayout={undefined} />);

    expect(screen.getByText('Hierarchical Layout')).toBeInTheDocument();
  });

  it('handles undefined depth selection', () => {
    render(<DAGOptions {...defaultProps} selectedDepth={undefined} />);

    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
  });
});
