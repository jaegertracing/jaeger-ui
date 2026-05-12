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
    });
  });
});
