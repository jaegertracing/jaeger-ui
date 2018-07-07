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

import type { DirectedGraphState } from '../types';

const STROKE_MAX = 4.2;
const STROKE_MIN = 2;
const PROPS_MAX = { strokeWidth: STROKE_MAX };
const PROPS_MIN = { strokeWidth: STROKE_MIN };

const THRESHOLD_MAX = 0.1;
const THRESHOLD_MIN = 0.6;
const THRESHOLD_SPREAD = THRESHOLD_MIN - THRESHOLD_MAX;

const cache: { [string]: { strokeWidth: string } } = {};
let lastK = -Number.MIN_VALUE;
let lastProps = STROKE_MIN;

// eslint-disable-next-line import/prefer-default-export
export function semanticStrokeWidth(_: any, graphState: DirectedGraphState) {
  const { k } = graphState.zoomTransform || {};
  if (k === lastK) {
    return lastProps;
  }
  let props = lastProps;
  if (k > THRESHOLD_MIN) {
    props = PROPS_MIN;
  } else if (k < THRESHOLD_MAX) {
    props = PROPS_MAX;
  } else {
    const strokeWidth = (STROKE_MIN + STROKE_MAX * (THRESHOLD_MIN - k) / THRESHOLD_SPREAD).toFixed(1);
    props = cache[strokeWidth] || (cache[strokeWidth] = { strokeWidth });
  }
  lastK = k;
  lastProps = props;
  return props;
}
