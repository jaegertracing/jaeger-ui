
// import type { VizWorkMeta, WorkerMessage } from './types';
// import type { Edge, LayoutOptions, Vertex } from '../types/layout';
import viz from 'viz.js';

import type { Edge, Vertex } from '../types/layout';

import { fromPlain, toDot } from './dot-conv';

const SHIFT_THRESHOLD = 0.015;

function isCloseEnough(a, b) {
  return Math.abs(a - b) / b < SHIFT_THRESHOLD;
}

function getVerticesValidity(input: Vertex[], output: Vertex[]) {
  const inputHash: { [string]: Vertex } = {};
  input.forEach((vertex: Vertex) => { inputHash[vertex.key] = vertex });

  for (let i = 0; i < output.length; i++) {
    const { height, left, key, top, width } = output[i];
    const src = inputHash[key];
    if (!src) {
      return { ok: false, message: `Extra vertex found: ${key}` };
    }
    // eslint-disable-next-line default-case
    switch (false) {
      case isCloseEnough(src.height, height):
      case isCloseEnough(src.width, width):
        return { ok: false, message: `Vertex ${key} failed size threshhold check (${SHIFT_THRESHOLD})` };
      case src.left == null || isCloseEnough(src.left, left):
      case src.top == null || isCloseEnough(src.top, top):
        return { ok: false, message: `Vertex ${key} failed position threshhold check (${SHIFT_THRESHOLD})` };
    }
    delete inputHash[key];
  }
  const missingKeys = Object.keys(inputHash);
  if (missingKeys.length !== 0) {
    const word = missingKeys.length > 1 ? 'vertices' : 'vertex';
    return { ok: false, message: `Missing ${word}: ${missingKeys.join(', ')}` };
  }
  return { ok: true };
}

export default function getLayout(phase: 'positions' | 'edges', inEdges: Edge[], inVertices: Vertex[]) {
  const dot = toDot(inEdges, inVertices);
  console.log(dot, inVertices);
  const options = { engine: 'dot', format: 'plain' };
  const plainOut = viz(dot, options);
  const { edges, graph, vertices } = fromPlain(plainOut, phase === 'edges');
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
