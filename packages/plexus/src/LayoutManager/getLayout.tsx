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

import { TWorkerOutputMessage, TWorkerInputMessage, EWorkerPhase, TLayoutOptions } from './types';
import { TEdge, TLayoutEdge, TLayoutGraph, TLayoutVertex, TNomogram, TSizeVertex } from '../types';

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

// const SHIFT_THRESHOLD = 1e-5;
const SHIFT_THRESHOLD = 1e-3;

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

type TGraft = {
  anchorKey: string;
  anchorDirection: 'to' | 'from';
  edges: TEdge[],
  vertices: TSizeVertex[],
};

type TEdgeLoc = {
  fromLeft: number,
  fromTop: number,
  toLeft: number,
  toTop: number,
};

export default function getLayout({
  phase,
  positionedVertices: inPositionedVertices,
  newVertices: inNewVertices,
  positionedEdges: inPositionedEdges,
  newEdges: inNewEdges,
  options: layoutOptions,
  prevNomogram,
  prevGraph,
}: Omit<TWorkerInputMessage, 'meta'> & { phase: EWorkerPhase }): Omit<Omit<TWorkerOutputMessage, 'type'>, 'meta'> & {
  layoutError?: true,
} {
  const positionedVertices: Map<string, TLayoutVertex> = new Map(inPositionedVertices);
  const positionedEdges: Map<TLayoutEdge, TEdgeLoc> = new Map();
  inPositionedEdges.forEach((le, e) => {
    const from = positionedVertices.get(e.from);
    if (!from) throw new Error('From missing');
    const to = positionedVertices.get(e.to);
    if (!to) throw new Error('to missing');
    if (!prevGraph) throw new Error('Cannot have positioned edges without previous graph');
    positionedEdges.set(le, {
      fromLeft: from.left,
      fromTop: prevGraph.height - from.top,
      toLeft: to.left,
      toTop: prevGraph.height - to.top,
    });
  });

  // TODO: return zoom pan
  function reframeVertices(): TLayoutGraph {
    let mostLeft: number | undefined;
    let mostRight: number | undefined;
    let mostTop: number | undefined;
    let mostBottom: number | undefined;
    positionedVertices.forEach(({ left, top, height, width }) => {
      const bottomBorder = top - height / 2;
      if (mostBottom === undefined || bottomBorder < mostBottom) mostBottom = bottomBorder;
      const leftBorder = left - width / 2;
      if (mostLeft === undefined || leftBorder < mostLeft) mostLeft = leftBorder;
      const rightBorder = left + width / 2;
      if (mostRight === undefined || rightBorder > mostRight) mostRight = rightBorder;
      const topBorder = top + height / 2;
      if (mostTop === undefined || topBorder > mostTop) mostTop = topBorder;
    });

    if (mostBottom === undefined || mostLeft === undefined || mostRight === undefined || mostTop === undefined) throw new Error('No position vertices');

    if (mostLeft !== 0 || mostBottom !== 0) {
      // console.log({ mostLeft, mostBottom });
      positionedVertices.forEach(({ left, top, ...rest }, key) => {
        positionedVertices.set(key, {
          ...rest,
          // TODO: no cast
          left: left - (mostLeft as number),
          // TODO: no cast
          top: top - (mostBottom as number),
        });
      });
    }

      /*
    console.log({
      mostLeft,
      mostRight,
      mostTop,
      mostBottom,
    });
       */

    return {
      scale: 1,
      width: mostRight - mostLeft,
      height: mostTop - mostBottom,
    };
  }

  function reframeEdges(newGraph: TLayoutGraph): Map<TEdge, TLayoutEdge> {
    const movedEdges = new Map<TEdge, TLayoutEdge>();
    positionedEdges.forEach((originalLoc, edge) => {
      const from = positionedVertices.get(edge.edge.from);
      if (!from) throw new Error('From missing');
      const to = positionedVertices.get(edge.edge.to);
      if (!to) throw new Error('to missing');

      const fromTopDelta = (newGraph.height - from.top) - originalLoc.fromTop;
      const fromLeftDelta = from.left - originalLoc.fromLeft;
      const toTopDelta = (newGraph.height - to.top) - originalLoc.toTop;
      const toLeftDelta = to.left - originalLoc.toLeft;

      if (isCloseEnough(fromTopDelta, toTopDelta) && isCloseEnough(fromLeftDelta, toLeftDelta )) {
        const { x: prevX = 0, y: prevY = 0 } = edge.translate || {};
        const movedEdge = {
          ...edge,
          translate: {
            x: fromLeftDelta + prevX,
            y: fromTopDelta + prevY,
          },
        };
        movedEdges.set(edge.edge, movedEdge);
        // console.log('close enough');
      } else {
        // console.log('not close enough');
        if (phase === EWorkerPhase.Edges) {
          /*
          console.log(JSON.stringify({
            fromTopDelta,
            toTopDelta,
            topCloseEnough: isCloseEnough(fromTopDelta, toTopDelta),
            fromLeftDelta,
            toLeftDelta,
            leftCloseEnough: isCloseEnough(fromLeftDelta, toLeftDelta ),
          }, null, 2));
           */
        }
      }
    });

    return movedEdges;
  }

  if (phase === EWorkerPhase.Edges) {
    if (!prevGraph) throw new Error('Cannot add edges without previous graph');

    const verArr = Array.from(inPositionedVertices.values());
    // TODO: consider give all edges then detangle
    const dot = toDot(inNewEdges, verArr, layoutOptions);
    const { totalMemory = undefined } = layoutOptions || {};
    const options = { totalMemory, engine: phase === EWorkerPhase.Edges ? 'neato' : 'dot', format: 'plain' };
    const plainOut = viz(dot, options);
    const { edges, graph, vertices } = convPlain(plainOut, phase !== EWorkerPhase.Positions);
    const [key, { left, top }] = positionedVertices.entries().next().value;
    positionedVertices.clear();
    vertices.forEach(v => positionedVertices.set(v.vertex.key, v));
    const newLoc = positionedVertices.get(key);
    if (!newLoc) throw new Error(`${key} was lost when making edges`);
    const { panX: prevPanX = 0, panY: prevPanY = 0 } = prevNomogram || {};
    const nomogram = {
      panX: prevPanX + left - newLoc.left,
      panY: prevPanY + (prevGraph.height - top) - (graph.height - newLoc.top), // gotta do graph top delta again
      shouldTransition: false,
    };
    const movedEdges = reframeEdges(graph);
    const result = getVerticesValidity(verArr, vertices);

    const newEdges = new Map<TEdge, TLayoutEdge>(edges ? edges.map(e => [e.edge, e]) : []);

    if (result.validity === EValidity.Error) {
      // console.log('error');
      const message = result.message;
      return {
        graph,
        newEdges,
        movedEdges,
        movedVertices: positionedVertices,
        nomogram,
        layoutError: true,
        layoutErrorMessage: message,
      };
    }
    if (result.validity === EValidity.Warn) {
      // console.log('only warn');
      return {
        graph,
        newEdges,
        movedEdges,
        movedVertices: positionedVertices,
        nomogram,
        layoutErrorMessage: result.message,
      };
    }
    return { newEdges, graph, movedEdges, movedVertices: positionedVertices, nomogram };
  }


  if (inNewVertices.size && inPositionedVertices.size) {
    const notSlidKeys: Set<string> = new Set(positionedVertices.keys());
    const newVertices: Map<string, TSizeVertex> = new Map(inNewVertices);

    // const edgesByFrom: Map<string, Map<string, TEdge>> = new Map();
    // const edgesByTo: Map<string, Map<string, TEdge>> = new Map();
    type TDir = 'to' | 'from';
    const dirs: TDir[] = ['to', 'from'];
    const dirCompliment: { [P in TDir]: TDir } = { 'to': 'from', 'from': 'to' };
    const edgesBy: { [P in TDir]: Map<string, Map<string, TEdge>> } = { to: new Map(), from: new Map() };
    inNewEdges.forEach(edge => {
      dirs.forEach((dir: TDir) => {
        const to = edgesBy[dir].get(edge[dir]);
        if (to) to.set(edge[dirCompliment[dir]], edge);
        else edgesBy[dir].set(edge[dir], new Map([[edge[dirCompliment[dir]], edge]]));
      });
    });

    // console.log('made edges');

    const graftQueue: TGraft[] = [];
    while(newVertices.size) {
      const [k, v] = newVertices.entries().next().value;
      newVertices.delete(k);
      const edges: Set<TEdge> = new Set();
      const vertices: TSizeVertex[] = [v];
      let anchorKey: undefined | string;
      let anchorDirection: undefined | TDir;

      const processEdges = (dir: TDir, key: string) => {
        if (key === anchorKey && anchorDirection === dir) return;
        const dirEdges = edgesBy[dir].get(key);
        if (dirEdges) {
          Array.from(dirEdges.values()).forEach(edge => {
            const connectedVertex = newVertices.get(edge[dirCompliment[dir]]);
            if (connectedVertex) {
              vertices.push(connectedVertex);
              edges.add(edge);
              newVertices.delete(edge[dirCompliment[dir]]);
            } else if (!anchorKey) {
              const anchorVertex = positionedVertices.get(edge[dirCompliment[dir]]);
              if (anchorVertex) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { top: _t, left: _l, ...sizeAnchor } = anchorVertex;
                vertices.push(sizeAnchor);
                anchorKey = anchorVertex.vertex.key;
                anchorDirection = dirCompliment[dir];
                edges.add(edge);
              }
            }
          });
        }
      }

      for(let i = 0; i < vertices.length; i++) {
        const vertex = vertices[i];
        const key = vertex.vertex.key;
        dirs.forEach(dir => processEdges(dir, key));
      }

      if (!anchorKey || !anchorDirection) throw new Error('New vertices not connected to graph');
      else graftQueue.push({
        anchorKey,
        anchorDirection,
        edges: Array.from(edges),
        vertices,
      });
    }

    // console.log('made grafts');
    // console.log(graftQueue);

    if (graftQueue.length) {
      if (!prevGraph) throw new Error('Cannot have new vertices without previous graph');
      const ranksep = layoutOptions && layoutOptions.ranksep || DEFAULT_GRAPH_ATTRS.ranksep;
      const nodesep = layoutOptions && layoutOptions.nodesep || DEFAULT_GRAPH_ATTRS.nodesep;
      const allGraftEdges: Map<TLayoutEdge, TEdgeLoc> = new Map();
      graftQueue.forEach(({ anchorDirection, anchorKey, edges, vertices }) => {
        const anchorVertex = positionedVertices.get(anchorKey);
        if (!anchorVertex) throw new Error(`Lost anchor: ${anchorKey}`);
        const { top: anchorTop, left: anchorLeft } = anchorVertex;
        const dot = toDot(edges, vertices, layoutOptions);

        const { totalMemory = undefined } = layoutOptions || {};
        const options = { totalMemory, engine: phase === EWorkerPhase.Edges ? 'neato' : 'dot', format: 'plain' };
        const plainOut = viz(dot, options);
        const { edges: graftEdges, graph: graftGraph, vertices: graftVerticesArr } = convPlain(plainOut, true);

        // console.log('made grapht');

        const graftVertices: Map<string, TLayoutVertex> = new Map();
        graftVerticesArr.forEach(v => graftVertices.set(v.vertex.key, v));
        const graftAnchor = graftVertices.get(anchorKey);
        // console.log(graftAnchor, graftVertices, anchorKey, anchorVertex);
        if (!graftAnchor) throw new Error(`Anchor not in graft: ${anchorKey}`);
        // console.log('got graftAnchor');
        const { top: graftAnchorTop, left: graftAnchorLeft } = graftAnchor;
        const leftAdjust = anchorLeft - graftAnchorLeft;
        const topAdjust = anchorTop - graftAnchorTop;
        if (graftEdges) { // TODO: If not necessary when true given to convPlain
          graftEdges.forEach(e => {
            const from = graftVertices.get(e.edge.from);
            if (!from) throw new Error('From missing');
            const to = graftVertices.get(e.edge.to);
            if (!to) throw new Error('to missing');
            allGraftEdges.set(e, {
              fromLeft: from.left,
              fromTop: from.top,
              toLeft: to.left,
              toTop: to.top,
            });
          });
        }

        // console.log('made graft edges');

        let slideDimension: 'top' | 'left';
        let otherDimension: 'top' | 'left';
        let slideCheckAttribute: 'height' | 'width';
        let otherAttribute: 'height' | 'width';
        let slideSectionDirection: -1 | 1 = anchorDirection === 'from' ? 1 : -1;

        const lowerSlideCandidates: TLayoutVertex[] = [];
        const upperSlideCandidates: TLayoutVertex[] = [];
        let lowerSlideDistance: number | undefined;
        let upperSlideDistance: number | undefined;

        const dir = (layoutOptions && layoutOptions.rankdir) || DEFAULT_GRAPH_ATTRS.rankdir;
        if (dir === 'BT' || dir === 'TB' ) {
          // console.log('TB or BT');
          slideDimension = 'top';
          otherDimension = 'left';
          slideCheckAttribute = 'height';
          otherAttribute = 'width';
          if (dir === 'TB') slideSectionDirection *= -1;

        } else if (dir === 'LR' || dir === 'RL') {
          // console.log('LR');
          slideDimension = 'left';
          otherDimension = 'top';
          slideCheckAttribute = 'width';
          otherAttribute = 'height';
          if (dir === 'RL') slideSectionDirection *= -1;
        } else {
          throw new Error('Unknown dir');
        }

        const SEP_PERCENTAGE = 0.8; /* TODO: tweak percentage */

        // TODO: everything after here shouldn't be divided by ifs
        const slideThreshold = anchorVertex[slideDimension] + (slideSectionDirection * (anchorVertex[slideCheckAttribute] / 2 + SEP_PERCENTAGE * ranksep));
        const slideDivisor = anchorVertex[otherDimension];
        const collisionLimit = slideThreshold + (slideSectionDirection * (graftGraph[slideCheckAttribute] - graftAnchor[slideCheckAttribute] + SEP_PERCENTAGE * ranksep));
        const collisionLowerBound = slideDivisor - (graftGraph[otherAttribute] - graftAnchor[otherDimension]) - SEP_PERCENTAGE * nodesep;
        const collisionUpperBound = collisionLowerBound + graftGraph[otherAttribute] + 2 * SEP_PERCENTAGE * nodesep;

        // console.log('going to see if need to slide');

        positionedVertices.forEach(existingVertex => {
          const slideThresholdCompareVal = existingVertex[slideDimension] + (slideSectionDirection * existingVertex[slideCheckAttribute] / 2);
          if (Math.sign(slideThresholdCompareVal - slideThreshold) === slideSectionDirection) {
            const collisionLimitCompareVal = existingVertex[slideDimension] - (slideSectionDirection * existingVertex[slideCheckAttribute] / 2);
            const isCloseEnoughOnSlideDimensionToCollide = Math.sign(collisionLimitCompareVal - collisionLimit) !== slideSectionDirection;
            const slideDivisorCompareVal = existingVertex[otherDimension];
            if (slideDivisorCompareVal <= slideDivisor) {
              lowerSlideCandidates.push(existingVertex);
              if (isCloseEnoughOnSlideDimensionToCollide) {
                const lowerSlideDistanceCompareVal = collisionLowerBound - (slideDivisorCompareVal + existingVertex[otherAttribute] / 2);
                if (lowerSlideDistanceCompareVal < 0 && (lowerSlideDistance === undefined || lowerSlideDistanceCompareVal < lowerSlideDistance)) lowerSlideDistance = lowerSlideDistanceCompareVal;
              }
            } else {
              upperSlideCandidates.push(existingVertex);
              if (isCloseEnoughOnSlideDimensionToCollide) {
                const upperSlideDistanceCompareVal = collisionUpperBound - (slideDivisorCompareVal - existingVertex[otherAttribute] / 2);
                if (upperSlideDistanceCompareVal > 0 && (upperSlideDistance === undefined || upperSlideDistanceCompareVal > upperSlideDistance)) upperSlideDistance = upperSlideDistanceCompareVal;
              }
            }
          }
        });

        // console.log('slide necessity calculated');

        if (lowerSlideDistance) {
          // shouldTransition = true;
          // console.log('need to lower slide', lowerSlideCandidates.length);
          lowerSlideCandidates.forEach(vertex => {
            notSlidKeys.delete(vertex.vertex.key);
            positionedVertices.set(vertex.vertex.key, {
              ...vertex,
              [otherDimension]: vertex[otherDimension] + (lowerSlideDistance as number),
            });
          });
        }

        if (upperSlideDistance) {
          // shouldTransition = true;
          // console.log('need to upper slide', upperSlideCandidates.length);
          upperSlideCandidates.forEach(vertex => {
            notSlidKeys.delete(vertex.vertex.key);
            positionedVertices.set(vertex.vertex.key, {
              ...vertex,
              [otherDimension]: vertex[otherDimension] + (upperSlideDistance as number),
            });
          });
        }

        graftVertices.forEach(({ left, top, ...rest }) => {
          if (rest.vertex.key !== anchorKey) {
            positionedVertices.set(rest.vertex.key, {
              left: left + leftAdjust,
              top: top + topAdjust,
              ...rest,
            });
          }
        });
      });

      const graphOut = reframeVertices();
      let nomogram: TNomogram | undefined;
      const geostationaryKey = notSlidKeys.values().next().value;
      if (geostationaryKey) {
        const inPosition = inPositionedVertices.get(geostationaryKey);
        if (!inPosition) throw new Error(`key: ${geostationaryKey} mutated out of input`);
        const outPosition = positionedVertices.get(geostationaryKey);
        if (!outPosition) throw new Error(`key: ${geostationaryKey} absent from output`);
        const { left: inLeft, top: inTop } = inPosition;
        const { left: outLeft, top: outTop } = outPosition;
        nomogram = {
          panX: inLeft - outLeft,
          panY: (prevGraph.height - inTop) - (graphOut.height - outTop),
          shouldTransition: notSlidKeys.size !== inPositionedVertices.size,
        };
      }
      const movedEdges = reframeEdges(graphOut);
      const newEdges = new Map<TEdge, TLayoutEdge>();
      allGraftEdges.forEach((originalLoc, edge) => {
        const from = positionedVertices.get(edge.edge.from);
        if (!from) throw new Error('From missing');
        const to = positionedVertices.get(edge.edge.to);
        if (!to) throw new Error('to missing');

        const fromTopDelta = from.top - originalLoc.fromTop;
        const fromLeftDelta = from.left - originalLoc.fromLeft;
        const toTopDelta = to.top - originalLoc.toTop;
        const toLeftDelta = to.left - originalLoc.toLeft;

        if (isCloseEnough(fromTopDelta, toTopDelta) && isCloseEnough(fromLeftDelta, toLeftDelta )) {
          newEdges.set(edge.edge, {
            ...edge,
            pathPoints: edge.pathPoints.map(([left, top]) => ([left + fromLeftDelta, top + fromTopDelta] as [number, number])), // TODO: no cast
          });
        }
      });

      const movedVertices = new Map<string, TLayoutVertex>();
      const positionedNewVertices = new Map<string, TLayoutVertex>();
      positionedVertices.forEach((v, key) => {
        if (inPositionedVertices.has(key)) movedVertices.set(key, v);
        else positionedNewVertices.set(key, v);
      });

      return { graph: graphOut, movedEdges, movedVertices, newEdges, newVertices: positionedNewVertices, nomogram };
    }
  }

  const newVerArr = Array.from(inNewVertices.values());
  const dot = toDot(inNewEdges, newVerArr, layoutOptions);
  const { totalMemory = undefined } = layoutOptions || {};
  const options = { totalMemory, engine: phase === EWorkerPhase.Edges ? 'neato' : 'dot', format: 'plain' };
  const plainOut = viz(dot, options);
  const { edges, graph, vertices } = convPlain(plainOut, phase !== EWorkerPhase.Positions);

  const newEdges = new Map<TEdge, TLayoutEdge>(edges ? edges.map(e => [e.edge, e]) : []);
  const newVertices = new Map<string, TLayoutVertex>(vertices.map(v => [v.vertex.key, v]));

  return { newEdges, graph, newVertices };
}
