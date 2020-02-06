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

/* eslint-disable no-console */

import * as convCoord from './dot/conv-coord';
import convInputs from './convInputs';
// eslint-disable-next-line import/order, import/no-unresolved
import LayoutWorker from './layout.worker.bundled';

import {
  ECoordinatorPhase,
  EWorkerErrorType,
  EWorkerPhase,
  TLayoutOptions,
  TUpdate,
  TWorkerErrorMessage,
  TWorkerInputMessage,
  TWorkerOutputMessage,
} from './types';
import { TEdge, TLayoutEdge, TLayoutGraph, TLayoutVertex, TSizeVertex } from '../types';

// TODO: Move?
const len = (arr: unknown[] | null | undefined): number => arr ? arr.length : 0;

type TCurrentLayout = {
  /* cleaned: {
    edges: (TLayoutEdge | TEdge<{}>)[];
    vertices: TSizeVertex<{}>[];
  }; */
  cleanedEdges: TEdge[];
  id: number;
  input: {
    // edges: TEdge<any>[];
    unmapEdges: (output: TLayoutEdge<{}>[]) => TLayoutEdge<any>[];
    unmapVertices: (output: TLayoutVertex<{}>[]) => TLayoutVertex<any>[];
    // vertices: TSizeVertex<any>[];
    edgeCount: number;
    vertexCount: number;
  };
  options: TLayoutOptions | null;
  status: {
    workerId?: number | null;
    phase: ECoordinatorPhase;
  };
};

function killWorker(worker: LayoutWorker) {
  const w = worker;
  // to make flow happy
  const noop = () => {};
  w.onmessage = noop;
  // $FlowIgnore - https://github.com/facebook/flow/issues/6191
  w.onmessageerror = noop;
  w.onerror = noop;
  w.terminate();
}

function findAndRemoveWorker(lists: LayoutWorker[][], worker: LayoutWorker) {
  for (let i = 0; i < lists.length; i++) {
    const list = lists[i];
    const wi = list.indexOf(worker);
    if (wi >= 0) {
      list.splice(wi, 1);
      return { ok: true, list };
    }
  }
  return { ok: false };
}

export default class Coordinator {
  currentLayout: TCurrentLayout | null;
  nextWorkerId: number;
  idleWorkers: LayoutWorker[];
  busyWorkers: LayoutWorker[];
  callback: (update: TUpdate<any, any>) => void;

  constructor(callback: (update: TUpdate<any, any>) => void) {
    this.callback = callback;
    this.currentLayout = null;
    this.nextWorkerId = 0;
    this.idleWorkers = [];
    this.busyWorkers = [];
  }

  getLayout<T, U>({
    id,
    moveVertices: inMoveVertices,
    newVertices: inNewVertices,
    moveEdges: inMoveEdges,
    newEdges: inNewEdges,
    options,
    prevGraph,
  }: {
    id: number,
    moveVertices: TLayoutVertex<T>[],
    newVertices: TSizeVertex<T>[],
    moveEdges: TLayoutEdge<U>[],
    newEdges: TEdge<U>[],
    options: TLayoutOptions | void,
    prevGraph: TLayoutGraph | null,
  }) {
    this.busyWorkers.forEach(killWorker);
    this.busyWorkers.length = 0;
    const { 
      moveVertices: _moveVertices,
      newVertices: _newVertices,
      moveEdges: _moveEdges,
      // newEdges: _newEdges,
      newEdges,
      unmapEdges, 
      unmapVertices,
    } = convInputs({
      inMoveVertices,
      inNewVertices,
      inMoveEdges,
      inNewEdges,
    });
    const moveEdges = _moveEdges.map(convCoord.edgeToDot);
    const moveVertices = _moveVertices.map(v => convCoord.layoutVertexToDot(v, prevGraph));
    const newVertices = _newVertices.map(v => convCoord.sizeVertexToDot(v));
    this.currentLayout = {
      id,
      // cleaned: { edges, vertices },
      cleanedEdges: newEdges,
      options: options || null,
      input: { edgeCount: len(moveEdges) + len(newEdges), /* edges: inEdges, */ unmapEdges, unmapVertices, vertexCount: len(moveVertices) + len(newVertices), /* vertices: inVertices */ },
      status: { phase: ECoordinatorPhase.NotStarted },
    };
    const isDotOnly = Boolean(options && options.useDotEdges);
    // const phase = inMoveVertices.length ? EWorkerPhase.Reposition : (isDotOnly ? EWorkerPhase.DotOnly : EWorkerPhase.Positions);
    const phase = isDotOnly ? EWorkerPhase.DotOnly : EWorkerPhase.Positions;
    // this._postWork(phase, edges, vertices, previousGraph && convCoord.graphToDot(previousGraph));
    this._postWork({
      moveVertices,
      newVertices,
      moveEdges,
      newEdges,
      phase,
      prevGraph: prevGraph && convCoord.graphToDot(prevGraph),
    });
  }

