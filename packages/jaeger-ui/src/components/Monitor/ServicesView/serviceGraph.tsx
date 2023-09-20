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
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import LoadingIndicator from '../../common/LoadingIndicator';
import { ServiceMetricsObject } from '../../../types/metrics';
import './serviceGraph.css';
import { ApiError } from '../../../types/api-error';

type TProps = {
  width: number;
  error: null | ApiError;
  name: string;
  metricsData: ServiceMetricsObject | ServiceMetricsObject[] | null;
  loading: boolean;
  showLegend?: boolean;
  showHorizontalLines?: boolean;
  yDomain?: number[];
  color?: string;
  marginClassName?: string;
  yAxisTickFormat?: (v: number) => string;
  xDomain: number[];
};

// export for tests
export const tickFormat = (v: number) => {
  const dateObj = new Date(v);
  const hours = dateObj.getHours().toString();
  const minutes = dateObj.getMinutes().toString();

  return `${hours.length === 1 ? `0${hours}` : hours}:${minutes.length === 1 ? `0${minutes}` : minutes}`;
};

// export for tests
export class ServiceGraphImpl extends React.PureComponent<TProps> {
  height = 242;
  colors: string[] = ['#DCA3D2', '#EA9977', '#869ADD'];

  getData(): ServiceMetricsObject[] {
    const { metricsData } = this.props;

    // istanbul ignore next : TS required to check, but we do it in render function
    if (metricsData === null) {
      return [];
    }

    return Array.isArray(metricsData) ? metricsData : [metricsData];
  }

  renderLines() {
    const { metricsData, color } = this.props;

    if (metricsData) {
      const graphs: any = [];
      let i = 0;

      this.getData().forEach((line: ServiceMetricsObject, idx: number) => {
        graphs.push(
          <Area
            key={i++}
            type="monotone"
            dataKey="y"
            connectNulls
            fillOpacity={0.1}
            stroke={color || this.colors[idx]}
            fill={color || this.colors[idx]}
          />
        );
        graphs.push(
          <Line connectNulls key={i++} type="monotone" dataKey="y" stroke={color || this.colors[idx]} />
        );
      });

      return graphs;
    }

    return [];
  }

  generatePlaceholder(placeHolder: string | React.ReactNode) {
    const { width } = this.props;

    return (
      <div
        className="center-placeholder"
        style={{
          width,
          height: this.height - 74,
        }}
      >
        {placeHolder}
      </div>
    );
  }

  render() {
    const {
      width,
      yDomain,
      showHorizontalLines,
      showLegend,
      loading,
      metricsData,
      marginClassName,
      name,
      error,
      yAxisTickFormat,
      xDomain,
    } = this.props;
    let GraphComponent = this.generatePlaceholder(<LoadingIndicator centered />);
    const noDataComponent = this.generatePlaceholder('No Data');
    const apiErrorComponent = this.generatePlaceholder('Couldn’t fetch data');

    const Plot = (
      <ResponsiveContainer width={width} height={this.height - 74}>
        <ComposedChart data={this.getData()} margin={{ bottom: 25 }}>
          <CartesianGrid horizontal={showHorizontalLines} vertical={false} />
          <XAxis
            dataKey="x"
            reversed
            tickFormatter={tickFormat}
            interval={Math.floor(width / 60)}
            domain={xDomain}
          />
          <YAxis tickFormatter={yAxisTickFormat} domain={yDomain} />
          {this.renderLines()}

          <Tooltip
            contentStyle={{ width: 140, color: '#6b6b76' }}
            formatter={(value: number, _name: string, entry: any) => {
              const formattedLabel = new Date(entry.payload.x).toLocaleTimeString();
              const tooltipContent = [
                `label: ${entry.payload.label * 100}`,
                `x: ${formattedLabel}`,
                `Y: ${entry.payload.y}`,
              ];

              return tooltipContent;
            }}
          />
          {showLegend && (
            <Legend
              verticalAlign="top"
              margin={{ left: '10px' }}
              formatter={(value: any, entry: any, index: number) => {
                const dataVal = this.getData();
                const idx = dataVal.length - index - 1;
                return `${dataVal[idx].quantile * 100}th`;
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );

    if (!loading && xDomain.length > 0) {
      GraphComponent = metricsData === null ? noDataComponent : Plot;
    }

    if (error) {
      GraphComponent = apiErrorComponent;
    }

    return (
      <div
        className={`graph-container ${marginClassName}`}
        style={{
          height: this.height,
        }}
      >
        <h3 className="graph-header">{name}</h3>
        {GraphComponent}
      </div>
    );
  }
}

export default ServiceGraphImpl;
