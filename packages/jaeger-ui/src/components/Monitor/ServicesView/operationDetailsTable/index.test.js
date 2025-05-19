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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import OperationTableDetails from '.';
import { originInitialState, serviceOpsMetrics } from '../../../../reducers/metrics.mock';
import * as track from './index.track';

const defaultProps = {
  data: originInitialState.serviceOpsMetrics,
  error: originInitialState.opsError,
  loading: true,
  endTime: 1632133918915,
  lookback: 3600 * 1000,
  serviceName: 'serviceName',
};

describe('<OperationTableDetails>', () => {
  it('shows loading indicator when loading is true', () => {
    render(<OperationTableDetails {...defaultProps} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows error message when all error states are present', () => {
    const error = {
      opsCalls: new Error('API Error'),
      opsErrors: new Error('API Error'),
      opsLatencies: new Error('API Error'),
    };
    render(<OperationTableDetails {...defaultProps} loading={false} error={error} />);
    expect(screen.getByText("Couldn't fetch data")).toBeInTheDocument();
  });

  it('renders table with headers when data is loaded', () => {
    render(<OperationTableDetails {...defaultProps} loading={false} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('P95 Latency')).toBeInTheDocument();
    expect(screen.getByText('Request rate')).toBeInTheDocument();
    expect(screen.getByText('Error rate')).toBeInTheDocument();
    expect(screen.getByText('Impact')).toBeInTheDocument();
  });

  it('renders table with data', () => {
    render(<OperationTableDetails {...defaultProps} loading={false} data={serviceOpsMetrics} />);
    expect(screen.getByText('/PlaceOrder')).toBeInTheDocument();
  });

  describe('Data formatting', () => {
    it('formats latency values correctly', () => {
      const data = [{
        ...serviceOpsMetrics[0],
        latency: 8000,
        dataPoints: {
          ...serviceOpsMetrics[0].dataPoints,
          service_operation_latencies: [{ x: 1631534436235, y: 8000 }],
        },
      }];
      render(<OperationTableDetails {...defaultProps} loading={false} data={data} />);
      expect(screen.getByText('8.00s')).toBeInTheDocument();
    });

    it('formats request rate values correctly', () => {
      const data = [{
        ...serviceOpsMetrics[0],
        requests: 0.02,
        dataPoints: {
          ...serviceOpsMetrics[0].dataPoints,
          service_operation_call_rate: [{ x: 1631534436235, y: 0.02 }],
        },
      }];
      render(<OperationTableDetails {...defaultProps} loading={false} data={data} />);
      expect(screen.getByText('< 0.1 req/s')).toBeInTheDocument();
    });

    it('formats error rate values correctly', () => {
      const data = [{
        ...serviceOpsMetrics[0],
        errRates: 0.00001,
        dataPoints: {
          ...serviceOpsMetrics[0].dataPoints,
          service_operation_error_rate: [{ x: 1631534436235, y: 0.00001 }],
        },
      }];
      render(<OperationTableDetails {...defaultProps} loading={false} data={data} />);
      expect(screen.getByText('< 0.1%')).toBeInTheDocument();
    });
  });

  describe('User interactions', () => {
    it('shows view traces button on row hover', async () => {
      const user = userEvent.setup();
      render(<OperationTableDetails {...defaultProps} loading={false} data={serviceOpsMetrics} />);
      
      const row = screen.getByText('/PlaceOrder').closest('tr');
      await user.hover(row);
      
      expect(screen.getByText('View traces')).toBeInTheDocument();
    });

    it('tracks sort operations', async () => {
      const user = userEvent.setup();
      const trackSortOperationsSpy = jest.spyOn(track, 'trackSortOperations');
      
      render(<OperationTableDetails {...defaultProps} loading={false} data={serviceOpsMetrics} />);
      
      const nameSorter = screen.getByRole('columnheader', { name: /name/i });
      await user.click(nameSorter);
      
      expect(trackSortOperationsSpy).toHaveBeenCalledWith('Name');
      trackSortOperationsSpy.mockReset();
    });

    it('tracks view traces click', async () => {
      const user = userEvent.setup();
      const trackViewTracesSpy = jest.spyOn(track, 'trackViewTraces');
      
      render(<OperationTableDetails {...defaultProps} loading={false} data={serviceOpsMetrics} />);
      
      const row = screen.getByText('/PlaceOrder').closest('tr');
      await user.hover(row);
      
      const viewTracesButton = screen.getByText('View traces');
      await user.click(viewTracesButton);
      
      expect(trackViewTracesSpy).toHaveBeenCalledWith('/PlaceOrder');
      trackViewTracesSpy.mockReset();
    });
  });

  it('renders loading state', () => {
    render(<OperationTableDetails {...defaultProps} loading />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
