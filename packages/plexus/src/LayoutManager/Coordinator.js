// @flow

import type { VizWorkMeta, WorkerMessage } from './types';
import type { Edge, LayoutOptions, Vertex } from '../types/layout';
// import type { ErrorEvent } from '../types/ErrorEvent';

import workerFactory from './layout.worker';

// TODO(joe): consider killing workers when they error

const DEFAULT_OPTIONS = Object.freeze({
  useDotEdges: false,
  maxWorkers: 5,
  workerEdgeThreshold: 200,
});

// type LayoutMessage = {
//   type: 'layout' | 'dispose',
//   layout?: {
//     edges: InputEdge[],
//     id: number,
//     vertices: InputVertex[],
//     options: LayoutOptions,
//   },
// };

type CurrentLayout = {
  id: number,
  input: {
    edges: Edge[],
    vertices: Vertex[],
  },
  result: {
    edges: Edge[],
    vertices: Vertex[],
  },
  status: {
    edgesWorkers?: ?Set<number>,
    phase: 'not-started' | 'positions' | 'edges',
    positionsWorker?: ?number,
  },
};

type WorkerRef = {
  workerId: number,
  worker: Worker,
};

// to make flow happy
const noop = () => {};

function killWorker(workerRef: WorkerRef) {
  const { worker } = workerRef;
  worker.onmessage = noop;
  // $FlowFixMe - https://github.com/facebook/flow/issues/6191
  worker.onmessageerror = noop;
  worker.onerror = noop;
  worker.terminate();
}

function findWorker(lists: WorkerRef[][], workerId: number) {
  for (let i = 0; i < lists.length; i++) {
    const list = lists[i];
    for (let index = 0; index < list.length; index++) {
      if (list[index].workerId === workerId) {
        return { index, list, ref: list[index] };
      }
    }
  }
  return null;
}

export default class Coordinator {
  currentLayout: ?CurrentLayout;
  nextWorkerId: number;
  isDisposed: boolean;
  options: LayoutOptions;
  idleWorkers: WorkerRef[];
  busyWorkers: WorkerRef[];
  callback: any => void;

  constructor(callback: any => void) {
    this.callback = callback;
    this.currentLayout = null;
    this.nextWorkerId = 1;
    this.isDisposed = false;
    this.options = DEFAULT_OPTIONS;
    this.idleWorkers = [this.initWorker()];
    this.busyWorkers = [];
  }

  // onLocalError(event: ErrorEvent) {
  //   const { colno, error, filename, lineno, message: eventMessage } = event.data;
  //   const { code, message, name, stack } = error || {};
  //   this.callback({
  //     colno,
  //     filename,
  //     lineno,
  //     message: eventMessage,
  //     layoutId: this.currentLayout && this.currentLayout.id,
  //     type: 'error',
  //     error: error && { code, message, name, stack },
  //   });
  // }

  // onLocalMessageError(event: MessageEvent) {
  //   // TODO(joe): something more useful
  //   console.error(this.currentLayout);
  //   console.error(event);
  // }

  getLayout = (id: number, edges: Edge[], vertices: Vertex[], options?: LayoutOptions = null) => {
    if (this.isDisposed) {
      console.error('Coordinator is diposed');
      return;
    }
    this.busyWorkers.forEach(killWorker);
    this.busyWorkers.length = 0;
    if (options) {
      this.options = { ...this.options, ...options };
    }
    this.currentLayout = {
      id,
      input: { edges, vertices },
      result: { edges: [], vertices: [] },
      // status: { phase: 'positions', positionsWorker: workerRef.workerId },
      status: { phase: 'not-started' },
    };
    this.getPositions();
  };

  getPositions() {
    const { id, input, result, status } = this.currentLayout || {};
    if (id == null) {
      throw new Error('getPositions called without a current layout');
    }
    const workerRef = this.idleWorkers.pop() || this.initWorker();
    this.busyWorkers.push(workerRef);
    status.phase = 'positions';
    // TODO(joe): split edge calculation
    status.positionsWorker = workerRef.workerId;
    workerRef.worker.postMessage({
      edges: input.edges,
      meta: {
        layoutId: id,
        workerId: workerRef.workerId,
        phase: 'positions',
      },
      vertices: input.vertices,
    });
  }

  getEdges() {
    console.log('get edges')
    const { id, input, result, status } = this.currentLayout || {};
    console.warn(this.currentLayout)
    if (id == null) {
      throw new Error('getEdges called without a current layout');
    }
    if (!result.vertices) {
      throw new Error('getEdges called without known positions');
    }
    const workerRef = this.idleWorkers.pop() || this.initWorker();
    this.busyWorkers.push(workerRef);
    status.phase = 'edges';
    // TODO(joe): split edge calculation
    status.edgesWorkers = new Set([workerRef.workerId]);
    workerRef.worker.postMessage({
      edges: input.edges,
      meta: {
        layoutId: id,
        workerId: workerRef.workerId,
        phase: 'edges',
      },
      vertices: result.vertices,
    });
  }