  stopAndRelease() {
    this.idleWorkers.forEach(killWorker);
    this.idleWorkers.length = 0;
    this.busyWorkers.forEach(killWorker);
    this.busyWorkers.length = 0;
    this.currentLayout = null;
  }

  _initWorker() {
    const worker = new LayoutWorker();
    worker.id = this.nextWorkerId;
    this.nextWorkerId++;
    worker.onerror = this._handleVizWorkerError;
    worker.onmessageerror = this._handleVizWorkerMessageError;
    worker.onmessage = this._handleVizWorkerMessage;
    return worker;
  }

  _makeWorkerIdle(worker: LayoutWorker) {
    const { ok } = findAndRemoveWorker([this.busyWorkers, this.idleWorkers], worker);
    if (ok) {
      this.idleWorkers.push(worker);
    } else {
      killWorker(worker);
    }
  }

  _postWork(input: {
    phase: EWorkerPhase,
    moveVertices: TLayoutVertex[],
    newVertices: TSizeVertex[],
    moveEdges: TLayoutEdge[],
    newEdges: TEdge[],
    prevGraph: TLayoutGraph | null,
  }) {
    // }), edges: (TEdge | TLayoutEdge)[], vertices: (TSizeVertex | TLayoutVertex)[], previousGraph: TLayoutGraph | null = null) {
    const { phase, ...rest } = input;
    if (!this.currentLayout) {
      throw new Error('_startWork called without a current layout');
    }
    const { id, options, status } = this.currentLayout;
    const worker = this.idleWorkers.pop() || this._initWorker();
    this.busyWorkers.push(worker);
    status.phase = phase as any;
    status.workerId = worker.id;
    const message: TWorkerInputMessage = {
      ...rest,
      options,
      meta: {
        phase,
        layoutId: id,
        workerId: worker.id,
      },
    };
    worker.postMessage(message);
  }

  _handleVizWorkerError = (event: ErrorEvent) => {
    const worker = event.target as LayoutWorker;
    const { ok } = findAndRemoveWorker([this.busyWorkers, this.idleWorkers], worker);
    if (ok) {
      console.error('Viz worker onerror');
      console.error(event);
      killWorker(worker);
    } else {
      console.error('Viz worker onerror from unknown viz worker');
      console.error(event);
    }
  };

  _handleVizWorkerMessageError = (event: ErrorEvent) => {
    // TODO(joe): something more useful
    const msg = {
      event,
      currentLayout: this.currentLayout,
      errorType: '_handleVizWorkerMessageError',
    };
    console.error(msg);
  };

