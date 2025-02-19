// Copyright (c) 2017 Uber Technologies, Inc.
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


import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperationTableDetails } from '.';
import { originInitialState, serviceOpsMetrics } from '../../../../reducers/metrics.mock';
import * as track from './index.track';

// Mock LoadingIndicator component since it's a separate import
jest.mock('../../../common/LoadingIndicator', () => ({
  __esModule: true,
  default: () => <div data-testid="loading-indicator">Loading...</div>,
}));

const defaultProps = {
  data: originInitialState.serviceOpsMetrics,
  error: originInitialState.opsError,
  loading: true,
  endTime: 1632133918915,
  lookback: 3600 * 1000,
  serviceName: 'serviceName',
};

describe('OperationTableDetails', () => {
  beforeEach(() => {
    jest.spyOn(track, 'trackSortOperations');
    jest.spyOn(track, 'trackViewTraces');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading indicator when loading', () => {
    const { getByTestId } = render(<OperationTableDetails {...defaultProps} />);
    expect(getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows error message when API fails', () => {
    const error = {
      opsCalls: new Error('API Error'),
      opsErrors: new Error('API Error'),
      opsLatencies: new Error('API Error'),
    };
    const { container } = render(<OperationTableDetails {...defaultProps} loading={false} error={error} />);
    const errorElement = container.querySelector('.ops-table-error-placeholder');
    expect(errorElement).toBeInTheDocument();
    expect(errorElement.textContent).toBe('Couldn’t fetch data');
  });

  describe('Table functionality', () => {
    const sampleData = [
      {
        ...serviceOpsMetrics[0],
        name: '/PlaceOrder',
        latency: 100,
        requests: 0.5,
        errRates: 0.02,
        impact: 0.8,
        key: 0,
        dataPoints: {
          service_operation_latencies: [],
          service_operation_call_rate: [],
          service_operation_error_rate: [],
        },
      },
      {
        ...serviceOpsMetrics[0],
        name: '/Accounts',
        latency: 50,
        requests: 0.8,
        errRates: 0.01,
        impact: 0.6,
        key: 1,
        dataPoints: {
          service_operation_latencies: [],
          service_operation_call_rate: [],
          service_operation_error_rate: [],
        },
      },
    ];

    it('renders table columns correctly', () => {
      const { container } = render(
        <OperationTableDetails {...defaultProps} loading={false} data={sampleData} />
      );

      const headers = container.querySelectorAll('.ant-table-cell');
      const headerTexts = Array.from(headers).map(header => header.textContent.trim());
      expect(headerTexts).toContain('Name');
      expect(headerTexts).toContain('P95 Latency');
      expect(headerTexts).toContain('Request rate');
      expect(headerTexts).toContain('Error rate');
      expect(headerTexts).toContain('Impact');
    });

    it('formats different metrics correctly', () => {
      const metricsData = [
        {
          ...serviceOpsMetrics[0],
          name: 'TestOp',
          latency: 0.05,
          requests: 0.02,
          errRates: 0.333333,
          impact: 0.5,
          key: 0,
          dataPoints: {
            service_operation_latencies: [{ x: 1, y: 0.05 }],
            service_operation_call_rate: [{ x: 1, y: 0.02 }],
            service_operation_error_rate: [{ x: 1, y: 0.333333 }],
          },
        },
      ];

      const { container } = render(
        <OperationTableDetails {...defaultProps} loading={false} data={metricsData} />
      );

      // Get all table cells containing data (excluding headers)
      const tableCells = container.querySelectorAll('.ant-table-row .ant-table-cell');
      const cellContents = Array.from(tableCells).map(cell => cell.textContent);

      const cellContentString = cellContents.join(' ');
      expect(cellContentString).toContain('TestOp');

      const latencyCell = container.querySelector('.table-graph-avg');
      expect(latencyCell?.textContent).toContain('50μs');

      const requestRateCell = Array.from(container.querySelectorAll('.table-graph-avg')).find(el =>
        el.textContent?.includes('req/s')
      );

      const received = requestRateCell?.textContent;
      expect(received).toMatch(/<\s?0\.1 req\/s/);

      const errorRateCell = Array.from(container.querySelectorAll('.table-graph-avg')).find(el =>
        el.textContent?.includes('%')
      );
      expect(errorRateCell?.textContent).toContain('33.33%');
    });

    it('shows view traces button on row hover', async () => {
      const { container } = render(
        <OperationTableDetails {...defaultProps} loading={false} data={sampleData} />
      );

      const firstRow = container.querySelector('.ant-table-row');
      fireEvent.mouseEnter(firstRow);

      const button = container.querySelector('.ant-btn');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('View traces');

      await userEvent.click(button);
      expect(track.trackViewTraces).toHaveBeenCalledWith('/PlaceOrder');

      fireEvent.mouseLeave(firstRow);
      expect(container.querySelector('.ant-btn')).not.toBeInTheDocument();
    });

    it('tracks sorting operations', async () => {
      const { container } = render(
        <OperationTableDetails {...defaultProps} loading={false} data={sampleData} />
      );

      const headers = container.querySelectorAll('.ant-table-column-sorter');
      await userEvent.click(headers[0]); // Name header
      expect(track.trackSortOperations).toHaveBeenCalledWith('Name');

      await userEvent.click(headers[4]); // Impact header
      expect(track.trackSortOperations).toHaveBeenCalledWith('Impact');
    });

    it('sorts table data correctly', async () => {
      const { container } = render(
        <OperationTableDetails {...defaultProps} loading={false} data={sampleData} />
      );

      const rows = container.querySelectorAll('.ant-table-row');
      const firstRowInitial = rows[0].textContent;
      expect(firstRowInitial).toContain('/PlaceOrder');

      const nameHeader = container.querySelector('.ant-table-column-sorter');
      await userEvent.click(nameHeader);

      const rowsAfterSort = container.querySelectorAll('.ant-table-row');
      expect(rowsAfterSort[0].textContent).toContain('/Accounts');
    });

    it('renders pagination controls', () => {
      const { container } = render(
        <OperationTableDetails {...defaultProps} loading={false} data={sampleData} />
      );

      expect(container.querySelector('.ant-pagination')).toBeInTheDocument();
      expect(container.querySelector('.ant-select')).toBeInTheDocument();
    });
  });
});
