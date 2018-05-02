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

import type { Edge, Vertex } from '../types/layout';

import convPlain from './dot/convPlain';
import toDot from './dot/toDot';

const SHIFT_THRESHOLD = 0.015;

function isCloseEnough(a: number, b: number) {
  return Math.abs(a - b) / b < SHIFT_THRESHOLD;
}

function getVerticesValidity(input: Vertex[], output: Vertex[]) {
  const inputHash: { [string]: Vertex } = {};
  input.forEach((vertex: Vertex) => {
    inputHash[String(vertex.key)] = vertex;
  });

  for (let i = 0; i < output.length; i++) {
    const { height, left, key, top, width } = output[i];
    const src = inputHash[String(key)];
    if (!src) {
      return { ok: false, message: `Extra vertex found: ${key}` };
    }
    // eslint-disable-next-line default-case
    switch (false) {
      case isCloseEnough(src.height, height):
      case isCloseEnough(src.width, width):
        return { ok: false, message: `Vertex ${key} failed size threshhold check (${SHIFT_THRESHOLD})` };
      case src.left == null || (left != null && isCloseEnough(src.left, left)):
      case src.top == null || (top != null && isCloseEnough(src.top, top)):
        return { ok: false, message: `Vertex ${key} failed position threshhold check (${SHIFT_THRESHOLD})` };
    }
    delete inputHash[String(key)];
  }
  const missingKeys = Object.keys(inputHash);
  if (missingKeys.length !== 0) {
    const word = missingKeys.length > 1 ? 'vertices' : 'vertex';
    return { ok: false, message: `Missing ${word}: ${missingKeys.join(', ')}` };
  }
  return { ok: true, message: null };
}

export default function getLayout(phase: 'positions' | 'edges', inEdges: Edge[], inVertices: Vertex[]) {
  const dot = toDot(inEdges, inVertices);
  const options = { engine: phase === 'positions' ? 'dot' : 'neato', format: 'plain' };
  const plainOut = viz(dot, options);
  const { edges, graph, vertices } = convPlain(plainOut, phase === 'edges');
  const { ok, message } = getVerticesValidity(inVertices, vertices);
  if (!ok) {
    return {
      edges,
      graph,
      vertices,
      layoutError: true,
      layoutErrorMessage: message,
    };
  }
  return { edges, graph, vertices };
}
