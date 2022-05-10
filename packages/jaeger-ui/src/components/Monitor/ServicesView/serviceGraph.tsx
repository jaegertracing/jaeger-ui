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
  XYPlot,
  XAxis,
  YAxis,
  HorizontalGridLines,
  LineSeries,
  AreaSeries,
  Crosshair,
  DiscreteColorLegend,
  // @ts-ignore
} from 'react-vis';
import LoadingIndicator from '../../common/LoadingIndicator';
import { ServiceMetricsObject, Points } from '../../../types/metrics';
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

  renderLines() {
    const { metricsData, color } = this.props;

    if (metricsData) {
      const graphs: any = [];
      let i = 0;

      this.getData().forEach((line: ServiceMetricsObject, idx: number) => {
        graphs.push(
          <AreaSeries
            key={i++}
            data={line.metricPoints ? line.metricPoints : []}
            getNull={(d: Points) => d.y !== null}
            onNearestX={(_datapoint: Points, { index }: { index: number }) => {
              this.setState({
                crosshairValues: this.getData().map((d: ServiceMetricsObject) => ({
                  ...d.metricPoints[index],
                  label: d.quantile,
                })),
              });
            }}
            opacity={0.1}
            color={[color || this.colors[idx]]}
          />
        );
        graphs.push(
          <LineSeries
            getNull={(d: Points) => d.y !== null}
            key={i++}
            data={line.metricPoints ? line.metricPoints : []}
            color={[color || this.colors[idx]]}
          />
        );
      });

      return graphs;
    }

    return [];
  }

  generatePlaceholder(placeHolder: string | JSX.Element) {
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
      <XYPlot
        margin={{ bottom: 25 }}
        onMouseLeave={() => this.setState({ crosshairValues: [] })}
        width={width}
        height={this.height - 74}
        xDomain={xDomain}
        yDomain={yDomain}
      >
        {showHorizontalLines ? <HorizontalGridLines /> : null}
        <XAxis tickFormat={tickFormat} tickTotal={Math.floor(width / 60)} />
        <YAxis tickFormat={yAxisTickFormat} />
        {this.renderLines()}
        <Crosshair values={this.state.crosshairValues}>
          <div className="crosshair-value">
            {this.state.crosshairValues[0] &&
              `${new Date(this.state.crosshairValues[0].x).toLocaleDateString()} ${new Date(
                this.state.crosshairValues[0].x
              ).toLocaleTimeString()}`}
            {this.state.crosshairValues.reverse().map((d: TCrossHairValues) =>
              showLegend ? (
                <div key={d.label}>
                  P{d.label * 100}: {d.y}
                </div>
              ) : (
                <div key={d.label}>{d.y}</div>
              )
            )}
          </div>
        </Crosshair>
        {showLegend ? (
          <DiscreteColorLegend
            className="legend-label"
            orientation="horizontal"
            items={this.getData()
              .map((d: ServiceMetricsObject, idx: number) => ({
                color: this.colors[idx],
                title: `${d.quantile * 100}th`,
              }))
              .reverse()}
          />
        ) : null}
      </XYPlot>
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
