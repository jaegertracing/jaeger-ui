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
import LoadingIndicator from '../../common/LoadingIndicator';
import { ServiceMetricsObject, Points } from '../../../types/metrics';
import './serviceGraph.css';
import { ApiError } from '../../../types/api-error';
import {
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

type TCrossHairValues = {
  label: number;
  x: number;
  y: number | null;
};

// export for tests
export const tickFormat = (v: number) => {
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
  children: string | React.ReactNode;
};

const Placeholder = ({ name, marginClassName, width, height, children }: TPlaceholder) => {
  return (
    <div
      className={`graph-container ${marginClassName}`}
      style={{
        height,
      }}
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

// export for tests
export class ServiceGraphImpl extends React.PureComponent<TProps> {
  height = 242;
  colors: string[] = ['#DCA3D2', '#EA9977', '#869ADD'];
  state: { crosshairValues: TCrossHairValues[] } = {
    crosshairValues: [],
  };

  getData(): ServiceMetricsObject[] {
    const { metricsData } = this.props;

    // istanbul ignore next : TS required to check, but we do it in render function
    if (metricsData === null) {
      return [];
    }

    return Array.isArray(metricsData) ? metricsData : [metricsData];
  }

  getMetricsData(): number[] {
    const serviceMetricObjects = this.getData();
    // Create data array for recharts with length of the first metricPoint
    let result = Array(serviceMetricObjects[0].metricPoints.length);
    // Loop through len and create array objects of data
    for (let i = 0; i < serviceMetricObjects[0].metricPoints.length; i++) {
      result[i] = {
        x: serviceMetricObjects[0].metricPoints[i].x,
        ...serviceMetricObjects.reduce((acc: Record<string, number>, obj) => {
          acc[obj.quantile.toString()] = obj.metricPoints[i].y ?? 0;
          return acc;
        }, {}),
      };
    }
    return result;
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
            type="linear"
            dataKey={line.quantile.toString()}
            stroke={color || this.colors[idx]}
            strokeWidth={2}
            fill={color || this.colors[idx]}
            fillOpacity={0.1}
          />
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

    if (loading || xDomain.length === 0)
      return <Placeholder
        name={name}
        marginClassName={marginClassName}
        width={width}
        height={this.height}>
        <LoadingIndicator centered />
      </Placeholder>;

    if (error)
      return <Placeholder
        name={name}
        marginClassName={marginClassName}
        width={width}
        height={this.height}>
        Couldn't fetch data
      </Placeholder>;

    if (metricsData === null)
      return <Placeholder
        name={name}
        marginClassName={marginClassName}
        width={width}
        height={this.height}>
        No Data
      </Placeholder>;

    return <Placeholder
      name={name}
      marginClassName={marginClassName}
      width={width}
      height={this.height}>
      <ResponsiveContainer width="100%" height={this.height}>
        <AreaChart data={this.getMetricsData()} margin={{ top: 20, bottom: 55 }}>
          <XAxis
            domain={xDomain}
            tickFormatter={tickFormat}
            tickCount={Math.floor(width / 60)}
            dataKey="x"
            fontSize="11px"
            tickLine={{ stroke: '#e6e6e9', strokeWidth: 2 }}
            axisLine={{ stroke: '#e6e6e9', strokeWidth: 2 }}
            height={30}
            reversed />
          <YAxis
            domain={yDomain}
            tickFormatter={yAxisTickFormat}
            tickLine={{ stroke: '#e6e6e9', strokeWidth: 2 }}
            axisLine={{ stroke: '#e6e6e9', strokeWidth: 2 }}
            width={30}
            dataKey="0.95"
            fontSize="0.625rem" />
          <CartesianGrid horizontal={showHorizontalLines} vertical={false} />

          {this.renderLines()}

          <Tooltip
            labelStyle={{ fontSize: "0.625rem" }}
            itemStyle={{ fontSize: "0.625rem" }}
            labelFormatter={(value) => {
              return new Date(value).toLocaleString()
            }}
            formatter={(value: number, name: string, props: any) => {
              if (!showLegend) {
                return [value];
              }

              const formattedName = Number(name) * 100;
              return [value, `P${formattedName}`];
            }} />

          {showLegend && (
            <Legend
              align='left'
              verticalAlign="bottom"
              height={10}
              iconType='plainline'
              formatter={(value: any, entry: any, index: number) => {
                const dataVal = this.getData();
                const idx = dataVal.length - index - 1;
                return <span style={{ fontSize: "0.625rem" }}>{dataVal[idx].quantile * 100}th</span>;
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </Placeholder>;
  }
}

export default ServiceGraphImpl;
