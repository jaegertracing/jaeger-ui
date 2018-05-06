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

import type { LayoutUpdate, WorkerMessage } from './types';
import type { Edge, LayoutGraph, LayoutVertex, SizeVertex } from '../types/layout';
import type { ErrorEvent } from '../types/ErrorEvent';

import * as convCoord from './dot/conv-coord';
import workerFactory from './layout.worker';
import { matchEdges, matchVertices } from './match-inputs';

type CurrentLayout = {
  id: number,
  input: {
    edges: Edge[],
    vertices: SizeVertex[],
  },
  cleaned: {
    edges: Edge[],
    vertices: SizeVertex[],
  },
  result: {
    // TODO(joe): split edge calculations
    // edges: LayoutEdge[],
    graph?: LayoutGraph,
    vertices: LayoutVertex[],
  },
  status: {
    edgesWorkers?: ?Set<number>,
    phase: 'not-started' | 'positions' | 'edges' | 'done',
    positionsWorker?: ?number,
  },
};

type LayoutWorker = Worker & { id: number };

function cleanInput(srcEdges: Edge[], srcVertices: SizeVertex[]) {
  // edges: Edge[], vertices: SizeVertex[]
  const edges = srcEdges.map(({ from, to, isBidirectional }) => ({ from, to, isBidirectional }));
  // const edges = srcEdges.map(edge => {
  //   //({ from, to, bidirectional })
  //   const { from, to } = edge;
  //   const rv = { from, to };
  //   if (edge.bidirectional != null) {
  //     rv.bidirectional = edge.bidirectional;
  //   }
  //   return rv;
  // });
  const vertices = srcVertices.map(({ vertex: { key }, ...rest }) => ({ vertex: { key }, ...rest }));
  return { edges, vertices };
}

