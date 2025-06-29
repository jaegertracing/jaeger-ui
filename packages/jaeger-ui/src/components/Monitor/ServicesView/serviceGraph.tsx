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
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

type TPlaceholder = {
  name: string;
  marginClassName?: string;
  width: number;
  height: number;
  children: React.ReactNode;
};

// Helper functions are exported for individual testing
export const tickFormat = (v: number): string => {
  const dateObj = new Date(v);
  const hours = dateObj.getHours().toString();
  const minutes = dateObj.getMinutes().toString();

  return `${hours.length === 1 ? `0${hours}` : hours}:${minutes.length === 1 ? `0${minutes}` : minutes}`;
};

export const getData = (
  metricsData: ServiceMetricsObject | ServiceMetricsObject[] | null
): ServiceMetricsObject[] => {
  if (metricsData === null) {
    return [];
  }
  const data = Array.isArray(metricsData) ? metricsData : [metricsData];
  return data.sort((a, b) => b.quantile - a.quantile);
};

export const getMetricsData = (
  metricsData: ServiceMetricsObject | ServiceMetricsObject[] | null
): MetricDataPoint[] => {
  const serviceMetricObjects = getData(metricsData);
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
};

export const calculateYDomain = (data: MetricDataPoint[]): number[] => {
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

  // Check for min === max to avoid issues with log10(0)
  if (max === min) {
    const padding = max * 0.1 || 0.1;
    return [Math.max(0, min - padding), max + padding];
  }

  const range = max - min;
  const padding = range * 0.1;
  min = Math.max(0, min - padding);
  max += padding;

  const magnitude = Math.floor(Math.log10(max - min));
  const roundTo = 10 ** (magnitude - 1);

  return [Math.floor(min / roundTo) * roundTo, Math.ceil(max / roundTo) * roundTo];
};

export const calculateYAxisTicks = (domain: number[]): number[] => {
  const [min, max] = domain;
  // Ensure step is not zero
  const step = (max - min) / 4 || 0.25;
  return Array.from({ length: 5 }, (_, i) => min + step * i);
};

export const formatYAxisTick = (
  value: number,
  name: string,
  yAxisTickFormat?: (v: number) => number
): string => {
  if (yAxisTickFormat) {
    return String(yAxisTickFormat(value));
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

export const calculateNumericTicks = (xDomain: number[]): number[] => {
  const [start, end] = xDomain;
  const count = 7;
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => start + step * i);
};

export const Placeholder = ({
  name,
  marginClassName,
  width,
  height,
  children,
}: TPlaceholder): JSX.Element => {
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

const ServiceGraphImpl: React.FC<TProps> = ({
  width,
  error,
  name,
  metricsData,
  loading,
  showLegend = false,
  showHorizontalLines = false,
  yDomain,
  color,
  marginClassName,
  yAxisTickFormat,
  xDomain,
}) => {
  const height = 242;
  const colors: string[] = ['#869ADD', '#EA9977', '#DCA3D2'];

  const data = React.useMemo(() => getMetricsData(metricsData), [metricsData]);
  const sortedMetrics = React.useMemo(() => getData(metricsData), [metricsData]);

  const renderLines = () => {
    return sortedMetrics.map((line, idx) => (
      <Area
        key={line.quantile}
        type="linear"
        dataKey={line.quantile.toString()}
        stroke={color || colors[idx % colors.length]}
        strokeWidth={2}
        fill={color || colors[idx % colors.length]}
        fillOpacity={0.1}
        connectNulls={false}
        isAnimationActive={false}
      />
    ));
  };

  if (loading || !xDomain || xDomain[0] === undefined || xDomain[1] === undefined) {
    return (
      <Placeholder name={name} marginClassName={marginClassName} width={width} height={height}>
        <LoadingIndicator centered data-testid="loading-indicator" />
      </Placeholder>
    );
  }

  if (error) {
    return (
      <Placeholder name={name} marginClassName={marginClassName} width={width} height={height}>
        Could not fetch data
      </Placeholder>
    );
  }

  if (metricsData === null || data.length === 0) {
    return (
      <Placeholder name={name} marginClassName={marginClassName} width={width} height={height}>
        No Data
      </Placeholder>
    );
  }

  const effectiveYDomain = yDomain || calculateYDomain(data);

  const legendFormatter = (value: string): JSX.Element => {
    const quantile = parseFloat(value);
    return <span>{quantile * 100}th</span>;
  };

  const yTickFormatter = (value: number) => formatYAxisTick(value, name, yAxisTickFormat);
  const xTicks = calculateNumericTicks(xDomain);
  const yTicks = calculateYAxisTicks(effectiveYDomain);

  return (
    <Placeholder name={name} marginClassName={marginClassName} width={width} height={height}>
      <ResponsiveContainer width="100%" height={height}>
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
            ticks={xTicks}
            tickMargin={4}
            tick={{ dx: 0, dy: 4 }}
          />
          <YAxis
            domain={effectiveYDomain}
            tickFormatter={yTickFormatter}
            className="graph-y-axis"
            tickLine={{ className: 'graph-axis' }}
            axisLine={{ className: 'graph-axis' }}
            width={45}
            ticks={yTicks}
            tickMargin={4}
            tick={{ dx: -4, dy: 0 }}
          />
          <CartesianGrid horizontal={showHorizontalLines} vertical={false} />

          {renderLines()}

          <Tooltip
            contentStyle={{ fontSize: '0.625rem' }}
            labelFormatter={(value: number) => new Date(value).toLocaleString()}
            formatter={(value: number, uname: string) => {
              const formattedValue = yTickFormatter(value);
              if (!showLegend) {
                return [formattedValue];
              }
              const formattedName = Number(uname) * 100;
              return [formattedValue, `P${formattedName}`];
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
};

export default ServiceGraphImpl;
