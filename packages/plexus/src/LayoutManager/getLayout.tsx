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

import viz from 'viz.js/viz.js';

import convPlain from './dot/convPlain';
import toDot from './dot/toDot';

import { EWorkerPhase, TLayoutOptions } from './types';
import { TEdge, TLayoutVertex, TSizeVertex } from '../types';

enum EValidity {
  Ok = 'Ok',
  Warn = 'Warn',
  Error = 'Error',
}

type TValidityError = {
  validity: EValidity.Error;
  message: string;
};

type TValidityOk = {
  validity: EValidity.Ok;
  message: null;
};

type TValidityWarn = {
  validity: EValidity.Warn;
  message: string;
};

type TVerticesValidity = TValidityError | TValidityOk | TValidityWarn;

const SHIFT_THRESHOLD = 0.015;

function isCloseEnough(a: number, b: number) {
  return Math.abs(a - b) / b < SHIFT_THRESHOLD;
}

function getVerticesValidity(
  input: TSizeVertex[] | TLayoutVertex[],
  output: TLayoutVertex[]
): TVerticesValidity {
  // TODO don't check left/top between input and output when re-positioning
  return { validity: EValidity.Ok, message: null };
  /*
  const inputHash: { [key: string]: TSizeVertex | TLayoutVertex } = {};
  input.forEach(v => {
    inputHash[String(v.vertex.key)] = v;
  });

  let warn: TVerticesValidity | void;

  for (let i = 0; i < output.length; i++) {
    const {
      vertex: { key },
      height,
      left,
      top,
      width,
    } = output[i];
    const src = inputHash[String(key)];
    if (!src) {
      return { validity: EValidity.Error, message: `Extra vertex found: ${key}` };
    }
    if (!isCloseEnough(src.height, height) || !isCloseEnough(src.width, width)) {
      return {
        validity: EValidity.Error,
        message: `Vertex ${key} failed size threshhold check (${SHIFT_THRESHOLD})`,
      };
    }
    if ('left' in src && 'top' in src) {
      const { left: srcLeft, top: srcTop } = src;
      if (!isCloseEnough(srcLeft, left) || !isCloseEnough(srcTop, top)) {
        warn = {
          validity: EValidity.Warn,
          message: `Vertex ${key} failed position threshhold check (${SHIFT_THRESHOLD})`,
        };
      }
    }
    delete inputHash[String(key)];
  }
  const missingKeys = Object.keys(inputHash);
  if (missingKeys.length !== 0) {
    const word = missingKeys.length > 1 ? 'vertices' : 'vertex';
    return { validity: EValidity.Error, message: `Missing ${word}: ${missingKeys.join(', ')}` };
  }
  return warn || { validity: EValidity.Ok, message: null };
   */
}

type TGraphCohort = {
  anchorKey: string;
  anchorDirection: 'to' | 'from';
  edges: TEdge[],
  vertices: TSizeVertex[],
};

type TGraphQueue = TGraphCohort[];

