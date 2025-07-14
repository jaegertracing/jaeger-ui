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
import OperationTableDetails from '.';
import { originInitialState, serviceOpsMetrics } from '../../../../reducers/metrics.mock';
import * as track from './index.track';

jest.mock('../../../../utils/prefix-url', () => jest.fn(url => url));

jest.mock('../../../common/LoadingIndicator', () => {
  return function MockLoadingIndicator(props) {
    return (
      <div data-testid="loading-indicator" {...props}>
        Loading...
      </div>
    );
  };
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
  let originalProps;

  beforeEach(() => {
    originalProps = { ...props };
    jest.clearAllMocks();
  });

  it('render No data table', () => {
    const { container } = render(<OperationTableDetails {...props} loading={false} />);
    expect(container.querySelector('table')).toBeInTheDocument();
  });

  it('render some values in the table', () => {
    const { container } = render(
      <OperationTableDetails {...props} data={serviceOpsMetrics} loading={false} />
    );
    expect(container.querySelector('table')).toBeInTheDocument();
    expect(screen.getByText('/PlaceOrder')).toBeInTheDocument();
  });

  it('render latency in seconds in the table', () => {
    const cloneServiceOpsMetrics = { ...serviceOpsMetrics[0] };
    cloneServiceOpsMetrics.latency = 8000;
    render(<OperationTableDetails {...props} data={[cloneServiceOpsMetrics]} loading={false} />);
    expect(screen.getByText('8s')).toBeInTheDocument();
  });

  it('render lower than 0.1 request rate value', () => {
    const cloneServiceOpsMetrics = { ...serviceOpsMetrics[0] };
    cloneServiceOpsMetrics.requests = 0.02;
    render(<OperationTableDetails {...props} data={[cloneServiceOpsMetrics]} loading={false} />);
    expect(screen.getByText('< 0.1 req/s')).toBeInTheDocument();
  });

  it('render request rate number with more than 2 decimal places value', () => {
    const cloneServiceOpsMetrics = { ...serviceOpsMetrics[0] };
    cloneServiceOpsMetrics.requests = 0.2888;
    render(<OperationTableDetails {...props} data={[cloneServiceOpsMetrics]} loading={false} />);
    expect(screen.getByText('0.28 req/s')).toBeInTheDocument();
  });

  it('render lower than 0.1 error rate', () => {
    const cloneServiceOpsMetrics = { ...serviceOpsMetrics[0] };
    cloneServiceOpsMetrics.errRates = 0.00001;
    const { container } = render(
      <OperationTableDetails {...props} data={[cloneServiceOpsMetrics]} loading={false} />
    );
    expect(container.querySelector('table')).toBeInTheDocument();
  });

  it('render error rate with more than 2 decimal places value', () => {
    const cloneServiceOpsMetrics = { ...serviceOpsMetrics[0] };
    cloneServiceOpsMetrics.latency = 33.333333;
    const { container } = render(
      <OperationTableDetails {...props} data={[cloneServiceOpsMetrics]} loading={false} />
    );
    expect(container.querySelector('table')).toBeInTheDocument();
  });

  it('render lower than 0.1 P95 latency', () => {
    const cloneServiceOpsMetrics = { ...serviceOpsMetrics[0] };
    cloneServiceOpsMetrics.latency = 0.00001;
    const { container } = render(
      <OperationTableDetails {...props} data={[cloneServiceOpsMetrics]} loading={false} />
    );
    expect(container.querySelector('table')).toBeInTheDocument();
  });

  it('render P95 latency with more than 2 decimal places value', () => {
    const cloneServiceOpsMetrics = { ...serviceOpsMetrics[0] };
    cloneServiceOpsMetrics.latency = 0.2988;
    const { container } = render(
      <OperationTableDetails {...props} data={[cloneServiceOpsMetrics]} loading={false} />
    );
    expect(container.querySelector('table')).toBeInTheDocument();
  });

  it('test column render function', () => {
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
    const { container } = render(<OperationTableDetails {...props} data={data} loading={false} />);
    expect(container.querySelector('table')).toBeInTheDocument();
  });

  it('highlight the row', () => {
    render(<OperationTableDetails {...props} data={serviceOpsMetrics} loading={false} />);

    const tableRow = screen.getAllByRole('row')[1];

    fireEvent.mouseEnter(tableRow);
    expect(tableRow).toHaveClass('table-row--hovered');
    expect(screen.getByText('View traces')).toBeInTheDocument();

    fireEvent.mouseLeave(tableRow);
    expect(tableRow).not.toHaveClass('table-row--hovered');
    expect(screen.queryByText('View traces')).not.toBeInTheDocument();
  });

  it('sort row', () => {
    const data = [...serviceOpsMetrics];
    data.push({
      dataPoints: {
        avg: {
          service_operation_call_rate: 0.02,
          service_operation_error_rate: 2,
          service_operation_latencies: 800.16,
        },
        service_operation_call_rate: [
          {
            x: 1631534436235,
            y: 0.01,
          },
          {
            x: 1631534496235,
            y: 0.01,
          },
        ],
        service_operation_error_rate: [
          {
            x: 1631534436235,
            y: 1,
          },
          {
            x: 1631534496235,
            y: 1,
          },
        ],
        service_operation_latencies: [
          {
            x: 1631534436235,
            y: 737.33,
          },
          {
            x: 1631534496235,
            y: 735,
          },
        ],
      },
      errRates: 2,
      impact: 0,
      key: 1,
      latency: 800.16,
      name: '/Accounts',
      requests: 0.002,
    });

    render(<OperationTableDetails {...props} data={data} loading={false} />);

    let cells = screen.getAllByRole('cell');
    expect(cells[0].textContent).toBe('/PlaceOrder');

    const nameHeader = screen.getByText('Name').closest('th');
    const ascSorter = nameHeader.querySelector('.ant-table-column-sorter-up');
    fireEvent.click(ascSorter);

    cells = screen.getAllByRole('cell');
    expect(cells[0].textContent).toBe('/Accounts');

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
  });

  it('Graph avg label test', () => {
    const data = [
      {
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
        errRates: 1,
        impact: 2,
        key: 1,
        latency: 3,
        name: '/Accounts',
        requests: 4,
      },
    ];

    const { container } = render(<OperationTableDetails {...props} data={data} loading={false} />);

    const avgDivs = container.querySelectorAll('div.table-graph-avg');

    avgDivs.forEach(div => {
      expect(div.textContent).toBe('');
    });
  });

  it('Should track all events', () => {
    const trackSortOperationsSpy = jest.spyOn(track, 'trackSortOperations');
    const trackViewTracesSpy = jest.spyOn(track, 'trackViewTraces');

    render(<OperationTableDetails {...props} data={serviceOpsMetrics} loading={false} />);

    const tableRow = screen.getAllByRole('row')[1];
    fireEvent.mouseEnter(tableRow);
    const viewTracesButton = screen.getByText('View traces');
    fireEvent.click(viewTracesButton);

    expect(trackViewTracesSpy).toHaveBeenCalledWith(serviceOpsMetrics[0].name);

    const nameHeader = screen.getByText('Name').closest('th');
    fireEvent.click(nameHeader);
    expect(trackSortOperationsSpy).toHaveBeenCalledWith('Name');

    const impactHeader = screen.getByText('Impact').closest('th');
    fireEvent.click(impactHeader);
    expect(trackSortOperationsSpy).toHaveBeenCalledWith('Impact');
  });
});
