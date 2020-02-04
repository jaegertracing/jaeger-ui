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
import toDot, { DEFAULT_GRAPH_ATTRS } from './dot/toDot';

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

const SHIFT_THRESHOLD = 1e-5;

// Fails if b is negative or 0 or if a is negative
// changing from nearly 0 to also nearly 0 results in huge percent differences (e.g.: 3e-15 to 6e-15)
/*
function isCloseEnough(a: number, b: number) {
  if (a === 0 && b === 0) return true;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b)) < SHIFT_THRESHOLD;
}
 */

function isCloseEnough(a: number, b: number) {
  return Math.abs(a - b) < SHIFT_THRESHOLD;
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

  type TEdgeLoc = {
    fromLeft: number,
    fromTop: number,
    toLeft: number,
    toTop: number,
  };
  const positionEdges: Map<TLayoutEdge, TEdgeLoc> = new Map();
  const newEdges: TEdge[] = [];
  inEdges.forEach(edge => {
    console.log(edge, 'edge' in edge);
    if ('edge' in edge) {
      const from = positionVertices.get(edge.edge.from);
      if (!from) throw new Error('From missing');
      const to = positionVertices.get(edge.edge.to);
      if (!to) throw new Error('to missing');
      if (!previousGraph) throw new Error('Cannot have positioned edges without previous graph');
      positionEdges.set(edge, {
        fromLeft: from.left,
        fromTop: previousGraph.height - from.top,
        toLeft: to.left,
        toTop: previousGraph.height - to.top,
      });
    }
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

  // TODO: return new graph, zoom pan, and should delay
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
      console.log({ maxLeft, maxBottom });
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
    const ranksep = layoutOptions && layoutOptions.ranksep || DEFAULT_GRAPH_ATTRS.ranksep;
    const nodesep = layoutOptions && layoutOptions.nodesep || DEFAULT_GRAPH_ATTRS.nodesep;
    // const edgesOut: TLayoutEdge[] = [];
    type TEdgeLoc = {
      fromLeft: number,
      fromTop: number,
      toLeft: number,
      toTop: number,
    };
    const moveEdges: Map<TLayoutEdge, TEdgeLoc> = new Map();
    // const verticesOut: TLayoutVertex[] = [];
    // TODO: only need to reframe once!
    graphQueue.forEach(({ anchorDirection, anchorKey, edges, vertices }) => {
      const anchorVertex = positionVertices.get(anchorKey);
      if (!anchorVertex) throw new Error(`Lost anchor: ${anchorKey}`);
      const { top: anchorTop, left: anchorLeft } = anchorVertex;
      // console.log('going to dot');
      const dot = toDot(edges, vertices, layoutOptions);
      // console.log('dotted');

      const { totalMemory = undefined } = layoutOptions || {};
      const options = { totalMemory, engine: phase === EWorkerPhase.Edges ? 'neato' : 'dot', format: 'plain' };
      // console.log('going to viz');

      const plainOut = viz(dot, options);
      // console.log('vizzed');

      // console.log('going to conv');
      const { edges: subEdges, graph: subGraph, vertices: subVertices } = convPlain(plainOut, true);
      // console.log('conved');
      // IF THE GRAPH GROWS TALLER, EVERY EXISTING SIZE VERTEX HAS TO SHIFT UP BY THE DELTA
      // console.log(graph, previousGraph, graphOut, subVertices[0].height);
      const subAnchor = subVertices.find(({ vertex: { key } }) => key === anchorKey);
      if (!subAnchor) throw new Error(`Anchor not in graft: ${anchorKey}`);
      const { top: subAnchorTop, left: subAnchorLeft } = subAnchor;
      const leftAdjust = anchorLeft - subAnchorLeft;
      const topAdjust = anchorTop - subAnchorTop;

      const newVertices: Map<string, TLayoutVertex> = new Map();
      subVertices.forEach(v => newVertices.set(v.vertex.key, v));
      if (subEdges) {
        subEdges.forEach(e => {
          const from = newVertices.get(e.edge.from);
          if (!from) throw new Error('From missing');
          const to = newVertices.get(e.edge.to);
          if (!to) throw new Error('to missing');
          moveEdges.set(e, {
            fromLeft: from.left,
            fromTop: from.top,
            toLeft: to.left,
            toTop: to.top,
          });
        });
      }

      let slideThreshold: number;
      let slideDimension: 'top' | 'left';
      let otherDimension: 'top' | 'left';
      let slideDivisor: number;
      let slideCheckAttribute: 'height' | 'width';
      let otherAttribute: 'height' | 'width';
      let slideSectionDirection: -1 | 1;

      // let collisionMin: number;
      let collisionLimit: number;
      let collisionLowerBound: number;
      let collisionUpperBound: number;

      const lowerSlideCandidates: TLayoutVertex[] = [];
      const upperSlideCandidates: TLayoutVertex[] = [];
      let lowerSlideDistance: number | undefined = undefined;
      let upperSlideDistance: number | undefined = undefined;

      // let collisionCheckAttribute: 'height' | 'width';

      // rankdir 'BT' should work with negated anchcorDIrection
      if (layoutOptions && layoutOptions.rankdir === 'TB') {
        slideDimension = 'top';
        otherDimension = 'left';
        slideCheckAttribute = 'height';
        // collisionCheckAttribute = 'width';
        otherAttribute = 'width';
        slideSectionDirection = anchorDirection === 'from' ? -1 : 1;

        const SEP_PERCENTAGE = 0.8; /* TODO: tweak percentage */

        // TODO: everything after here shouldn't be divided by ifs
        slideThreshold = anchorVertex[slideDimension] + (slideSectionDirection * (anchorVertex[slideCheckAttribute] / 2 + SEP_PERCENTAGE * ranksep));
        slideDivisor = anchorVertex[otherDimension];
        collisionLimit = slideThreshold + (slideSectionDirection * (subGraph[slideCheckAttribute] - subAnchor[slideCheckAttribute] + SEP_PERCENTAGE * ranksep));
        collisionLowerBound = anchorVertex[otherDimension] - subAnchor[otherDimension] - SEP_PERCENTAGE * nodesep;
        collisionUpperBound = collisionLowerBound + subGraph[otherAttribute] + 2 * SEP_PERCENTAGE * nodesep;

        positionVertices.forEach(existingVertex => {
          const slideThresholdCompareVal = existingVertex[slideDimension] + (slideSectionDirection * existingVertex[slideCheckAttribute] / 2);
          if (Math.sign(slideThresholdCompareVal - slideThreshold) === slideSectionDirection) {
            const collisionLimitCompareVal = existingVertex[slideDimension] - (slideSectionDirection * existingVertex[slideCheckAttribute] / 2);
            const isCloseEnoughOnSlideDimensionToCollide = Math.sign(collisionLimitCompareVal - collisionLimit) !== slideSectionDirection;
            const slideDivisorCompareVal = existingVertex[otherDimension];
            if (slideDivisorCompareVal <= slideDivisor) {
              lowerSlideCandidates.push(existingVertex);
              if (isCloseEnoughOnSlideDimensionToCollide) {
                const lowerSlideDistanceCompareVal = existingVertex[otherDimension] + existingVertex[otherAttribute] / 2 - collisionLowerBound;
                if (lowerSlideDistanceCompareVal > 0 && (lowerSlideDistance === undefined || lowerSlideDistanceCompareVal < lowerSlideDistance)) lowerSlideDistance = -1 * lowerSlideDistanceCompareVal;
              }
            } else {
              upperSlideCandidates.push(existingVertex);
              if (isCloseEnoughOnSlideDimensionToCollide) {
                const upperSlideDistanceCompareVal = existingVertex[otherDimension] - existingVertex[otherAttribute] / 2 - collisionUpperBound;
                if (upperSlideDistanceCompareVal < 0 && (upperSlideDistance === undefined || upperSlideDistanceCompareVal > upperSlideDistance)) upperSlideDistance = -1 * upperSlideDistanceCompareVal;
              }
            }
          }
        });

        if (lowerSlideDistance) {
          lowerSlideCandidates.forEach(vertex => {
            positionVertices.set(vertex.vertex.key, {
              ...vertex,
              [otherDimension]: vertex[otherDimension] + (lowerSlideDistance as number),
            });
          });
        }

        if (upperSlideDistance) {
          upperSlideCandidates.forEach(vertex => {
            positionVertices.set(vertex.vertex.key, {
              ...vertex,
              [otherDimension]: vertex[otherDimension] + (upperSlideDistance as number),
            });
          });
        }

          /*
        console.log(JSON.stringify({
          anchorVertex,
          subAnchor,
          subGraph,
          slideThreshold,
          collisionLimit,
          collisionLowerBound,
          collisionUpperBound,
          slideDivisor,
          hitbox: 'calc above',
          lowerSlideCandidates,
          lowerSlideDistance,
          upperSlideCandidates,
          upperSlideDistance,
          slide: 'should move shtuff above',
          slideDimension,
          otherDimension,
          slideCheckAttribute,
          otherAttribute,
          slideSectionDirection,
        }, null, 2));
           */
      } else {
        throw new Error('Uhh should be TB');
      }

      subVertices.forEach(({ left, top, ...rest }) => {
        // assumes anchorDirection is 'from' and layoutOptions.direction is top -> bottom
        if (rest.vertex.key !== anchorKey) {
          // TODO: Can calculate needed room here
          positionVertices.set(rest.vertex.key, {
            left: left + leftAdjust,
            top: top + topAdjust,
            ...rest,
          });
        }
      });
    });

    const graphOut = reframe(previousGraph);

    // verticesOut.push(...positionVertices.values());
    const verticesOut = Array.from(positionVertices.values());
    // edgesOut.push(...positionEdges.values());
    const edgesOut: TLayoutEdge[] = [];
    moveEdges.forEach((originalLoc, edge) => {
      const from = positionVertices.get(edge.edge.from);
      if (!from) throw new Error('From missing');
      const to = positionVertices.get(edge.edge.to);
      if (!to) throw new Error('to missing');

      const fromTopDelta = from.top - originalLoc.fromTop;
      const fromLeftDelta = from.left - originalLoc.fromLeft;
      const toTopDelta = to.top - originalLoc.toTop;
      const toLeftDelta = to.left - originalLoc.toLeft;
      /*
      console.log(JSON.stringify({
        fromTopDelta,
        fromtop: from.top,
        originalLocfromTop: originalLoc.fromTop,
        fromLeftDelta,
        fromleft: from.left,
        originalLocfromLeft: originalLoc.fromLeft,
        toTopDelta,
        totop: to.top,
        originalLoctoTop: originalLoc.toTop,
        toLeftDelta,
        toleft: to.left,
        originalLoctoLeft: originalLoc.toLeft,
        edge,
      }, null, 2));
       */

      if (isCloseEnough(fromTopDelta, toTopDelta) && isCloseEnough(fromLeftDelta, toLeftDelta )) {
        const movedEdge = {
          ...edge,
          pathPoints: edge.pathPoints.map(([left, top]) => ([left + fromLeftDelta, top + fromTopDelta] as [number, number])), // TODO: no cast
        };
        /*
        console.log(JSON.stringify({
          edge,
          movedEdge,
        }, null, 2));
         */
        edgesOut.push(movedEdge);
      }
    });

    positionEdges.forEach((originalLoc, edge) => {
      const from = positionVertices.get(edge.edge.from);
      if (!from) throw new Error('From missing');
      const to = positionVertices.get(edge.edge.to);
      if (!to) throw new Error('to missing');

      const fromTopDelta = (graphOut.height - from.top) - originalLoc.fromTop;
      const fromLeftDelta = from.left - originalLoc.fromLeft;
      const toTopDelta = (graphOut.height - to.top) - originalLoc.toTop;
      const toLeftDelta = to.left - originalLoc.toLeft;

      console.log(JSON.stringify({
        fromTopDelta,
        fromtop: graphOut.height - from.top,
        originalLocfromTop: originalLoc.fromTop,
        fromLeftDelta,
        fromleft: from.left,
        originalLocfromLeft: originalLoc.fromLeft,
        toTopDelta,
        totop: graphOut.height - to.top,
        originalLoctoTop: originalLoc.toTop,
        toLeftDelta,
        toleft: to.left,
        originalLoctoLeft: originalLoc.toLeft,
      }, null, 2));

      if (isCloseEnough(fromTopDelta, toTopDelta) && isCloseEnough(fromLeftDelta, toLeftDelta )) {
        const { x: prevX = 0, y: prevY = 0 } = edge.translate || {};
        const movedEdge = {
          ...edge,
          translate: {
            x: fromLeftDelta + prevX,
            y: fromTopDelta + prevY,
          },
        };
        /*
        console.log(JSON.stringify({
          edge,
          movedEdge,
        }, null, 2));
         */
        edgesOut.push(movedEdge);
        console.log('close enough');
      } else console.log('not close enough');
    });

    if (graphOut) console.log('should be subset af');
    console.log(graphOut, edgesOut, verticesOut);
    if (graphOut) return { graph: graphOut, edges: edgesOut, vertices: verticesOut };
  }

  // console.log('going to dot');
  const dot = toDot(newEdges, inVertices, layoutOptions);
  // const dot = toDot(newEdges, Array.from(newVertices.values()), layoutOptions);
  // console.log('dotted');

  const { totalMemory = undefined } = layoutOptions || {};
  const options = { totalMemory, engine: phase === EWorkerPhase.Edges ? 'neato' : 'dot', format: 'plain' };
  // console.log('going to viz');

  const plainOut = viz(dot, options);
  // console.log('vizzed');

  // console.log('going to conv');
  const { edges, graph, vertices } = convPlain(plainOut, phase !== EWorkerPhase.Positions);
  // console.log('conved');

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
