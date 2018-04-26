// @flow

// import type { ErrorMessage, InputEdge, InputVertex, Layout, LayoutOptions, LayoutResult, OutputEdge, OutputVertex, Positions } from '../types/layout';
import type { Edge, Vertex, Layout, LayoutOptions, LayoutResult, Positions } from '../types/layout';

// import coordinatorWorker from './coordinator.worker';
import Coordinator from './Coordinator';

type PendingResult = {
  id: number,
  isPositionsResolved: boolean,
  resolvePositions?: Positions => void,
  resolveLayout?: Layout => void,
};

export default class LayoutManager {
  layoutId: number;
  isDisposed: boolean;
  options: ?LayoutOptions;
  coordinator: Coordinator;
  pendingResult: ?PendingResult;

  constructor(options?: LayoutOptions) {
    this.layoutId = 0;
    this.options = options;
    // this.coordinator = new CoordinatorWorker();
    // this.coordinator = coordinatorWorker();
    this.coordinator = new Coordinator(console.log, () => { });
    // this.coordinator.onmessage = this._onMessage;
    // this.coordinator.onerror = this._onError;
    this.isDisposed = false;
    this.pendingResult = null;
  }

  _onError = (event: MessageEvent) => {
    console.error(event);
  };

  _onMessage = (event: MessageEvent) => {
    // const { type, ...data } = event.data;
    // if (type === 'error') {
    //   console.error(data);
    //   return;
    // }
    // if (type === 'result') {
    //   const { id } = data;
    //   const { resolveLayout } = this.pendingResult || {};
    //   if (id === this.layoutId && resolveLayout) {
    //     const { edges, vertices } = data;
    //     console.log('result', data);
    //     resolveLayout({ isCancelled: false, edges, vertices });
    //     this.pendingResult = null;
    //   }
    //   return;
    // }
  };

  getLayout(
    vertices: Vertex[],
    edges: Edge[],
    options?: LayoutOptions
  ): LayoutResult {
    if (this.isDisposed) {
      throw new Error('LayoutManager has been disposed');
    }

    if (this.pendingResult) {
      const pending = this.pendingResult;
      if (!pending.isPositionsResolved && pending.resolvePositions) {
        pending.resolvePositions({ isCancelled: true });
        pending.isPositionsResolved = true;
      }
      if (pending.resolveLayout) {
        pending.resolveLayout({ isCancelled: true });
      }
      this.pendingResult = null;
    }
    this.layoutId++;
    const id = this.layoutId;
    this.options = options || this.options;
    // this.coordinator.postMessage({
    //   layout: {
    //     edges,
    //     id,
    //     vertices,
    //     options: this.options,
    //   },
    //   type: 'layout',
    // });
    this.coordinator.getLayout(id, edges, vertices, this.options);
    this.pendingResult = { id, isPositionsResolved: false };
    const positions: Promise<Positions> = new Promise(resolve => {
      if (this.pendingResult && id === this.pendingResult.id) {
        this.pendingResult.resolvePositions = resolve;
      }
    });
    const layout: Promise<Layout> = new Promise(resolve => {
      if (this.pendingResult && id === this.pendingResult.id) {
        this.pendingResult.resolveLayout = resolve;
      }
    });
    return { layout, positions };
  }

  dispose() {
    // TODO(joe): finish implementing
    this.isDisposed = true;
  }
}
