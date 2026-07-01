// Copyright (c) 2021 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import OperationTableDetails from '.';
import { originInitialState, serviceOpsMetrics } from '../../../../reducers/metrics.mock';
import * as track from './index.track';

vi.mock('../../../../utils/prefix-url', () => mockDefault(jest.fn(url => url)));

vi.mock('../../../common/LoadingIndicator', () => {
  return mockDefault(function MockLoadingIndicator(props) {
    return (
      <div data-testid="loading-indicator" {...props}>
        Loading...
      </div>
    );
  });
});

const props = {
  data: originInitialState.serviceOpsMetrics,
  error: originInitialState.opsError,
  loading: true,
  endTime: 1632133918915,
  lookback: 3600 * 1000,
  serviceName: 'serviceName',
};

describe('<OperationTableDetails>', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not explode', () => {
    const { container } = render(<OperationTableDetails {...props} />);
    expect(container).toBeInTheDocument();
  });

  it('Loading indicator is displayed', () => {
    const { container } = render(<OperationTableDetails {...props} />);
    expect(container.querySelector('[data-testid="loading-indicator"]')).toBeInTheDocument();
  });

  it('"Couldn’t fetch data" displayed', () => {
    const error = {
      opsCalls: new Error('API Error'),
      opsErrors: new Error('API Error'),
      opsLatencies: new Error('API Error'),
    };
    const { container } = render(<OperationTableDetails {...props} loading={false} error={error} />);
    expect(container.querySelector('.ops-table-error-placeholder')).toBeInTheDocument();
    expect(container.querySelector('.ops-table-error-placeholder').textContent).toBe('Couldn’t fetch data');
  });

  it('Table rendered successfully', () => {
    const { container } = render(<OperationTableDetails {...props} loading={false} />);
    expect(container.querySelector('table')).toBeInTheDocument();
  });
});

describe('<OperationTableDetails> with data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('render No data table', () => {
    const { container } = render(<OperationTableDetails {...props} loading={false} />);
    expect(container.querySelector('table')).toBeInTheDocument();
  });

  it('renders data, formats values correctly, supports sorting, row hover highlights, and tracks events', () => {
    const trackSortOperationsSpy = jest.spyOn(track, 'trackSortOperations');
    const trackViewTracesSpy = jest.spyOn(track, 'trackViewTraces');

    // Combine all edge cases into a single dataset to test formatting/columns in one render
    const testData = [
      {
        ...serviceOpsMetrics[0],
        name: '/PlaceOrder',
        latency: 8000,
        requests: 0.02,
        errRates: 0.00001,
        impact: 20,
        key: 0,
      },
      {
        ...serviceOpsMetrics[0],
        name: '/Accounts',
        latency: 0.2988,
        requests: 0.2888,
        errRates: 1,
        impact: 10,
        key: 1,
      },
      {
        ...serviceOpsMetrics[0],
        name: '/NoDataPoints',
        latency: 0.00001,
        requests: 1.5,
        errRates: 0.05,
        impact: 0,
        key: 2,
        dataPoints: {
          avg: {
            service_operation_call_rate: 11,
            service_operation_error_rate: 22,
            service_operation_latencies: 99,
          },
          service_operation_call_rate: [],
          service_operation_error_rate: [],
          service_operation_latencies: [],
        },
      },
    ];

    const { container } = render(<OperationTableDetails {...props} data={testData} loading={false} />);

    // 1. Assert formatting
    expect(container.querySelector('table')).toBeInTheDocument();
    expect(screen.getByText('/PlaceOrder')).toBeInTheDocument();
    expect(screen.getByText('/Accounts')).toBeInTheDocument();
    expect(screen.getByText('8s')).toBeInTheDocument();
    expect(screen.getByText('< 0.1 req/s')).toBeInTheDocument();
    expect(screen.getByText('0.28 req/s')).toBeInTheDocument();

    // 2. Assert Graph avg label test (avgDivs should be empty if dataPoints are empty/custom)
    const avgDivs = container
      .querySelectorAll('tbody tr.ant-table-row')[2]
      .querySelectorAll('div.table-graph-avg');
    avgDivs.forEach(div => {
      expect(div.textContent).toBe('');
    });

    // 3. Highlight the row
    const tableRow = screen.getAllByRole('row')[1]; // Row 1 (/PlaceOrder)
    fireEvent.mouseEnter(tableRow);
    expect(tableRow).toHaveClass('table-row--hovered');
    expect(screen.getByText('View traces')).toBeInTheDocument();

    // 4. Track view traces event
    const viewTracesButton = screen.getByText('View traces');
    fireEvent.click(viewTracesButton);
    expect(trackViewTracesSpy).toHaveBeenCalledWith('/PlaceOrder');

    fireEvent.mouseLeave(tableRow);
    expect(tableRow).not.toHaveClass('table-row--hovered');
    expect(screen.queryByText('View traces')).not.toBeInTheDocument();

    // 5. Sort row
    let cells = screen.getAllByRole('cell');
    expect(cells[0].textContent).toBe('/PlaceOrder');

    const nameHeader = screen.getByText('Name').closest('th');
    const ascSorter = nameHeader.querySelector('.ant-table-column-sorter-up');
    fireEvent.click(ascSorter);

    cells = screen.getAllByRole('cell');
    expect(cells[0].textContent).toBe('/Accounts');
    expect(trackSortOperationsSpy).toHaveBeenCalledWith('Name');

    const latencyHeader = screen.getByText('P95 Latency').closest('th');
    const latencySorter = latencyHeader.querySelector('.ant-table-column-sorter-up');
    fireEvent.click(latencySorter);

    const requestsHeader = screen.getByText('Request rate').closest('th');
    const requestsSorter = requestsHeader.querySelector('.ant-table-column-sorter-up');
    fireEvent.click(requestsSorter);

    const errorsHeader = screen.getByText('Error rate').closest('th');
    const errorsSorter = errorsHeader.querySelector('.ant-table-column-sorter-up');
    fireEvent.click(errorsSorter);

    const impactHeader = screen.getByText('Impact').closest('th');
    const impactSorter = impactHeader.querySelector('.ant-table-column-sorter-up');
    fireEvent.click(impactSorter);
    expect(trackSortOperationsSpy).toHaveBeenCalledWith('Impact');
  });
});