  _handleVizWorkerMessage = (event: MessageEvent) => {
    const worker: LayoutWorker = event.target as LayoutWorker;
    const workerMessage = event.data as TWorkerOutputMessage | TWorkerErrorMessage;
    const { type } = workerMessage;
    this._makeWorkerIdle(worker);
    const isStale =
      !this.currentLayout ||
      Boolean(workerMessage.meta && workerMessage.meta.layoutId !== this.currentLayout.id);
    if (type === EWorkerErrorType.Error) {
      console.error(`${isStale ? '(stale) ' : ''}Error from viz.worker`, event);
      return;
    }
    if (isStale) {
      return;
    }
    if (type === EWorkerErrorType.LayoutError) {
      // TODO(joe): implement retries with more spacing
      console.error('layout-error', event);
      return;
    }
    if (
      workerMessage.type === EWorkerPhase.Positions ||
      workerMessage.type === EWorkerPhase.Edges ||
      workerMessage.type === EWorkerPhase.DotOnly
    ) {
      this._processResult(type, workerMessage);
      return;
    }
    console.error(`Unknown worker message type: ${type}`, event);
  };

  _processResult(phase: EWorkerPhase, workerMessage: TWorkerOutputMessage) {
    const layout = this.currentLayout;
    if (!layout) {
      // make flow happy - this is already checked and should not happen
      return;
    }
    const { moveEdges: dotMoveEdges, newEdges: dotNewEdges, graph, meta, moveVertices: dotMoveVertices, newVertices: dotNewVertices } = workerMessage;
    const { workerId } = meta;
    const { cleanedEdges /* cleaned */, input, status } = layout;
    const { phase: stPhase, workerId: stWorkerId } = status;
    const { edgeCount: inEdgeCount, vertexCount: inVertexCount } = input;

    if ((phase as any) !== stPhase || workerId !== stWorkerId) {
      console.error(`Have work results, but in an invalid state`);
      return;
    }

    const moveVertexCount = len(dotMoveVertices);
    const newVertexCount = len(dotNewVertices);
    const moveEdgeCount = len(dotMoveEdges);
    const newEdgeCount = len(dotNewEdges);

    if (
        (moveVertexCount + newVertexCount !== inVertexCount)
        || !graph
        // || (phase !== EWorkerPhase.Positions && !newEdges)) {
        || (phase === EWorkerPhase.Edges && (moveEdgeCount + newEdgeCount !== inEdgeCount))
    ) {
      console.error('Have work results, but recieved invalid result data');
      return;
    }

    const adjVertexCoords = convCoord.vertexToPixels.bind(null, graph);
    const moveVertices = dotMoveVertices && input.unmapVertices(dotMoveVertices.map(adjVertexCoords));
    const newVertices = dotNewVertices && input.unmapVertices(dotNewVertices.map(adjVertexCoords));
    const moveEdges = dotMoveEdges && input.unmapEdges(dotMoveEdges.map(edge => convCoord.edgeToPixels(graph, edge)) as TLayoutEdge<{}>[]); // TODO no cast
    const newEdges = dotNewEdges && input.unmapEdges(dotNewEdges.map(edge => convCoord.edgeToPixels(graph, edge)) as TLayoutEdge<{}>[]); // TODO no cast

    const adjGraph = convCoord.graphToPixels(graph);

    /*
    let positionsEdges: TLayoutEdge[] | undefined;
    let positionsVertices: TLayoutVertex[] | undefined;
    let doneEdges: TLayoutEdge[] | undefined;
    let doneVertices: TLayoutVertex[] | undefined;
     */

    if (phase === EWorkerPhase.Positions) {
      // TODO:
      throw new Error('EWorkerPhase.Positions is not currently under consideration');
    } else if (phase === EWorkerPhase.DotOnly) {
      if (moveVertexCount === inVertexCount && moveEdgeCount === inEdgeCount) {
        const vertexMap = new Map((moveVertices || []).map(v => [v.vertex.key, v]));
        const edgeMap = new Map((moveEdges || []).map(e => [e.edge, e]));
        this.callback({
          type: ECoordinatorPhase.Done,
          layoutId: layout.id,
          graph: adjGraph,
          edges: edgeMap,
          vertices: vertexMap,
        });
      } else if (newVertexCount === inVertexCount && newEdgeCount === inEdgeCount) {
        const vertexMap = new Map((newVertices || []).map(v => [v.vertex.key, v]));
        const edgeMap = new Map((newEdges || []).map(e => [e.edge, e]));
        this.callback({
          type: ECoordinatorPhase.Done,
          layoutId: layout.id,
          graph: adjGraph,
          edges: edgeMap,
          vertices: vertexMap,
        });
      } else {
        const moveVertexMap = new Map((moveVertices || []).map(v => [v.vertex.key, v]));
        const moveEdgeMap = new Map((moveEdges || []).map(e => [e.edge, e]));
        this.callback({
          type: ECoordinatorPhase.Positions,
          layoutId: layout.id,
          graph: adjGraph,
          edges: moveEdgeMap,
          vertices: moveVertexMap,
        });
        if (moveEdgeCount + newEdgeCount === inEdgeCount) {
          const vertexMap = new Map(moveVertexMap);
          (newVertices || []).forEach(v => vertexMap.set(v.vertex.key, v));
          const edgeMap = new Map(moveEdgeMap);
          (newEdges || []).forEach(e => edgeMap.set(e.edge, e));
          this.callback({
            type: ECoordinatorPhase.Done,
            layoutId: layout.id,
            graph: adjGraph,
            edges: edgeMap,
            vertices: vertexMap,
          });
        } else {
          console.log(`need to make ${inEdgeCount - moveEdgeCount - newEdgeCount} edges`);
        }
      }
    } else if (phase === EWorkerPhase.Edges) {
      throw new Error('EWorkerPhase.Edges is not currently under consideration');
    }
    /*
    // TODO fix check
    if ((!moveVertices && !newVertices) || !graph || (phase !== EWorkerPhase.Positions && !newEdges)) {
      console.error('Have work results, but recieved invalid result data');
      return;
    }
     */

      /*
    const adjVertexCoords = convCoord.vertexToPixels.bind(null, graph);
    const adjCleanNewVertices = newVertices && newVertices.map<TLayoutVertex>(adjVertexCoords);
    const adjCleanMoveVertices = moveVertices && moveVertices.map<TLayoutVertex>(adjVertexCoords);
    const adjNewVertices = adjCleanNewVertices && input.unmapVertices(adjCleanNewVertices);
    const adjMoveVertices = adjCleanMoveVertices && input.unmapVertices(adjCleanMoveVertices);
    const adjGraph = convCoord.graphToPixels(graph);
    const vertexMap = new Map(adjVertices.map(v => [v.vertex.key, v]));

    // IF SLIDING INCLUDE EXISTING NODES AND EDGES IN FIRST CALL BACK AND NEW NODES AND EDGES IN SECOND
    // TODO: DotOnly only does not return edges?
    // SEPARATE RETURN!!
    if (phase === EWorkerPhase.Positions || phase === EWorkerPhase.DotOnly) {
      this.callback({
        type: ECoordinatorPhase.Positions,
        layoutId: layout.id,
        graph: adjGraph,
        vertices: vertexMap,
      });
    }
    // phase is either edges or dot-only
    if (edges) {
      const pixelEdges = edges.map(edge => convCoord.edgeToPixels(graph, edge));
      // TODO shouldn't need `<{}>`
      const mergedEdges = input.unmapEdges(pixelEdges as TLayoutEdge<{}>[]);
      const edgeMap = new Map(mergedEdges.map(e => [e.edge, e]));
      this.callback({
        type: ECoordinatorPhase.Done,
        layoutId: layout.id,
        graph: adjGraph,
        edges: edgeMap,
        vertices: vertexMap,
      });
    }
    if (phase === EWorkerPhase.Positions) {
      this._postWork({ phase: EWorkerPhase.Edges, newEdges: cleanedEdges, newVertices: vertices });
    }
       */
  }
}
