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

import * as React from 'react';
import { Row, Table, Progress, Button, Icon, Tooltip } from 'antd';
import REDGraph from './opsGraph';
import LoadingIndicator from '../../../common/LoadingIndicator';
import { MetricsReduxState, ServiceOpsMetrics } from '../../../../types/metrics';
import prefixUrl from '../../../../utils/prefix-url';

import './index.css';
import {
  convertTimeUnitToShortTerm,
  convertToTimeUnit,
  getSuitableTimeUnit,
  timeConversion,
} from '../../../../utils/date';

type TProps = {
  data: ServiceOpsMetrics[] | undefined;
  error: MetricsReduxState['opsError'];
  loading: boolean | null;
  endTime: number;
  lookback: number;
  serviceName: string;
};

type TState = {
  hoveredRowKey: number;
};

function formatValue(value: number) {
  if (value < 0.1) {
    return `< 0.1`;
  }

  // Truncate number to two decimal places
  return `${value.toString().match(/^-?\d+(?:\.\d{0,2})?/)![0]}`;
}

function formatTimeValue(value: number) {
  const timeUnit = getSuitableTimeUnit(value);

  const formattedTime = formatValue(convertToTimeUnit(value, timeUnit));
  return `${formattedTime}${convertTimeUnitToShortTerm(timeUnit)}`;
}
export class OperationTableDetails extends React.PureComponent<TProps, TState> {
  state = {
    hoveredRowKey: -1,
  };

  render() {
    const { loading, error } = this.props;

    if (loading) {
      return <LoadingIndicator centered />;
    }

    if (error.opsCalls && error.opsErrors && error.opsLatencies) {
      return <div className="ops-table-error-placeholder">Couldn’t fetch data</div>;
    }

    const columnConfig = [
      {
        title: 'Name',
        className: 'header-item',
        dataIndex: 'name',
        key: 'name',
        sorter: (a: ServiceOpsMetrics, b: ServiceOpsMetrics) => a.name.localeCompare(b.name),
      },
      {
        title: 'P95 Latency',
        className: 'header-item',
        dataIndex: 'latency',
        key: 'latency',
        sorter: (a: ServiceOpsMetrics, b: ServiceOpsMetrics) => a.latency - b.latency,
        render: (value: ServiceOpsMetrics['latency'], row: ServiceOpsMetrics) => (
          <div className="column-container">
            <REDGraph
              dataPoints={row.dataPoints.service_operation_latencies}
              color="#869ADD"
              error={error.opsLatencies}
            />
            <div className="table-graph-avg">
              {typeof value === 'number' && row.dataPoints.service_operation_latencies.length > 0
                ? formatTimeValue(value * 1000)
                : ''}
            </div>
          </div>
        ),
      },
      {
        title: 'Request rate',
        className: 'header-item',
        dataIndex: 'requests',
        key: 'requests',
        sorter: (a: ServiceOpsMetrics, b: ServiceOpsMetrics) => a.requests - b.requests,
        render: (value: ServiceOpsMetrics['requests'], row: ServiceOpsMetrics) => (
          <div className="column-container">
            <REDGraph
              dataPoints={row.dataPoints.service_operation_call_rate}
              color="#4795BA"
              error={error.opsCalls}
            />
            <div className="table-graph-avg">
              {typeof value === 'number' && row.dataPoints.service_operation_call_rate.length > 0
                ? `${formatValue(value)} req/s`
                : ''}
            </div>
          </div>
        ),
      },
      {
        title: 'Error rate',
        className: 'header-item',
        dataIndex: 'errRates',
        key: 'errRates',
        sorter: (a: ServiceOpsMetrics, b: ServiceOpsMetrics) => a.errRates - b.errRates,
        render: (value: ServiceOpsMetrics['errRates'], row: ServiceOpsMetrics) => (
          <div className="column-container">
            <REDGraph
              dataPoints={row.dataPoints.service_operation_error_rate}
              color="#CD513A"
              yDomain={[0, 1]}
              error={error.opsErrors}
            />
            <div className="table-graph-avg">
              {typeof value === 'number' && row.dataPoints.service_operation_error_rate.length > 0
                ? `${formatValue(value * 100)}%`
                : ''}
            </div>
          </div>
        ),
      },
      {
        title: (
          <div style={{ paddingTop: 1 }}>
            <span style={{ float: 'left', color: '#459798' }}>
              Impact &nbsp;
              <Tooltip
                overlayClassName="impact-tooltip"
                placement="top"
                title="The result of multiplying avg. duration and requests per minute, showing the most used and slowest endpoints"
              >
                <Icon type="info-circle" />
              </Tooltip>
            </span>
          </div>
        ),
        className: 'header-item',
        dataIndex: 'impact',
        key: 'impact',
        defaultSortOrder: 'descend' as 'ascend' | 'descend' | undefined,
        sorter: (a: ServiceOpsMetrics, b: ServiceOpsMetrics) => a.impact - b.impact,
        render: (value: ServiceOpsMetrics['impact'], row: ServiceOpsMetrics) => {
          let viewTraceButton = null;
          if (this.state.hoveredRowKey === row.key) {
            const { endTime, lookback, serviceName } = this.props;
            viewTraceButton = (
              <Button
                href={prefixUrl(
                  `/search?end=${endTime}000&limit=20&lookback=${lookback /
                    (3600 * 1000)}h&maxDuration&minDuration&operation=${encodeURIComponent(
                    row.name
                  )}&service=${serviceName}&start=${endTime - lookback}000`
                )}
                target="blank"
              >
                View traces
              </Button>
            );
          }

          return {
            children: (
              <div className="column-container">
                <Progress
                  className="impact"
                  percent={value * 100}
                  strokeLinecap="square"
                  strokeColor="#459798"
                  showInfo={false}
                />
                <div className="view-trace-button">{viewTraceButton}</div>
              </div>
            ),
          };
        },
      },
    ];

    return (
      <Row>
        <Table
          rowClassName={() => 'table-row'}
          columns={columnConfig}
          dataSource={this.props.data}
          pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] }}
          onRow={() => {
            return {
              onMouseEnter: (event: any) => {
                this.setState({
                  hoveredRowKey: parseInt(event.currentTarget.getAttribute('data-row-key'), 10),
                });
              },
              onMouseLeave: () => {
                this.setState({
                  hoveredRowKey: -1,
                });
              },
            };
          }}
        />
      </Row>
    );
  }
}

export default OperationTableDetails;
