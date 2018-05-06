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

import type { EdgesUpdate, LayoutUpdate } from './types';
import type {
  Edge,
  ILayoutManager,
  Layout,
  PendingLayoutResult,
  Positions,
  SizeVertex,
} from '../types/layout';

import Coordinator from './Coordinator';

type PendingResult = {
  id: number,
  isPositionsResolved: boolean,
  resolvePositions?: Positions => void,
  resolveLayout?: Layout => void,
};

export default class LayoutManager implements ILayoutManager {
  layoutId: number;
  isDisposed: boolean;
  coordinator: Coordinator;
  pendingResult: ?PendingResult;

  constructor() {
    this.layoutId = 0;
    this.coordinator = new Coordinator(this._handleUpdate);
    this.isDisposed = false;
    this.pendingResult = null;
  }

  getLayout(edges: Edge[], vertices: SizeVertex[]): PendingLayoutResult {
    if (this.isDisposed) {
      throw new Error('LayoutManager has been disposed');
    }
    this._cancelPending();
    this.layoutId++;
    const id = this.layoutId;
    this.coordinator.getLayout(id, edges, vertices);
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
    if (this.isDisposed) {
      return;
    }
    this._cancelPending();
    this.coordinator.dispose();
    this.isDisposed = true;
  }

  _cancelPending() {
    if (this.isDisposed) {
      return;
    }
    const pending = this.pendingResult;
    if (pending) {
      if (!pending.isPositionsResolved && pending.resolvePositions) {
        pending.resolvePositions({ isCancelled: true });
        pending.isPositionsResolved = true;
      }
      if (pending.resolveLayout) {
        pending.resolveLayout({ isCancelled: true });
      }
      this.pendingResult = null;
    }
  }

  _handleUpdate = (data: LayoutUpdate) => {
    if (this.isDisposed) {
      return;
    }
    const { layoutId, type } = data;
    const pendingResult = this.pendingResult;
    if (!pendingResult || layoutId !== pendingResult.id) {
      return;
    }
    if (type === 'positions') {
      const { isPositionsResolved, resolvePositions } = pendingResult;
      if (isPositionsResolved) {
        console.warn('Duplicate positiosn update', data);
        return;
      }
      const { graph, vertices } = data;
      if (!vertices || !resolvePositions) {
        // make flow happy
        throw new Error('Invalid state');
      }
      pendingResult.isPositionsResolved = true;
      resolvePositions({
        graph,
        vertices,
        isCancelled: false,
      });
      return;
    }
    if (type === 'edges') {
      const { resolveLayout } = pendingResult;
      const { edges, graph, vertices } = ((data: any): EdgesUpdate);
      if (!edges || !vertices || !resolveLayout) {
        // make flow happy
        throw new Error('Invalid state');
      }
      this.pendingResult = null;
      resolveLayout({
        edges,
        graph,
        vertices,
        isCancelled: false,
      });
      return;
    }
    throw new Error('Unrecognized update type');
  };
}
