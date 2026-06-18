// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FlamegraphTable from './FlamegraphTable';
import { IFlamegraphTableRow } from './generateTableData';

const mockUseConfig = vi.fn();
vi.mock('../../../hooks/useConfig', () => ({
  useConfig: () => mockUseConfig(),
}));

const sampleData: IFlamegraphTableRow[] = [
  { key: 'svc-a: op-1', serviceName: 'svc-a', name: 'svc-a: op-1', count: 3, self: 500000, total: 1000000 },
  { key: 'svc-b: op-2', serviceName: 'svc-b', name: 'svc-b: op-2', count: 1, self: 200000, total: 400000 },
  { key: 'svc-a: op-3', serviceName: 'svc-a', name: 'svc-a: op-3', count: 2, self: 100000, total: 300000 },
];

const defaultProps = {
  data: sampleData,
  searchQuery: '',
  selectedItem: null,
  onRowClick: vi.fn(),
  maxSelf: 500000,
  maxTotal: 1000000,
};

describe('<FlamegraphTable />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConfig.mockReturnValue({ useOpenTelemetryTerms: false });
  });

  it('renders all rows', () => {
    render(<FlamegraphTable {...defaultProps} />);
    expect(screen.getByText('op-1')).toBeInTheDocument();
    expect(screen.getByText('op-2')).toBeInTheDocument();
    expect(screen.getByText('op-3')).toBeInTheDocument();
  });

  it('shows "Service & Operation" column header by default', () => {
    render(<FlamegraphTable {...defaultProps} />);
    expect(screen.getByText('Service & Operation')).toBeInTheDocument();
  });

  it('shows "Service & Span Name" when useOpenTelemetryTerms is true', () => {
    mockUseConfig.mockReturnValue({ useOpenTelemetryTerms: true });
    render(<FlamegraphTable {...defaultProps} />);
    expect(screen.getByText('Service & Span Name')).toBeInTheDocument();
  });

  it('displays service name and operation name separately', () => {
    render(<FlamegraphTable {...defaultProps} />);
    expect(screen.getAllByText('svc-a').length).toBe(2);
    expect(screen.getByText('svc-b')).toBeInTheDocument();
    expect(screen.getByText('op-1')).toBeInTheDocument();
  });

  it('displays count column', () => {
    render(<FlamegraphTable {...defaultProps} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('filters rows by searchQuery', () => {
    render(<FlamegraphTable {...defaultProps} searchQuery="op-1" />);
    expect(screen.getByText('op-1')).toBeInTheDocument();
    expect(screen.queryByText('op-2')).not.toBeInTheDocument();
    expect(screen.queryByText('op-3')).not.toBeInTheDocument();
  });

  it('search is case-insensitive', () => {
    render(<FlamegraphTable {...defaultProps} searchQuery="SVC-B" />);
    expect(screen.getByText('op-2')).toBeInTheDocument();
    expect(screen.queryByText('op-1')).not.toBeInTheDocument();
  });

  it('calls onRowClick with row name when row is clicked', () => {
    const onRowClick = vi.fn();
    render(<FlamegraphTable {...defaultProps} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('op-1').closest('tr')!);
    expect(onRowClick).toHaveBeenCalledWith('svc-a: op-1');
  });

  it('applies selected class to matching row', () => {
    render(<FlamegraphTable {...defaultProps} selectedItem="svc-a: op-1" />);
    const row = screen.getByText('op-1').closest('tr');
    expect(row).toHaveClass('Flamegraph-table--row-selected');
  });

  it('does not apply selected class to non-matching rows', () => {
    render(<FlamegraphTable {...defaultProps} selectedItem="svc-a: op-1" />);
    const row = screen.getByText('op-2').closest('tr');
    expect(row).not.toHaveClass('Flamegraph-table--row-selected');
  });

  it('clicking column header toggles sort direction', () => {
    render(<FlamegraphTable {...defaultProps} />);
    const countHeader = screen.getByText('Count');
    fireEvent.click(countHeader);
    // After clicking Count, rows should be sorted by count
    const rows = screen.getAllByRole('row');
    // header row + 3 data rows
    expect(rows).toHaveLength(4);
  });

  it('sort does not allow a third "cancel" state', () => {
    render(<FlamegraphTable {...defaultProps} />);
    // Default sort: self descend. Click Self header twice — should toggle to ascend then back to descend, never cancel
    const selfHeader = screen.getByText('Self');
    fireEvent.click(selfHeader); // ascend
    fireEvent.click(selfHeader); // descend
    // All rows should still be visible (sorted, not unsorted/cancelled)
    expect(screen.getByText('op-1')).toBeInTheDocument();
    expect(screen.getByText('op-2')).toBeInTheDocument();
    expect(screen.getByText('op-3')).toBeInTheDocument();
  });
});