export default function getLayout(
  phase: EWorkerPhase,
  inEdges: TEdge[],
  inVertices: (TSizeVertex | TLayoutVertex)[],
  layoutOptions: TLayoutOptions | null
) {
  console.log(phase);
  /*
  if (phase !== EWorkerPhase.Positions) {
    const dot = toDot(inEdges, inVertices, layoutOptions);
    const { totalMemory = undefined } = layoutOptions || {};
    const options = { totalMemory, engine: phase === EWorkerPhase.Edges ? 'neato' : 'dot', format: 'plain' };
    const plainOut = viz(dot, options);
    const { edges, graph, vertices } = convPlain(plainOut, phase !== EWorkerPhase.Positions);
    const result = getVerticesValidity(inVertices, vertices);
    if (result.validity === EValidity.Error) {
      console.log('error');
      const message = result.message;
      return {
        graph,
        edges,
        vertices,
        layoutError: true,
        layoutErrorMessage: message,
      };
    }
    if (result.validity === EValidity.Warn) {
      console.log('only warn');
      return {
        graph,
        edges,
        vertices,
        layoutErrorMessage: result.message,
      };
    }
    return { edges, graph, vertices };
  }
   */

  const positionVertices: Map<string, TLayoutVertex> = new Map();
  const newVertices: Map<string, TSizeVertex> = new Map();
  inVertices.forEach(vertex => {
    console.log(vertex, 'top' in vertex);
    if ('top' in vertex) positionVertices.set(vertex.vertex.key, vertex);
    else newVertices.set(vertex.vertex.key, vertex);
  });

  const edgesByTo: Map<string, Map<string, TEdge>> = new Map();
  const edgesByFrom: Map<string, Map<string, TEdge>> = new Map();
  inEdges.forEach(edge => {
    const to = edgesByTo.get(edge.to);
    if (to) to.set(edge.from, edge);
    else edgesByTo.set(edge.to, new Map([[edge.from, edge]]));

    const from = edgesByFrom.get(edge.from);
    if (from) from.set(edge.to, edge);
    else edgesByFrom.set(edge.from, new Map([[edge.to, edge]]));
  });

  const graphQueue: TGraphQueue = [];
  while(newVertices.size) {
    console.log(newVertices.size);
    const [k, v] = newVertices.entries().next().value;
    newVertices.delete(k);
    const edges: Set<TEdge> = new Set();
    const vertices: TSizeVertex[] = [v];
    let anchorKey: undefined | string = undefined;
    let anchorDirection: undefined | 'from' | 'to';
    // const vertexQueue: TSizeVertex[] = [v];
    for(let i = 0; i < vertices.length; i++) {
      const vertex = vertices[i];
      const key = vertex.vertex.key;
      console.log('length', vertices.length);
      // newVertices.delete(key);
      // vertices.push(vertex);

      if (key !== anchorKey || anchorDirection === 'to') {
        const inEdges = edgesByTo.get(key);
        // edgesByTo.delete(key);
        if (inEdges) {
          Array.from(inEdges.values()).forEach(edge => {
            const connectedVertex = newVertices.get(edge.from);
            if (connectedVertex) {
              vertices.push(connectedVertex);
              newVertices.delete(edge.from);
              edges.add(edge);
            } else if (!anchorKey) {
              const anchorVertex = positionVertices.get(edge.from);
              if (anchorVertex) {
                const { top: _t, left: _l, ...sizeAnchor } = anchorVertex;
                vertices.push(sizeAnchor);
                anchorKey = anchorVertex.vertex.key;
                anchorDirection = 'from';
                edges.add(edge);
              }
            }
          });
        }
      }

      if (key !== anchorKey || anchorDirection === 'from') {
        const outEdges = edgesByFrom.get(key);
        // edgesByFrom.delete(key);
        if (outEdges) {
          Array.from(outEdges.values()).forEach(edge => {
            const connectedVertex = newVertices.get(edge.to);
            if (connectedVertex) {
              vertices.push(connectedVertex);
              edges.add(edge);
              newVertices.delete(edge.to);
            } else if (!anchorKey) {
              const anchorVertex = positionVertices.get(edge.to);
              if (anchorVertex) {
                const { top: _t, left: _l, ...sizeAnchor } = anchorVertex;
                vertices.push(sizeAnchor);
                anchorKey = anchorVertex.vertex.key;
                anchorDirection = 'to';
                edges.add(edge);
              }
            }
          });
        }
      }
    }

    if (!anchorKey || !anchorDirection) console.log('unanchored');
    else graphQueue.push({
      anchorKey,
      anchorDirection,
      edges: Array.from(edges),
      vertices,
    });
  }

  console.log(graphQueue);

  console.log('going to dot');
  const dot = toDot(inEdges, inVertices, layoutOptions);
  console.log('dotted');

  const { totalMemory = undefined } = layoutOptions || {};
  const options = { totalMemory, engine: phase === EWorkerPhase.Edges ? 'neato' : 'dot', format: 'plain' };
  console.log('going to viz');

  const plainOut = viz(dot, options);
  console.log('vizzed');

  console.log('going to conv');
  const { edges, graph, vertices } = convPlain(plainOut, phase !== EWorkerPhase.Positions);
  console.log('conved');

  const result = getVerticesValidity(inVertices, vertices);

  if (result.validity === EValidity.Error) {
    console.log('error');
    const message = result.message;
    return {
      graph,
      edges,
      vertices,
      layoutError: true,
      layoutErrorMessage: message,
    };
  }
  if (result.validity === EValidity.Warn) {
    console.log('only warn');
    return {
      graph,
      edges,
      vertices,
      layoutErrorMessage: result.message,
    };
  }
  return { edges, graph, vertices };

}
