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
import { AreaChart, Area, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
  yAxisTickFormat?: (v: number) => number;
  xDomain: number[];
};

type MetricDataPoint = {
  x: number;
  [key: string]: number | null;
};

export const tickFormat = (v: number): string => {
  const dateObj = new Date(v);
  const hours = dateObj.getHours().toString();
  const minutes = dateObj.getMinutes().toString();

  return `${hours.length === 1 ? `0${hours}` : hours}:${minutes.length === 1 ? `0${minutes}` : minutes}`;
};

type TPlaceholder = {
  name: string;
  marginClassName?: string;
  width: number;
  height: number;
  children: React.ReactNode;
};

export const Placeholder = ({
  name,
  marginClassName,
  width,
  height,
  children,
}: TPlaceholder): React.JSX.Element => {
  return (
    <div
      className={`graph-container ${marginClassName}`}
      style={{
        height,
      }}
      data-testid="service-graph"
    >
      <h3 className="graph-header">{name}</h3>
      <div
        className="center-placeholder"
        style={{
          width,
          height: height - 74,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export class ServiceGraphImpl extends React.PureComponent<TProps> {
  height = 242;
  colors: string[] = ['#869ADD', '#EA9977', '#DCA3D2'];

  getData(): ServiceMetricsObject[] {
    const { metricsData } = this.props;

    if (metricsData === null) {
      return [];
    }

    // Filter out objects with no metric points or empty metric points arrays
    const data = Array.isArray(metricsData)
      ? metricsData.filter(m => m && m.metricPoints && m.metricPoints.length > 0)
      : metricsData && metricsData.metricPoints && metricsData.metricPoints.length > 0
        ? [metricsData]
        : [];

    return data.sort((a, b) => b.quantile - a.quantile);
  }

  getMetricsData(): MetricDataPoint[] {
    const serviceMetricObjects = this.getData();
    if (serviceMetricObjects.length === 0 || !serviceMetricObjects[0].metricPoints) {
      return [];
    }

    const result = Array(serviceMetricObjects[0].metricPoints.length);
    for (let i = 0; i < serviceMetricObjects[0].metricPoints.length; i++) {
      result[i] = {
        x: serviceMetricObjects[0].metricPoints[i].x,
        ...serviceMetricObjects.reduce((acc: Record<string, number | null>, obj) => {
          acc[obj.quantile.toString()] = obj.metricPoints[i].y;
          return acc;
        }, {}),
      };
    }
    return result;
  }

  calculateYDomain(data: MetricDataPoint[]): number[] {
    if (!data || data.length === 0) return [0, 1];

    let min = Infinity;
    let max = -Infinity;

    data.forEach(point => {
      Object.entries(point).forEach(([key, value]) => {
        if (key !== 'x' && value !== null) {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      });
    });

    if (min === Infinity || max === -Infinity) return [0, 1];

    const range = max - min;
    const padding = range * 0.1;
    min = Math.max(0, min - padding);
    max += padding;

    const magnitude = Math.floor(Math.log10(max - min));
    const roundTo = 10 ** (magnitude - 1);

    return [Math.floor(min / roundTo) * roundTo, Math.ceil(max / roundTo) * roundTo];
  }

  calculateYAxisTicks(domain: number[]): number[] {
    const [min, max] = domain;
    const step = (max - min) / 4;
    return Array.from({ length: 5 }, (_, i) => min + step * i);
  }

  formatYAxisTick = (value: number): string => {
    const { name } = this.props;

    if (this.props.yAxisTickFormat) {
      return String(this.props.yAxisTickFormat(value));
    }

    if (name.includes('Error rate')) {
      return value.toFixed(0);
    }

    if (value === 0) return '0';
    if (value < 0.01) return value.toExponential(2);
    if (value < 1) return value.toFixed(3);
    if (value < 10) return value.toFixed(2);
    if (value < 100) return value.toFixed(1);
    return value.toFixed(0);
  };

  renderLines(): React.JSX.Element[] {
    const { metricsData, color } = this.props;

    if (metricsData) {
      const graphs: React.JSX.Element[] = [];
      let i = 0;

      this.getData().forEach((line: ServiceMetricsObject, idx: number) => {
        graphs.push(
          <Area
            key={i++}
            type="linear"
            dataKey={line.quantile.toString()}
            stroke={color || this.colors[idx]}
            strokeWidth={2}
            fill={color || this.colors[idx]}
            fillOpacity={0.1}
            connectNulls={false}
            isAnimationActive={false}
          />
        );
      });

      return graphs;
    }

    return [];
  }

  generatePlaceholder(placeHolder: React.ReactNode): React.JSX.Element {
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

  calculateNumericTicks(xDomain: number[]): number[] {
    const [start, end] = xDomain;
    const count = 7;
    const step = (end - start) / (count - 1);

    return Array.from({ length: count }, (_, i) => start + step * i);
  }

  render(): React.JSX.Element {
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
      xDomain,
    } = this.props;

    if (loading || !xDomain || xDomain[0] === undefined || xDomain[1] === undefined)
      return (
        <Placeholder name={name} marginClassName={marginClassName} width={width} height={this.height}>
          <LoadingIndicator centered />
        </Placeholder>
      );

    if (error)
      return (
        <Placeholder name={name} marginClassName={marginClassName} width={width} height={this.height}>
          Could not fetch data
        </Placeholder>
      );

    const data = this.getMetricsData();

    // Check for null data or empty data or data with no valid y values
    let hasValidData = false;
    if (data.length > 0) {
      // Check if any data point has a valid y value
      for (const point of data) {
        for (const [key, value] of Object.entries(point)) {
          if (key !== 'x' && value !== null && value !== undefined && !isNaN(Number(value))) {
            hasValidData = true;
            break;
          }
        }
        if (hasValidData) break;
      }
    }

    if (metricsData === null || !hasValidData)
      return (
        <Placeholder name={name} marginClassName={marginClassName} width={width} height={this.height}>
          No data available
        </Placeholder>
      );

    const effectiveYDomain = yDomain || this.calculateYDomain(data);

    const legendFormatter = (value: string): React.JSX.Element => {
      const dataVal = this.getData();
      const foundIdx = dataVal.findIndex(d => d.quantile.toString() === value);
      if (foundIdx === -1) return <span>N/A</span>;
      const quantile = dataVal[foundIdx]?.quantile;
      if (quantile == null) return <span>N/A</span>;
      return <span>{quantile * 100}th</span>;
    };

    return (
      <Placeholder name={name} marginClassName={marginClassName} width={width} height={this.height}>
        <ResponsiveContainer width="100%" height={this.height}>
          <AreaChart data={data} margin={{ top: 20, bottom: 55, left: 0, right: 0 }}>
            <XAxis
              domain={xDomain}
              tickFormatter={tickFormat}
              dataKey="x"
              className="graph-x-axis"
              tickLine={{ className: 'graph-axis' }}
              axisLine={{ className: 'graph-axis' }}
              height={30}
              type="number"
              ticks={this.calculateNumericTicks(xDomain)}
              tickMargin={4}
              tick={{ dx: 0, dy: 4 }}
            />
            <YAxis
              domain={effectiveYDomain}
              tickFormatter={this.formatYAxisTick}
              className="graph-y-axis"
              tickLine={{ className: 'graph-axis' }}
              axisLine={{ className: 'graph-axis' }}
              width={45}
              ticks={this.calculateYAxisTicks(effectiveYDomain)}
              tickMargin={4}
              tick={{ dx: -4, dy: 0 }}
            />
            <CartesianGrid horizontal={showHorizontalLines} vertical={false} />

            {this.renderLines()}

            <Tooltip
              contentStyle={{ fontSize: '0.625rem' }}
              labelFormatter={(value: number) => new Date(value).toLocaleString()}
              formatter={(value: number, uname: string) => {
                if (!showLegend) {
                  return [this.formatYAxisTick(value)];
                }
                const formattedName = Number(uname) * 100;
                return [this.formatYAxisTick(value), `P${formattedName}`];
              }}
            />

            {showLegend && (
              <Legend
                align="left"
                verticalAlign="bottom"
                height={10}
                iconType="plainline"
                formatter={legendFormatter}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </Placeholder>
    );
  }
}

export default ServiceGraphImpl;