function killWorker(worker: LayoutWorker) {
  const w = worker;
  // to make flow happy
  const noop = () => {};
  w.onmessage = noop;
  // $FlowFixMe - https://github.com/facebook/flow/issues/6191
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
  currentLayout: ?CurrentLayout;
  nextWorkerId: number;
  isDisposed: boolean;
  idleWorkers: LayoutWorker[];
  busyWorkers: LayoutWorker[];
  callback: LayoutUpdate => void;

  constructor(callback: LayoutUpdate => void) {
    this.callback = callback;
    this.currentLayout = null;
    this.nextWorkerId = 1;
    this.isDisposed = false;
    this.idleWorkers = [this._initWorker()];
    this.busyWorkers = [];
  }

  getLayout(id: number, edges: Edge[], vertices: SizeVertex[]) {
    if (this.isDisposed) {
      console.error('Coordinator is diposed');
      return;
    }
    this.busyWorkers.forEach(killWorker);
    this.busyWorkers.length = 0;
    this.currentLayout = {
      id,
      input: { edges, vertices },
      cleaned: cleanInput(edges, vertices.map(convCoord.vertexToDot)),
      result: { edges: [], vertices: [] },
      status: { phase: 'not-started' },
    };
    this._getPositions();
  }

  dispose() {
    this.idleWorkers.forEach(killWorker);
    this.idleWorkers.length = 0;
    this.busyWorkers.forEach(killWorker);
    this.busyWorkers.length = 0;
    this.currentLayout = null;
    this.isDisposed = true;
  }

  _initWorker() {
    const worker = workerFactory();
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

  _getPositions() {
    const { id, cleaned, status } = this.currentLayout || {};
    if (id == null) {
      throw new Error('_getPositions called without a current layout');
    }
    const worker = this.idleWorkers.pop() || this._initWorker();
    this.busyWorkers.push(worker);
    status.phase = 'positions';
    status.positionsWorker = worker.id;
    worker.postMessage({
      edges: cleaned.edges,
      meta: {
        layoutId: id,
        workerId: worker.id,
        phase: 'positions',
      },
      vertices: cleaned.vertices,
    });
  }

  _getEdges() {
    const { id, cleaned, result, status } = this.currentLayout || {};
    if (id == null) {
      throw new Error('_getEdges called without a current layout');
    }
    if (!result.vertices) {
      throw new Error('_getEdges called without known positions');
    }
    const worker = this.idleWorkers.pop() || this._initWorker();
    this.busyWorkers.push(worker);
    status.phase = 'edges';
    // TODO(joe): split edge calculation
    status.edgesWorkers = new Set([worker.id]);
    worker.postMessage({
      edges: cleaned.edges,
      meta: {
        layoutId: id,
        workerId: worker.id,
        phase: 'edges',
      },
      vertices: result.vertices,
    });
  }

  _handleVizWorkerError = (event: ErrorEvent) => {
    const target = (event: any).target;
    const worker = (target: LayoutWorker);
    let list;
    let i = this.busyWorkers.indexOf(worker);
    if (i >= 0) {
      list = this.busyWorkers;
    } else {
      i = this.idleWorkers.indexOf(worker);
      if (i >= 0) {
        list = this.idleWorkers;
      }
    }
    if (!list) {
      console.error('Viz worker onerror from unknown viz worker');
      console.error(event);
      return;
    }
    list.splice(i, 1);
    killWorker(worker);
    console.error('Viz worker onerror');
    console.error(event);
  };

  _handleVizWorkerMessageError = (event: MessageEvent) => {
    // TODO(joe): something more useful
    const msg = {
      event,
      currentLayout: this.currentLayout,
      errorType: '_handleVizWorkerMessageError',
    };
    console.error(msg);
  };

  _handleVizWorkerMessage = (event: MessageEvent) => {
    const worker: LayoutWorker = ((event.target: any): LayoutWorker);
    const workerMessage = ((event.data: any): WorkerMessage);
    const { type, meta } = workerMessage;
    this._makeWorkerIdle(worker);
    const isStale = !this.currentLayout || meta.layoutId !== this.currentLayout.id;
    if (type === 'error') {
      console.error(`${isStale ? '(stale) ' : ' '}Error from viz.worker`, event);
      return;
    }
    if (isStale) {
      return;
    }
    if (type === 'layout-error') {
      // TODO(joe): implement retries with more spacing
      console.error('layout-error', event);
      return;
    }
    if (type === 'positions') {
      this._processPositionsResult(workerMessage);
      return;
    }
    if (type === 'edges') {
      this._processEdgesResult(workerMessage);
      return;
    }
    console.error(`Unknown worker message type: ${type}`, event);
  };

  _processPositionsResult(workerMessage: WorkerMessage) {
    const layout = this.currentLayout;
    if (!layout) {
      // make flow happy - this is already checked and should not happen
      return;
    }
    const { graph, meta, vertices } = workerMessage;
    const { workerId } = meta;
    const { input, result, status } = layout;
    const { phase, positionsWorker } = status;
    let msg = '';
    if (phase !== 'positions') {
      msg = 'but not in phase positions';
    }
    if (!msg && positionsWorker == null) {
      msg = 'but have no worker in status';
    }
    if (!msg && positionsWorker !== workerId) {
      msg = 'but got message from the wrong worker';
    }
    if (msg) {
      console.error(`Have positions results, ${msg}`);
      return;
    }
    if (!graph || !vertices) {
      console.error('Have positions results, but recieved invalid result data');
      return;
    }
    status.positionsWorker = null;
    result.graph = graph;
    result.vertices = vertices;
    const adjVertexCoords = convCoord.vertexToPixels.bind(null, graph);
    let adjVertices = vertices.map(adjVertexCoords);
    adjVertices = matchVertices(input.vertices, adjVertices);
    this.callback({
      type: 'positions',
      layoutId: layout.id,
      graph: convCoord.graphToPixels(graph),
      vertices: adjVertices,
    });
    this._getEdges();
  }

  _processEdgesResult(workerMessage: WorkerMessage) {
    const layout = this.currentLayout;
    if (!layout) {
      // make flow happy - this is already checked and should not happen
      return;
    }
    const { edges, graph, meta, vertices } = workerMessage;
    const { workerId } = meta;
    const { input, status } = layout;
    const { phase, edgesWorkers } = status;
    let msg = '';
    if (phase !== 'edges') {
      msg = 'but not in phase edges';
    }
    if (!msg && edgesWorkers == null) {
      msg = 'but have no worker(s) in status';
    }
    if (!msg && edgesWorkers && !edgesWorkers.has(workerId)) {
      msg = 'but got message from the wrong worker';
    }
    if (msg) {
      console.error(`Have edges results, ${msg}`);
      return;
    }
    if (!edges || !graph || !vertices) {
      console.error('Have edges results, but recieved invalid result data');
      return;
    }
    status.edgesWorkers = null;
    status.phase = 'done';
    this.currentLayout = null;
    const adjEdgeCoords = convCoord.edgeToPixels.bind(null, graph);
    const adjVertexCoords = convCoord.vertexToPixels.bind(null, graph);
    let adjEdges = edges.map(adjEdgeCoords);
    adjEdges = matchEdges(input.edges, adjEdges);
    let adjVertices = vertices.map(adjVertexCoords);
    adjVertices = matchVertices(input.vertices, adjVertices);
    this.callback({
      type: 'edges',
      layoutId: layout.id,
      graph: convCoord.graphToPixels(graph),
      edges: adjEdges,
      vertices: adjVertices,
    });
  }
}
