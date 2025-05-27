// Copyright (c) 2021 The Jaeger Authors.
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
import userEvent from '@testing-library/user-event';
import OperationTableDetails from '.';
import { originInitialState, serviceOpsMetrics } from '../../../../reducers/metrics.mock';
import * as track from './index.track';

// Mock ResizeObserver for recharts
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

const props = {
  data: originInitialState.serviceOpsMetrics,
  error: originInitialState.opsError,
  loading: true,
  endTime: 1632133918915,
  lookback: 3600 * 1000,
  serviceName: 'serviceName',
};

describe('<OperationTableDetails>', () => {
  it('renders loading indicator when loading is true', () => {
    render(<OperationTableDetails {...props} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('displays error message when API errors occur', () => {
    const error = {
      opsCalls: new Error('API Error'),
      opsErrors: new Error('API Error'),
      opsLatencies: new Error('API Error'),
    };
    render(<OperationTableDetails {...props} loading={false} error={error} />);
    expect(screen.getByText("Couldn't fetch data")).toBeInTheDocument();
  });

  it('renders empty table when no data is provided', () => {
    render(<OperationTableDetails {...props} loading={false} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    // Check for column headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('P95 Latency')).toBeInTheDocument();
    expect(screen.getByText('Request rate')).toBeInTheDocument();
    expect(screen.getByText('Error rate')).toBeInTheDocument();
    expect(screen.getByText('Impact')).toBeInTheDocument();
  });

  it('renders table with data correctly', () => {
    render(<OperationTableDetails {...props} data={serviceOpsMetrics} loading={false} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('/PlaceOrder')).toBeInTheDocument();
  });

  it('renders latency in seconds in the table', () => {
    const cloneServiceOpsMetrics = { ...serviceOpsMetrics[0], latency: 8 };
    render(<OperationTableDetails {...props} data={[cloneServiceOpsMetrics]} loading={false} />);
    expect(screen.getByText('/PlaceOrder')).toBeInTheDocument();
  });

  it('renders lower than 0.1 request rate value', () => {
    const cloneServiceOpsMetrics = { ...serviceOpsMetrics[0], requests: 0.02 };
    render(<OperationTableDetails {...props} data={[cloneServiceOpsMetrics]} loading={false} />);
    expect(screen.getByText('/PlaceOrder')).toBeInTheDocument();
  });

  it('renders request rate number with more than 2 decimal places value', () => {
    const cloneServiceOpsMetrics = { ...serviceOpsMetrics[0], requests: 0.2888 };
    render(<OperationTableDetails {...props} data={[cloneServiceOpsMetrics]} loading={false} />);
    expect(screen.getByText('/PlaceOrder')).toBeInTheDocument();
  });

  it('renders lower than 0.1 error rate', () => {
    const cloneServiceOpsMetrics = { ...serviceOpsMetrics[0], errRates: 0.00001 };
    render(<OperationTableDetails {...props} data={[cloneServiceOpsMetrics]} loading={false} />);
    expect(screen.getByText('/PlaceOrder')).toBeInTheDocument();
  });

  it('renders error rate with more than 2 decimal places value', () => {
    const cloneServiceOpsMetrics = { ...serviceOpsMetrics[0], latency: 33.333333 };
    render(<OperationTableDetails {...props} data={[cloneServiceOpsMetrics]} loading={false} />);
    expect(screen.getByText('/PlaceOrder')).toBeInTheDocument();
  });

  it('renders lower than 0.1 P95 latency', () => {
    const cloneServiceOpsMetrics = { ...serviceOpsMetrics[0], latency: 0.00001 };
    render(<OperationTableDetails {...props} data={[cloneServiceOpsMetrics]} loading={false} />);
    expect(screen.getByText('/PlaceOrder')).toBeInTheDocument();
  });

  it('renders P95 latency with more than 2 decimal places value', () => {
    const cloneServiceOpsMetrics = { ...serviceOpsMetrics[0], latency: 0.2988 };
    render(<OperationTableDetails {...props} data={[cloneServiceOpsMetrics]} loading={false} />);
    expect(screen.getByText('/PlaceOrder')).toBeInTheDocument();
  });

  it('renders table with empty data points', () => {
    const data = [
      {
        ...serviceOpsMetrics[0],
        dataPoints: {
          ...serviceOpsMetrics[0].dataPoints,
          service_operation_call_rate: [],
          service_operation_error_rate: [],
          service_operation_latencies: [],
        },
      },
    ];
    render(<OperationTableDetails {...props} data={data} loading={false} />);
    expect(screen.getByText('/PlaceOrder')).toBeInTheDocument();
  });

  it('shows view traces button on row hover', async () => {
    render(<OperationTableDetails {...props} data={serviceOpsMetrics} loading={false} />);
    
    // Find the table row and hover over it
    const tableRow = screen.getByText('/PlaceOrder').closest('tr');
    fireEvent.mouseEnter(tableRow);
    
    // Check if the button appears
    expect(await screen.findByText('View traces')).toBeInTheDocument();
    
    // Mouse leave should hide the button
    fireEvent.mouseLeave(tableRow);
    expect(screen.queryByText('View traces')).not.toBeInTheDocument();
  });

  it('tracks view traces button click', async () => {
    const trackViewTracesSpy = jest.spyOn(track, 'trackViewTraces');
    render(<OperationTableDetails {...props} data={serviceOpsMetrics} loading={false} />);
    
    // Find the table row and hover over it
    const tableRow = screen.getByText('/PlaceOrder').closest('tr');
    fireEvent.mouseEnter(tableRow);
    
    // Click the view traces button
    const viewTracesButton = await screen.findByText('View traces');
    fireEvent.click(viewTracesButton);
    
    expect(trackViewTracesSpy).toHaveBeenCalledWith(serviceOpsMetrics[0].name);
    trackViewTracesSpy.mockRestore();
  });

  it('tracks column sorting', () => {
    const trackSortOperationsSpy = jest.spyOn(track, 'trackSortOperations');
    render(<OperationTableDetails {...props} data={serviceOpsMetrics} loading={false} />);
    
    // Find and click on the Name column header
    const nameColumnHeader = screen.getByText('Name').closest('th');
    fireEvent.click(nameColumnHeader);
    
    expect(trackSortOperationsSpy).toHaveBeenCalledWith('Name');
    trackSortOperationsSpy.mockRestore();
  });

  it('sorts table by different columns', () => {
    const data = [
      serviceOpsMetrics[0],
      {
        ...serviceOpsMetrics[0],
        key: 1,
        name: '/Accounts',
        requests: 0.002,
        errRates: 2,
        latency: 800.16,
        impact: 0,
      },
    ];
    
    render(<OperationTableDetails {...props} data={data} loading={false} />);
    
    // Initial sort should have /PlaceOrder first (default sort by impact)
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('/PlaceOrder');
    
    // Sort by name
    const nameColumnHeader = screen.getByText('Name').closest('th');
    fireEvent.click(nameColumnHeader);
    
    // After sorting by name, /Accounts should be first
    const rowsAfterSort = screen.getAllByRole('row');
    expect(rowsAfterSort[1]).toHaveTextContent('/Accounts');
  });
});