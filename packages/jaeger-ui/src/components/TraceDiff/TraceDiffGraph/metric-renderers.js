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

import { getAvgDurations, getRelativeDifference } from './avg-duration';
import { formatDuration } from '../../../utils/date';

import type { DiffMembers } from '../../../model/trace-dag/DagNode';

type Props = {
  className: string,
  diff: DiffMembers,
};

const abs = Math.abs;
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

const getSign = (a: ?number, b: ?number) => (a == null || (b != null && a < b) ? '+' : '-');

function renderDiffPercent(a, b, className) {
  const value = a == null || b == null ? 100 : abs(getRelativeDifference(a, b));
  return (
    <td className={`DiffNode--metricCell ${className}`}>
      <span className="DiffNode--metricSymbol">{getSign(a, b)}</span>
      {value.toFixed(0)}
      <span className="DiffNode--metricSymbol">%</span>
    </td>
  );
}

export function DurationDiffAbsolute(props: Props) {
  const { className, diff } = props;
  const { a, b } = getAvgDurations(diff);
  const isSame = a === b;
  let value = 0;
  if (a == null || b == null) {
    value = a == null ? b : a;
  } else {
    value = isSame ? a : abs(b - a);
  }
  return (
    <td className={`DiffNode--metricCell ${className}`} rowSpan={isSame ? 2 : 1}>
      {isSame ? null : <span className="DiffNode--metricSymbol">{getSign(a, b)}</span>}
      {formatDuration(value)}
    </td>
  );
}

export function DurationDiffPercent(props: Props) {
  const { className, diff } = props;
  const { a, b } = getAvgDurations(diff);
  if (a === b) {
    return null;
  }
  return renderDiffPercent(a, b, className);
}

export function SpanCountDiffAbsolute(props: Props) {
  const { className, diff } = props;
  const a = (diff.a && diff.a.members.length) || 0;
  const b = (diff.b && diff.b.members.length) || 0;
  const isSame = a === b;
  const absOnly = a === 0 || b === 0;
  return (
    <td className={`DiffNode--metricCell ${className}`} rowSpan={isSame || absOnly ? 2 : 1}>
      {isSame ? null : <span className="DiffNode--metricSymbol">{getSign(a, b)}</span>}
      {isSame ? a : abs(b - a)}
    </td>
  );
}

export function SpanCountDiffPercent(props: Props) {
  const { className, diff } = props;
  const a = (diff.a && diff.a.members.length) || 0;
  const b = (diff.b && diff.b.members.length) || 0;
  if (a === b || a === 0 || b === 0) {
    return null;
  }
  return renderDiffPercent(a, b, className);
}
