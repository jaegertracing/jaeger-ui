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
  TGetLayout,
  TLayoutOptions,
  TUpdate,
  TWorkerErrorMessage,
  TWorkerInputMessage,
  TWorkerOutputMessage,
} from './types';
import { TEdge, TLayoutEdge, TLayoutGraph, TLayoutVertex, TSizeVertex } from '../types';

const size = (input: Map<unknown, unknown> | unknown[] | null | undefined): number => input
  ? Array.isArray(input)
    ? input.length
    : input.size
  : 0;

type TCurrentLayout = {
  cleanedEdges: TEdge[];
  id: number;
  input: {
    unmapEdges: (output: Map<TEdge, TLayoutEdge>) => Map<TEdge, TLayoutEdge>;
    unmapVertices: (output: Map<string, TLayoutVertex>) => Map<string, TLayoutVertex>;
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
    options,
    positionedVertices: inPositionedVertices,
    newVertices: inNewVertices,
    positionedEdges: inPositionedEdges,
    newEdges: inNewEdges,
    prevGraph,
  }: TGetLayout & {
    id: number,
    options: TLayoutOptions | void,
  }) {
    this.busyWorkers.forEach(killWorker);
    this.busyWorkers.length = 0;
    const { 
      positionedVertices: _positionedVertices,
      newVertices: _newVertices,
      positionedEdges: _positionedEdges,
      newEdges,
      unmapEdges, 
      unmapVertices,
    } = convInputs({
      inPositionedVertices,
      inNewVertices,
      inPositionedEdges,
      inNewEdges,
    });
    const positionedEdges = new Map<TEdge, TLayoutEdge>();
    _positionedEdges.forEach((le, e) => positionedEdges.set(e, convCoord.edgeToDot(le)));
    const positionedVertices = new Map<string, TLayoutVertex>();
    _positionedVertices.forEach((v, id) => positionedVertices.set(id, convCoord.layoutVertexToDot(v, prevGraph)));
    const newVertices = new Map<string, TSizeVertex>();
    _newVertices.forEach((v, id) => newVertices.set(id, convCoord.sizeVertexToDot(v)));
    this.currentLayout = {
      id,
      cleanedEdges: newEdges.concat(Array.from(positionedEdges.keys())),
      options: options || null,
      input: { edgeCount: size(positionedEdges) + size(newEdges), unmapEdges, unmapVertices, vertexCount: size(positionedVertices) + size(newVertices) },
      status: { phase: ECoordinatorPhase.NotStarted },
    };
    const isDotOnly = Boolean(options && options.useDotEdges);
    const phase = !newVertices.size ? EWorkerPhase.Edges : (isDotOnly ? EWorkerPhase.DotOnly : EWorkerPhase.Positions);
    this._postWork({
      positionedVertices,
      newVertices,
      positionedEdges,
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
  } & TGetLayout) {
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
    console.log(msg);
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
    console.log('processing results');
    const layout = this.currentLayout;
    if (!layout) {
      // make flow happy - this is already checked and should not happen
      console.log('no layout');
      return;
    }
    const { movedEdges: dotMovedEdges = new Map(), newEdges: dotNewEdges = new Map(), graph, meta, movedVertices: dotMovedVertices = new Map(), newVertices: dotNewVertices = new Map(), nomogram: _nomogram } = workerMessage;
    const { workerId } = meta;
    const { cleanedEdges, input, status } = layout;
    const { phase: stPhase, workerId: stWorkerId } = status;
    const { edgeCount: inEdgeCount, vertexCount: inVertexCount } = input;

    if ((phase as any) !== stPhase || workerId !== stWorkerId) {
      console.error(`Have work results, but in an invalid state`);
      return;
    }

    const movedVertexCount = size(dotMovedVertices);
    const newVertexCount = size(dotNewVertices);
    const movedEdgeCount = size(dotMovedEdges);
    const newEdgeCount = size(dotNewEdges);

    console.log(phase, movedVertexCount, newVertexCount, inVertexCount, movedEdgeCount, newEdgeCount, inEdgeCount);

    if (
        (movedVertexCount + newVertexCount !== inVertexCount)
        || !graph
        || (phase === EWorkerPhase.Edges && (movedEdgeCount + newEdgeCount !== inEdgeCount))
    ) {
      console.error('Have work results, but received invalid result data');
      console.log('Have work results, but received invalid result data');
      return;
    }

    // TODO: mapMap util
    const movedVertices = input.unmapVertices(
      new Map<string, TLayoutVertex>(
        Array.from(dotMovedVertices.entries())
          .map(([k, v]) => [k, convCoord.vertexToPixels(graph, v)])
      )
    );
    const newVertices = input.unmapVertices(
      new Map<string, TLayoutVertex>(
        Array.from(dotNewVertices.entries())
          .map(([k, v]) => [k, convCoord.vertexToPixels(graph, v)])
      )
    );
    const movedEdges = input.unmapEdges(
      new Map<TEdge, TLayoutEdge>(
        Array.from(dotMovedEdges.entries())
        .map(([e, le]) => [e, convCoord.edgeToPixels(graph, le)])
      )
    );
    const pixelNewEdges = new Map<TEdge, TLayoutEdge>(
      Array.from(dotNewEdges.entries())
        .map(([e, le]) => [e, convCoord.edgeToPixels(graph, le)])
    );
    const newEdges = input.unmapEdges(pixelNewEdges);

    const adjGraph = convCoord.graphToPixels(graph);
    const nomogram = _nomogram && convCoord.nomogramToPixels(_nomogram);

    if (phase === EWorkerPhase.Positions) {
      // TODO:
      this.callback({
        type: ECoordinatorPhase.Positions,
        layoutId: layout.id,
        graph: adjGraph,
        nomogram,
        vertices: movedVertexCount ? movedVertices : newVertices,
      });
      this._postWork({
        positionedVertices: new Map<string, TLayoutVertex>([
          ...dotNewVertices,
          ...dotMovedVertices,
        ]),
        newVertices: new Map(),
        positionedEdges: new Map(),
        newEdges: cleanedEdges,
        phase: EWorkerPhase.Edges,
        prevGraph: graph,
      });
    } else if (phase === EWorkerPhase.DotOnly) {
      if (movedVertexCount === inVertexCount && movedEdgeCount === inEdgeCount) {
        console.log('all moved');
        this.callback({
          type: ECoordinatorPhase.Done,
          layoutId: layout.id,
          graph: adjGraph,
          edges: movedEdges,
          nomogram,
          vertices: movedVertices,
        });
      } else if (newVertexCount === inVertexCount && newEdgeCount === inEdgeCount) {
        console.log('all new');
        this.callback({
          type: ECoordinatorPhase.Done,
          layoutId: layout.id,
          graph: adjGraph,
          edges: newEdges,
          nomogram,
          vertices: newVertices,
        });
      } else {
        console.log('mixed');
        this.callback({
          type: ECoordinatorPhase.Positions,
          layoutId: layout.id,
          graph: adjGraph,
          edges: movedEdges,
          nomogram,
          vertices: movedVertices,
        });
        const positionedVertices = new Map(movedVertices);
        newVertices.forEach((v, k) => positionedVertices.set(k, v));
        const positionedEdges = new Map(movedEdges);
        newEdges.forEach((le, e) => positionedEdges.set(e, le));
        if (movedEdgeCount + newEdgeCount === inEdgeCount) {
          console.log('mixed but done');
          this.callback({
            type: ECoordinatorPhase.Done,
            layoutId: layout.id,
            graph: adjGraph,
            edges: positionedEdges,
            nomogram,
            vertices: positionedVertices,
          });
        } else {
          console.log(`need to make ${inEdgeCount - movedEdgeCount - newEdgeCount} edges`);
          const reprocessEdges = new Map<TEdge, TLayoutEdge>([
            ...pixelNewEdges,
            ...dotMovedEdges,
          ]);
          const madeEdges = new Map<string, Set<string>>();
          reprocessEdges.forEach((le, edge) => {
            const tos = madeEdges.get(edge.from);
            if (tos) tos.add(edge.to);
            else madeEdges.set(edge.from, new Set([edge.to]));
          });
          console.log(reprocessEdges, positionedEdges, madeEdges, cleanedEdges);
          this._postWork({
            positionedVertices: new Map<string, TLayoutVertex>([
              ...dotNewVertices,
              ...dotMovedVertices,
            ]),
            newVertices: new Map(),
            positionedEdges: reprocessEdges,
            newEdges: cleanedEdges.filter(e => {
              const tos = madeEdges.get(e.from);
              if (!tos) return true;
              return !tos.has(e.to);
            }),
            phase: EWorkerPhase.Edges,
            prevGraph: graph,
          });
        }
      }
    } else if (phase === EWorkerPhase.Edges) {
      console.log('made all the edges');
      const edgeMap = new Map(movedEdges);
      newEdges.forEach((le, e) => edgeMap.set(e, le));
      this.callback({
        type: ECoordinatorPhase.Done,
        layoutId: layout.id,
        graph: adjGraph,
        edges: edgeMap,
        nomogram,
        vertices: movedVertices,
      });
    }
  }
}
