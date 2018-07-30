// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
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

import { rgb } from 'd3-color';
import { interpolateLab } from 'd3-interpolate';
import { scaleLinear, scaleSqrt } from 'd3-scale';

import { getAvgDurationDiffDomain } from './avg-duration';

import DagNode from '../../../model/trace-dag/DagNode';

// import type { DiffMembers } from '../../../model/trace-dag/DagNode';
import type { NodeID } from '../../../model/trace-dag/types';

export const DARK = 'DARK';
export const LIGHT = 'LIGHT';

const spectrums = {
  // duration: ['#3b7020', '#ccc', '#c00'],
  // duration: ['#135200', '#d9d9d9', '#a8071a'],
  // duration: ['#a8071a', '#aaa', '#135200'],
  duration: {
    less: ['#ddd', '#a8071a'],
    more: ['#ddd', '#135200'],
  },
};

const textColorCache: Map<string, string> = new Map();

const LUMINANCE_THRESHOLD = Math.sqrt(1.05 * 0.05) - 0.05;

// the method for determining if ligth or dark text should be used
// https://stackoverflow.com/a/3943023/1888292
function adjComponent(value: number) {
  const n = value / 255;
  if (n <= 0.03928) {
    return n / 12.92;
  }
  return ((n + 0.055) / 1.055) ** 2.4;
}

function getTextColor(colorString) {
  const cached = textColorCache.get(colorString);
  if (cached != null) {
    return cached;
  }
  const { r, g, b } = rgb(colorString);
  const luminance = adjComponent(r) * 0.2126 + adjComponent(g) * 0.7152 + adjComponent(b) * 0.0722;
  // const values = [r, g, b];
  const v = luminance > LUMINANCE_THRESHOLD ? DARK : LIGHT;
  console.log(colorString, 'l', luminance, v);
  textColorCache.set(colorString, v);
  return v;
}
// function getTextColor(colorString) {
//   const cached = textColorCache.get(colorString);
//   if (cached != null) {
//     return cached;
//   }
//   const { l } = hsl(colorString);
//   const v = l > LUMINANCE_THRESHOLD ? DARK : LIGHT;
//   console.log(colorString, 'l', l, v)
//   textColorCache.set(colorString, v);
//   return v;
// }

export default function getColorInterpolator(
  metric: ?string,
  scale: ?string,
  scaleOn: ?string,
  nodesMap: Map<NodeID, DagNode>
) {
  if (metric !== 'duration') {
    return null;
  }
  const diffDomain = getAvgDurationDiffDomain(scaleOn, nodesMap);
  const [, , max] = diffDomain;

  // const scaleFn = scale !== 'log' ? scaleLinear : () => scaleLog().base(40);
  // const scaleFn = scale !== 'log' ? scaleLinear : () => scalePow().exponent(0.5);
  // const scaleFn = scale !== 'log' ? scaleLinear : () => scalePow().exponent(0.325);
  // const scaleFn = scale !== 'log' ? scaleLinear : () => scalePow().exponent(0.38);
  const scaleFn = scale === 'power' ? scaleSqrt : scaleLinear;
  // const [min, center, max] = diffDomain;
  // let shiftAmount = 1;
  // if (Math.sign(min) !== Math.sign(max)) {
  //   shiftAmount = Math.abs(min - 1);
  // }
  // const lessInterpolator = scaleLog()
  const lessInterpolator = scaleFn()
    // .domain([1, max + 1])
    .domain([0, max])
    .range(spectrums.duration.less)
    .interpolate(interpolateLab);

  // const moreInterpolator = scaleLog()
  const moreInterpolator = scaleFn()
    // .domain([1, max + 1])
    .domain([0, max])
    .range(spectrums.duration.more)
    .interpolate(interpolateLab);
  // const colorInterpolator = scaleLog()
  //   .domain([
  //     min + shiftAmount,
  //     center + shiftAmount,
  //     max + shiftAmount,
  //   ])
  //   .range(spectrums.duration)
  //   .interpolate(interpolateLab);
  return function getColor(value: number) {
    // console.log(colorInterpolator(value + shiftAmount))
    const v = Math.abs(value);
    const color = value < 0 ? lessInterpolator(v) : moreInterpolator(v);
    const textColor = getTextColor(color);
    return { color, textColor };
    // return colorInterpolator(value + shiftAmount);
  };
}

// export default function getColorInterpolator(metric: ?string, scaleOn: ?string, nodesMap: Map<NodeID, DagNode<DiffMembers>>) {
//   if (metric !== 'duration') {
//     return null;
//   }
//   const diffDomain = getAvgDurationDiffDomain(scaleOn, nodesMap);
//   const [min, center, max] = diffDomain;
//   let shiftAmount = 1;
//   if (Math.sign(min) !== Math.sign(max)) {
//     shiftAmount = Math.abs(min - 1);
//   }
//   console.log('shift amt:', diffDomain, shiftAmount)
//   // const colorInterpolator = scaleLinear()
//   const colorInterpolator = scaleLog()
//     .domain([
//       min + shiftAmount,
//       center + shiftAmount,
//       max + shiftAmount,
//     ])
//     .range(spectrums.duration)
//     .interpolate(interpolateLab);
//   return function getColor(value: number) {
//     // console.log(colorInterpolator(value + shiftAmount))
//     return colorInterpolator(value + shiftAmount);
//   }
// }
