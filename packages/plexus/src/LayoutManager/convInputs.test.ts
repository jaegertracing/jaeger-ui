// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import convInputs from './convInputs';
import getLayout from './getLayout';
import { EWorkerPhase } from './types';

describe('convInputs', () => {
  const vertices = [
    { vertex: { key: 'service "A"', name: 'frontend' }, width: 2, height: 1 },
    { vertex: { key: '__proto__', name: 'backend' }, width: 1, height: 1 },
  ];
  const edges = [
    { from: vertices[0].vertex.key, to: vertices[1].vertex.key, calls: 42, isBidirectional: true },
  ];

  it('round-trips application data through a real Graphviz layout', async () => {
    const inputs = convInputs(edges, vertices);
    const layout = await getLayout(EWorkerPhase.DotOnly, inputs.edges, inputs.vertices, null);

    expect(layout.layoutError).toBeUndefined();
    expect(layout.vertices).toHaveLength(2);
    const restoredVertices = inputs.unmapVertices(layout.vertices);
    for (const original of vertices) {
      const restored = restoredVertices.find(v => v.vertex.key === original.vertex.key);
      expect(restored?.vertex).toBe(original.vertex);
      expect(restored?.width).toBeCloseTo(original.width, 2);
      expect(restored?.height).toBeCloseTo(original.height, 2);
    }

    expect(layout.edges).toHaveLength(1);
    const restoredEdges = inputs.unmapEdges(layout.edges ?? []);
    expect(restoredEdges[0].edge).toBe(edges[0]);
    expect(restoredEdges[0].pathPoints.length).toBeGreaterThan(0);
    expect(edges[0].calls).toBe(42);
    expect(vertices[0].vertex.key).toBe('service "A"');
  });

  it('restores vertices in output order and keeps their layout coordinates', () => {
    const inputs = convInputs([], vertices);
    const output = [
      { ...inputs.vertices[1], left: 5, top: 6 },
      { ...inputs.vertices[0], left: 7, top: 8 },
    ];
    const restored = inputs.unmapVertices(output);

    expect(restored.map(v => v.vertex)).toEqual([vertices[1].vertex, vertices[0].vertex]);
    expect(restored[0]).toMatchObject({ left: 5, top: 6, width: 1, height: 1 });
    expect(restored[1]).toMatchObject({ left: 7, top: 8, width: 2, height: 1 });
  });

  it('keeps opposite-direction edges distinct when restoring metadata', () => {
    const reverse = { from: edges[0].to, to: edges[0].from, calls: 3 };
    const inputs = convInputs([edges[0], reverse], vertices);
    const restored = inputs.unmapEdges([
      { edge: inputs.edges[1], pathPoints: [[1, 2]] },
      { edge: inputs.edges[0], pathPoints: [[3, 4]] },
    ]);

    expect(restored[0].edge).toBe(reverse);
    expect(restored[1].edge).toBe(edges[0]);
    expect(restored.map(e => e.pathPoints)).toEqual([[[1, 2]], [[3, 4]]]);
  });

  it('accepts an empty graph', () => {
    const inputs = convInputs([], []);
    expect(inputs.vertices).toEqual([]);
    expect(inputs.edges).toEqual([]);
    expect(inputs.unmapVertices([])).toEqual([]);
    expect(inputs.unmapEdges([])).toEqual([]);
  });

  it('rejects duplicate vertex keys', () => {
    expect(() => convInputs([], [vertices[0], vertices[0]])).toThrow('Non-unique vertex key');
  });

  it.each([
    { from: 'missing', to: vertices[0].vertex.key },
    { from: vertices[0].vertex.key, to: 'missing' },
  ])('rejects edges with unknown endpoints: %j', edge => {
    expect(() => convInputs([edge], vertices)).toThrow('Unrecognized key on edge');
  });

  it('rejects an unknown vertex returned by the layout', () => {
    const inputs = convInputs([], vertices);
    expect(() =>
      inputs.unmapVertices([{ vertex: { key: 'missing' }, width: 1, height: 1, left: 0, top: 0 }])
    ).toThrow('Unable to find Vertex');
  });

  it('rejects an unknown edge returned by the layout', () => {
    const inputs = convInputs([], vertices);
    expect(() => inputs.unmapEdges([{ edge: { from: '0', to: '1' }, pathPoints: [] }])).toThrow(
      'Unable to find edge'
    );
  });
});
