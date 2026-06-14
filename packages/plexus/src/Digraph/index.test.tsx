// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { ELayoutPhase } from './types';
import Digraph from './index';

describe('Digraph.getDerivedStateFromProps', () => {
  const vertices = [{ key: 'a' }, { key: 'b' }];
  const edges = [{ from: 'a', to: 'b' }];
  const prevState = {
    edges,
    vertices,
    layoutPhase: ELayoutPhase.Done,
    layoutVersion: 1,
  };

  it('returns null if edges and vertices are unchanged', () => {
    const nextProps = { edges, vertices };
    expect(Digraph.getDerivedStateFromProps(nextProps as any, prevState as any)).toBeNull();
  });

  it('returns reset state with NoData phase if edges are cleared', () => {
    const nextProps = { edges: [], vertices };
    const result = Digraph.getDerivedStateFromProps(nextProps as any, prevState as any);
    expect(result).toMatchObject({
      edges: [],
      layoutPhase: ELayoutPhase.NoData,
      layoutEdges: null,
      layoutVertices: null,
      layoutVersion: 2,
    });
  });

  it('returns reset state with CalcSizes phase if edges change', () => {
    const newEdges = [{ from: 'b', to: 'a' }];
    const nextProps = { edges: newEdges, vertices };
    const result = Digraph.getDerivedStateFromProps(nextProps as any, prevState as any);
    expect(result).toMatchObject({
      edges: newEdges,
      layoutPhase: ELayoutPhase.CalcSizes,
      layoutEdges: null,
      layoutVertices: null,
      layoutVersion: 2,
    });
  });

  it('returns reset state with CalcSizes phase if vertices change', () => {
    const newVertices = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
    const nextProps = { edges, vertices: newVertices };
    const result = Digraph.getDerivedStateFromProps(nextProps as any, prevState as any);
    expect(result).toMatchObject({
      vertices: newVertices,
      layoutPhase: ELayoutPhase.CalcSizes,
      layoutEdges: null,
      layoutVertices: null,
      layoutVersion: 2,
    });
  });
});

describe('Digraph.onLayoutDone', () => {
  it('ignores stale layout results', () => {
    const instance = new Digraph({} as any);
    instance.state = { layoutVersion: 2, layoutPhase: ELayoutPhase.CalcPositions } as any;

    // Simulate a layout result for an older version
    const staleResult = { isCancelled: false, edges: [], vertices: [], graph: {} };
    (instance as any).onLayoutDone(staleResult, 1);

    // State should not change
    expect(instance.state.layoutPhase).toBe(ELayoutPhase.CalcPositions);
  });

  it('processes current layout results', () => {
    const instance = new Digraph({} as any);
    instance.state = { layoutVersion: 2, layoutPhase: ELayoutPhase.CalcPositions } as any;

    let contentSizeCalled = false;
    (instance as any).zoomManager = {
      setContentSize: () => {
        contentSizeCalled = true;
      },
    };

    // We mock setState because it's a React component
    let setStateCalledWith = null;
    instance.setState = newState => {
      setStateCalledWith = newState;
    };

    const currentResult = { isCancelled: false, edges: [], vertices: [], graph: {} };
    (instance as any).onLayoutDone(currentResult, 2);

    expect(setStateCalledWith).toMatchObject({
      layoutPhase: ELayoutPhase.Done,
      layoutEdges: [],
      layoutVertices: [],
      layoutGraph: {},
    });
    expect(contentSizeCalled).toBe(true);
  });
});
