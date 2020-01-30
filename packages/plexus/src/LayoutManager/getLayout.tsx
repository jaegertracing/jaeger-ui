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
import { TEdge, TLayoutEdge, TLayoutGraph, TLayoutVertex, TSizeVertex } from '../types';

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
  inEdges: (TEdge | TLayoutEdge)[],
  inVertices: (TSizeVertex | TLayoutVertex)[],
  layoutOptions: TLayoutOptions | null,
  previousGraph: TLayoutGraph | null
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

  let hasShifted = false;
  const positionVertices: Map<string, TLayoutVertex> = new Map();
  const newVertices: Map<string, TSizeVertex> = new Map();
  inVertices.forEach(vertex => {
    console.log(vertex, 'top' in vertex);
    if ('top' in vertex) positionVertices.set(vertex.vertex.key, vertex);
    else newVertices.set(vertex.vertex.key, vertex);
  });

  const positionEdges: Map<TEdge, TLayoutEdge> = new Map();
  const newEdges: TEdge[] = [];
  inEdges.forEach(edge => {
    console.log(edge, 'edge' in edge);
    if ('edge' in edge) positionEdges.set(edge.edge, edge);
    else newEdges.push(edge);
  });

  const edgesByTo: Map<string, Map<string, TEdge>> = new Map();
  const edgesByFrom: Map<string, Map<string, TEdge>> = new Map();
  newEdges.forEach(edge => {
    const to = edgesByTo.get(edge.to);
    if (to) to.set(edge.from, edge);
    else edgesByTo.set(edge.to, new Map([[edge.from, edge]]));

    const from = edgesByFrom.get(edge.from);
    if (from) from.set(edge.to, edge);
    else edgesByFrom.set(edge.from, new Map([[edge.to, edge]]));
  });

  const graphQueue: TGraphQueue = [];
  while(newVertices.size) {
    // console.log(newVertices.size);
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
      // console.log('length', vertices.length);
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

  function reframe(/* graphOut */ graph: TLayoutGraph /*, subGraph: TLayoutGraph */): TLayoutGraph {
    // if any vertex too left, shift all
    // too left is if "trueLeft" is negative
    // if any vertex too top, shift all
    // too top is if "trueTop" is negative
    // then calculate max top and possibly increase graph.height
    // then calculate max left and possibly increase graph.width
    //
    // calc maxLeft, maxRight, maxTop, maxBottom.
    // shift all uniformly as necessary
    // width is shiftedmaxRight - shiftedmaxLeft
    // height is shiftedmaxTop - shiftedmaxBottom
    let maxLeft: number | undefined = undefined;
    let maxRight: number | undefined = undefined;
    let maxTop: number | undefined = undefined;
    let maxBottom: number | undefined = undefined;
    positionVertices.forEach(({ left, top, height, width }) => {
      const bottomBorder = top - height / 2;
      if (maxBottom === undefined || bottomBorder < maxBottom) maxBottom = bottomBorder;
      const leftBorder = left - width / 2;
      if (maxLeft === undefined || leftBorder < maxLeft) maxLeft = leftBorder;
      const rightBorder = left + width / 2;
      if (maxRight === undefined || rightBorder > maxRight) maxRight = rightBorder;
      const topBorder = top + height / 2;
      if (maxTop === undefined || topBorder > maxTop) maxTop = topBorder;
    });

    if (maxBottom === undefined || maxLeft === undefined || maxRight === undefined || maxTop === undefined) throw new Error('No position vertices');

    /*
    if (maxBottom === undefined) throw new Error('No position vertices');
    if (maxLeft === undefined) throw new Error('No position vertices');
    if (maxRight === undefined) throw new Error('No position vertices');
    if (maxTop === undefined) throw new Error('No position vertices');
    */

    if (maxLeft !== 0 || maxBottom !== 0) {
      hasShifted = true;
      positionVertices.forEach(({ left, top, ...rest }, key) => {
        positionVertices.set(key, {
          ...rest,
          // TODO: no cast
          left: left - (maxLeft as number),
          // TODO: no cast
          top: top - (maxBottom as number),
        });
      });
    }
    
    return {
      scale: 1,
      width: maxRight - maxLeft,
      height: maxTop - maxBottom,
    };
  }

  console.log(graphQueue);
  if (graphQueue.length) {
    if (!previousGraph) throw new Error('Cannot have new vertices without previous graph');
    const edgesOut: TLayoutEdge[] = [];
    // const verticesOut: TLayoutVertex[] = [];
    // TODO: only need to reframe once!
    graphQueue.forEach(({ anchorKey, edges, vertices }) => {
      const anchorVertex = positionVertices.get(anchorKey);
      if (!anchorVertex) throw new Error(`Lost anchor: ${anchorKey}`);
      const { top: anchorTop, left: anchorLeft } = anchorVertex;
      console.log('going to dot');
      const dot = toDot(edges, vertices, layoutOptions);
      console.log('dotted');

      const { totalMemory = undefined } = layoutOptions || {};
      const options = { totalMemory, engine: phase === EWorkerPhase.Edges ? 'neato' : 'dot', format: 'plain' };
      console.log('going to viz');

      const plainOut = viz(dot, options);
      console.log('vizzed');

      console.log('going to conv');
      const { edges: subEdges, graph, vertices: subVertices } = convPlain(plainOut, true);
      console.log('conved');
      // IF THE GRAPH GROWS TALLER, EVERY EXISTING SIZE VERTEX HAS TO SHIFT UP BY THE DELTA
      // console.log(graph, previousGraph, graphOut, subVertices[0].height);
      const subAnchor = subVertices.find(({ vertex: { key } }) => key === anchorKey);
      if (!subAnchor) throw new Error(`Anchor not in graft: ${anchorKey}`);
      const { top: subAnchorTop, left: subAnchorLeft } = subAnchor;

      // TODO: clear room for subVertices

      // verticesOut = verticesOut.concat(vertices);
      // verticesOut.push(...vertices);
      subVertices.forEach(({ left, top, ...rest }) => {
        // assumes anchorDirection is 'from' and layoutOptions.direction is top -> bottom
        if (rest.vertex.key !== anchorKey) {
          // TODO: Can calculate needed room here
          positionVertices.set(rest.vertex.key, {
            left: left + anchorLeft - subAnchorLeft,
            top: top + anchorTop - subAnchorTop,
            ...rest,
          });
        }
      });
      // major TODO
      if (subEdges) edgesOut.push(...subEdges);

      // graphOut = graph;
      // assumes one vertex is added below graph
      /*
      graphOut = {
        scale: 1,
        width: previousGraph.width,
        height: previousGraph.height + graph.height - anchorVertex.height,
      };
       */
      // return reframe(graphOut /*, graph */);
    });

    const graphOut = reframe(previousGraph);

    // verticesOut.push(...positionVertices.values());
    const verticesOut = Array.from(positionVertices.values());
    edgesOut.push(...positionEdges.values());

    if (graphOut) console.log('should be subset af');
    console.log(graphOut, edgesOut, verticesOut);
    if (graphOut) return { graph: graphOut, edges: edgesOut, vertices: verticesOut };
  }

  console.log('going to dot');
  const dot = toDot(newEdges, inVertices, layoutOptions);
  // const dot = toDot(newEdges, Array.from(newVertices.values()), layoutOptions);
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