  // onVizWorkerError = (event: ErrorEvent) => {
  //   const { list, index } = findWorker([this.busyWorkers, this.idleWorkers], vizWorkerId) || {};
  //   if (list) {
  //     const ref = list.splice(index, 1)[0];
  //     killWorker(ref);
  //   } else {
  //     console.error(`Viz worker onerror from unknown viz worker: ${vizWorkerId}`);
  //   }
  //   const { colno, error, filename, lineno, message: eventMessage } = event.data;
  //   const { code, message, name, stack } = error || {};
  //   this.postMessage({
  //     colno,
  //     filename,
  //     lineno,
  //     vizWorkerId,
  //     message: eventMessage,
  //     layoutId: this.currentLayout && this.currentLayout.id,
  //     type: 'error',
  //     error: error && { code, message, name, stack },
  //   });
  // };

  // onVizWorkerMessageError = (event: MessageEvent) => {
  //   // TODO(joe): something more useful
  //   const msg = {
  //     event,
  //     currentLayout: this.currentLayout,
  //     errorType: 'onVizWorkerMessageError',
  //   };
  //   console.error(msg);
  // };

  onVizWorkerMessage = (event: MessageEvent) => {
    console.error('on message', event, this.currentLayout);
    const workerMessage = ((event.data: any): WorkerMessage);
    const { type, meta } = workerMessage;
    this.makeWorkerIdle(meta.workerId);
    const isStale = !this.currentLayout || meta.layoutId !== this.currentLayout.id
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
    if (type === 'positions-result') {
      const { vertices } = workerMessage;
      if (!vertices) {
        console.error('Malformed worker message', event);
        return;
      }
      this.processPositionsResult(meta, vertices);
      return;
    }
    if (type === 'edges-result') {
      const { edges } = workerMessage;
      if (!edges) {
        console.error('Malformed worker message', event);
        return;
      }
      this.processEdgesResult(meta, edges);
      return;
    }
    console.error(`Unknown worker message type: ${type}`, event);
  };

  processPositionsResult(meta: VizWorkMeta, vertices: Vertex[]) {
    const layout = this.currentLayout;
    if (!layout) {
      // make flow happy - this is already checked and should not happen
      return;
    }
    const { workerId } = meta;
    const { result, status } = layout;
    const { phase, positionsWorker } = status;
    // eslint-disable-next-line default-case
    switch (true) {
      case phase !== 'positions':
        console.error('Getting positions results when not expected');
        return;
      case positionsWorker == null:
        console.error('Bad state - in phase positions but have no worker in status');
        return;
      case positionsWorker !== workerId:
        console.error('Bad state - have positionns results for the right layout ID but from the wrong worker');
        return;
    }
    // const { list, index, workerRef } = findWorker([this.busyWorkers, this.idleWorkers], meta.workerId) || {};
    // if (!list) {
    //   console.error('Unknown worker: ', meta.workerId);
    //   return;
    // }
    // list.splice(index, 1);
    status.positionsWorker = null;
    result.vertices = vertices;
    // TODO(joe): push psitions to LayoutManager
    this.getEdges();
    // // const workerRef = this.busyWorkers.find(ref => ref.workerId === meta.workerId);
    // if (!workerRef) {
    //   console.error('Unknown worker: ', meta.workerId);
    //   return;
    // }
    // this.
    // console.log('positions done', vertices);
  }

  processEdgesResult(meta: VizWorkMeta, result: any) {
    console.log('edges result:', result);
    // if (!result) {
    //   console.error('Malformed positions result');
    //   return;
    // }
    // const layout = this.currentLayout;
    // if (!layout) {
    //   // make flow happy - this is already checked and should not happen
    //   return;
    // }
    // const { workerId } = meta;
    // const { phase, edgesWorkers } = layout.status;
    // if (phase !== 'edges') {
    //   console.error('Getting edges results when not expected');
    //   return;
    // }
    // if (edgesWorkers == null) {
    //   console.error('Bad state - in phase edges but have no workers in status');
    //   return;
    // }
    // if (!edgesWorkers.has(workerId)) {
    //   console.error('Bad state - have edge results for the right layout ID but from the wrong worker');
    //   return;
    // }
    // // process result string
    // console.log(result);
  }

  initWorker() {
    const worker = workerFactory();
    const workerId = this.nextWorkerId;
    this.nextWorkerId++;
    // worker.onerror = this.onVizWorkerError;
    // // worker.onmessageerror = this.onVizWorkerMessageError;
    // worker.onmessageerror = console.log;
    worker.onmessage = this.onVizWorkerMessage;
    return { worker, workerId };
  }

  makeWorkerIdle(workerId: number) {
    const { list, index, ref } = findWorker([this.busyWorkers], workerId) || {};
    if (!list) {
      console.error('Worker is not busy: ', workerId);
      return;
    }
    this.idleWorkers.push(ref);
  }

  dispose() {
    this.idleWorkers.forEach(killWorker);
    this.idleWorkers.length = 0;
    this.busyWorkers.forEach(killWorker);
    this.busyWorkers.length = 0;
    this.currentLayout = null;
    this.isDisposed = true;
  }

  // getLayout()
}
