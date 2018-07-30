// @flow

// Copyright (c) 2018 Uber Technologies, Inc.
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
import { Popover } from 'antd';
import cx from 'classnames';

// import DagNode from '../../../model/trace-dag/DagNode';
import { getAvgDurations, getRelativeDifference } from './avg-duration';
import { DARK, LIGHT } from './getColorInterpolator';
import {
  DurationDiffAbsolute,
  DurationDiffPercent,
  SpanCountDiffAbsolute,
  SpanCountDiffPercent,
} from './metric-renderers';
import DagNode from '../../../model/trace-dag/DagNode';
// import { formatDuration } from '../../../utils/date';

// import type { DiffMembers } from '../../../model/trace-dag/DagNode';
import type { PVertex } from '../../../model/trace-dag/types';

import './drawNode.css';

type Props = {
  diff: { a: ?DagNode, b: ?DagNode },
  getColor: ?(number) => { color: string, textColor: string },
  metric: ?string,
  operation: string,
  scaleOn: ?string,
  service: string,
};

// const abs = Math.abs;
// const max = Math.max;

// function getAvgDuration(denseSpans: ?DenseSpan[]) {
//   if (!denseSpans) {
//     return null;
//   }
//   let sum = 0;
//   for (let i = 0; i < denseSpans.length; i++) {
//     sum += denseSpans[i].span.duration;
//   }
//   return sum / denseSpans.length;
// }

class DiffNode extends React.PureComponent<Props> {
  props: Props;

  render() {
    const { diff, getColor, metric, operation, scaleOn, service } = this.props;
    let a;
    let b;
    if (metric === 'duration') {
      const durations = getAvgDurations(diff);
      a = durations.a;
      b = durations.b;
    } else {
      a = diff.a && diff.a.members.length;
      b = diff.b && diff.b.members.length;
    }
    // const { a, b } = getAvgDurations(diff);
    // const a = metric === 'duration' ? getAvgDuration(diff.a && diff.a.members) : diff.a && diff.a.members.length;
    // const b = metric === 'duration' ? getAvgDuration(diff.b && diff.b.members) : diff.b && diff.b.members.length;
    // const b = diff.b && getAvgDuration(diff.b.members);
    const isSame = a === b;
    let textColor = '';
    const style: Object = {};
    if (getColor && a !== b && a != null && b != null) {
      const change = scaleOn === 'relative' ? getRelativeDifference(a, b) : a - b;
      const c = getColor(change);
      style.backgroundColor = c.color;
      textColor = c.textColor;
    }
    const className = cx({
      'is-duration-diff': metric === 'duration',
      'is-same': isSame,
      'is-changed': !isSame,
      'is-more': a && b && b > a,
      'is-added': a == null,
      'is-less': a && b && a > b,
      'is-removed': b == null,
      'is-light-text': textColor === LIGHT,
      'is-dark-text': textColor === DARK,
    });
    const countClassName = cx(className, { 'is-secondary': metric == null || metric !== 'count' });
    const table = (
      <table className={`DiffNode ${className}`} style={style}>
        <tbody>
          <tr>
            <SpanCountDiffAbsolute className={countClassName} diff={diff} />
            {metric === 'duration' && <DurationDiffAbsolute className={className} diff={diff} />}
            <td className={`DiffNode--labelCell ${className}`}>
              <strong>{service}</strong>
            </td>
          </tr>
          <tr>
            <SpanCountDiffPercent className={countClassName} diff={diff} />
            {metric === 'duration' && <DurationDiffPercent className={className} diff={diff} />}
            {/* {isSame ? null : (
              <td className={`DiffNode--metricCell ${className}`}>
                <span className="DiffNode--metricSymbol">{chgSign}</span>
                {a === 0 || b === 0 ? 100 : abs((a - b) / max(a, b) * 100).toFixed(0)}
                <span className="DiffNode--metricSymbol">%</span>
              </td>
            )} */}
            <td className={`DiffNode--labelCell ${className}`}>{operation}</td>
          </tr>
        </tbody>
      </table>
    );

    return (
      <Popover
        overlayClassName={`DiffNode--popover ${className}`}
        mouseEnterDelay={0.25}
        content={table}
        placement="topLeft"
        arrowPointAtCenter
      >
        {table}
      </Popover>
    );
  }
}

// export default function drawNode<T>(vertex: PVertex<T>) {
//   const { data, operation, service } = vertex.data;
//   return <DiffNode diff={data} operation={operation} service={service} />;
// }

export function getNodeDrawer(
  metric: ?string,
  scaleOn: ?string,
  getColor: ?(number) => { color: string, textColor: string }
) {
  return function drawNodeOnMetric(vertex: PVertex) {
    const { data, operation, service } = vertex.data;
    return (
      <DiffNode
        diff={data}
        operation={operation}
        service={service}
        metric={metric}
        getColor={getColor}
        scaleOn={scaleOn}
      />
    );
  };
}
