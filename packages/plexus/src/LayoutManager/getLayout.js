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

import viz from 'viz.js';

import convPlain from './dot/convPlain';
import toDot from './dot/toDot';

import type { LayoutOptions } from './types';
import type { Edge, LayoutVertex, SizeVertex } from '../types/layout';

const SHIFT_THRESHOLD = 0.015;
const VALIDITY_OK = 'VALIDITY_OK';
const VALIDITY_ERROR = 'VALIDITY_ERROR';
const VALIDITY_WARN = 'VALIDITY_WARN';

function isCloseEnough(a: number, b: number) {
  return Math.abs(a - b) / b < SHIFT_THRESHOLD;
}

function getVerticesValidity(input: (SizeVertex | LayoutVertex)[], output: LayoutVertex[]) {
  const inputHash: { [string]: SizeVertex | LayoutVertex } = {};
  input.forEach(v => {
    inputHash[String(v.vertex.key)] = v;
  });

  let warn;

  for (let i = 0; i < output.length; i++) {
    const { vertex: { key }, height, left, top, width } = output[i];
    const src = inputHash[String(key)];
    if (!src) {
      return { validity: VALIDITY_ERROR, message: `Extra vertex found: ${key}` };
    }
    if (!isCloseEnough(src.height, height) || !isCloseEnough(src.width, width)) {
      return {
        validity: VALIDITY_ERROR,
        message: `Vertex ${key} failed size threshhold check (${SHIFT_THRESHOLD})`,
      };
    }
    if (src.left != null && src.top != null) {
      const { left: srcLeft, top: srcTop } = ((src: any): LayoutVertex);
      if (!isCloseEnough(srcLeft, left) || !isCloseEnough(srcTop, top)) {
        warn = {
          validity: VALIDITY_WARN,
          message: `Vertex ${key} failed position threshhold check (${SHIFT_THRESHOLD})`,
        };
      }
    }
    delete inputHash[String(key)];
  }
  const missingKeys = Object.keys(inputHash);
  if (missingKeys.length !== 0) {
    const word = missingKeys.length > 1 ? 'vertices' : 'vertex';
    return { validity: VALIDITY_ERROR, message: `Missing ${word}: ${missingKeys.join(', ')}` };
  }
  return warn || { validity: VALIDITY_OK, message: null };
}

export default function getLayout(
  phase: 'positions' | 'edges' | 'dot-only',
  inEdges: Edge[],
  inVertices: (SizeVertex | LayoutVertex)[],
  layoutOptions: LayoutOptions
) {
  const dot = toDot(inEdges, inVertices, layoutOptions);
  const { totalMemory } = layoutOptions || {};
  const options = { totalMemory, engine: phase === 'edges' ? 'neato' : 'dot', format: 'plain' };
  const plainOut = viz(dot, options);
  const { edges, graph, vertices } = convPlain(plainOut, phase !== 'positions');
  const { validity, message } = getVerticesValidity(inVertices, vertices);
  if (validity === VALIDITY_ERROR) {
    return {
      graph,
      edges,
      vertices,
      layoutError: true,
      layoutErrorMessage: message,
    };
  }
  if (validity === VALIDITY_WARN) {
    return {
      graph,
      edges,
      vertices,
      layoutErrorMessage: message,
    };
  }
  return { edges, graph, vertices };
}
