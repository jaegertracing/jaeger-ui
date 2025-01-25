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
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { ApiError } from '../../../../types/api-error';
import { Points } from '../../../../types/metrics';

import './opsGraph.css';

type yDomain = [number, number];

type TProps = {
  color: string;
  dataPoints: Points[];
  yDomain?: yDomain;
  error: null | ApiError;
};

// export for tests
export class OperationsGraph extends React.PureComponent<TProps> {
  static generatePlaceholder(text: string) {
    return <div className="ops-graph-placeholder">{text}</div>;
  }

  render() {
    const { dataPoints, yDomain, color, error } = this.props;

    if (error) {
      return OperationsGraph.generatePlaceholder('Couldn’t fetch data');
    }

    if (dataPoints.length === 0) {
      return OperationsGraph.generatePlaceholder('No Data');
    }

    const dynProps: {
      domain?: yDomain;
    } = {};

    if (yDomain) {
      dynProps.domain = yDomain;
    }

    return (
      <div className="ops-container">
        <ResponsiveContainer width={100} height={15}>
          <AreaChart
            margin={{
              left: 0,
              right: 0,
              bottom: 0,
              top: 0,
            }}
            data={dataPoints}>
            <YAxis hide={true} {...dynProps} />
            <Area type="step" dataKey="y" stroke="none" fill={color} fillOpacity={1} baseValue={0.1} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }
}

export default OperationsGraph;
