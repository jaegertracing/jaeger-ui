// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import convPlexus from './convPlexus';
import TraceDag from './TraceDag';

describe('convPlexus', () => {
  it('generates parent-child edges', () => {
    const dag = new TraceDag();
    dag.addNode('root', null, { operation: 'op1', service: 'svc1', members: [] });
    dag.addNode('child1', 'root', { operation: 'op2', service: 'svc1', members: [] });
    dag.addNode('child2', 'root', { operation: 'op3', service: 'svc2', members: [] });

    const { edges, vertices } = convPlexus(dag.nodesMap);
    expect(vertices).toHaveLength(3);
    expect(edges).toHaveLength(2);
    expect(edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'root', to: 'child1' }),
        expect.objectContaining({ from: 'root', to: 'child2' }),
      ])
    );
  });

  it('generates additional edges from span links', () => {
    const dag = new TraceDag();
    const traceID = 'trace-abc';

    const mockSpanA = { traceID, spanID: 'spanA', links: [] };
    const mockSpanB = { traceID, spanID: 'spanB', links: [] };
    const mockSpanC = {
      traceID,
      spanID: 'spanC',
      links: [{ traceID, spanID: 'spanA', attributes: [] }],
    };

    dag.addNode('nodeA', null, {
      operation: 'opA',
      service: 'svc1',
      members: [{ id: 'spanA', span: mockSpanA, links: [] }],
    });
    dag.addNode('nodeB', 'nodeA', {
      operation: 'opB',
      service: 'svc1',
      members: [{ id: 'spanB', span: mockSpanB, links: [] }],
    });
    dag.addNode('nodeC', 'nodeB', {
      operation: 'opC',
      service: 'svc2',
      members: [{ id: 'spanC', span: mockSpanC, links: [{ traceID, spanID: 'spanA', attributes: [] }] }],
    });

    const { edges, vertices } = convPlexus(dag.nodesMap);
    expect(vertices).toHaveLength(3);
    // parent-child: nodeA->nodeB, nodeB->nodeC
    // additional:  nodeA->nodeC (from link)
    expect(edges).toHaveLength(3);
    expect(edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 'nodeA', to: 'nodeB' }),
        expect.objectContaining({ from: 'nodeB', to: 'nodeC' }),
        expect.objectContaining({ from: 'nodeA', to: 'nodeC' }),
      ])
    );
  });

  it('does not create duplicate edges', () => {
    const dag = new TraceDag();
    const traceID = 'trace-abc';

    const mockSpanA = { traceID, spanID: 'spanA', links: [] };
    // spanB has a link to spanA, but nodeA is already NodeB's parent
    const mockSpanB = {
      traceID,
      spanID: 'spanB',
      links: [{ traceID, spanID: 'spanA', attributes: [] }],
    };

    dag.addNode('nodeA', null, {
      operation: 'opA',
      service: 'svc1',
      members: [{ id: 'spanA', span: mockSpanA, links: [] }],
    });
    dag.addNode('nodeB', 'nodeA', {
      operation: 'opB',
      service: 'svc1',
      members: [{ id: 'spanB', span: mockSpanB, links: [{ traceID, spanID: 'spanA', attributes: [] }] }],
    });

    const { edges } = convPlexus(dag.nodesMap);
    // Only one edge: nodeA->nodeB (link is same as parent-child, no duplicate)
    expect(edges).toHaveLength(1);
    expect(edges[0]).toEqual(expect.objectContaining({ from: 'nodeA', to: 'nodeB' }));
  });

  it('ignores links to spans in different traces', () => {
    const dag = new TraceDag();

    const mockSpanA = { traceID: 'trace-1', spanID: 'spanA', links: [] };
    const mockSpanB = {
      traceID: 'trace-1',
      spanID: 'spanB',
      links: [{ traceID: 'trace-OTHER', spanID: 'spanX', attributes: [] }],
    };

    dag.addNode('nodeA', null, {
      operation: 'opA',
      service: 'svc1',
      members: [{ id: 'spanA', span: mockSpanA, links: [] }],
    });
    dag.addNode('nodeB', 'nodeA', {
      operation: 'opB',
      service: 'svc1',
      members: [
        {
          id: 'spanB',
          span: mockSpanB,
          links: [{ traceID: 'trace-OTHER', spanID: 'spanX', attributes: [] }],
        },
      ],
    });

    const { edges } = convPlexus(dag.nodesMap);
    // Only parent-child edge: nodeA->nodeB (cross-trace link is ignored)
    expect(edges).toHaveLength(1);
  });

  it('handles nodes with no members gracefully', () => {
    const dag = new TraceDag();
    dag.addNode('root', null, { operation: 'op1', service: 'svc1' });
    dag.addNode('child', 'root', { operation: 'op2', service: 'svc2' });

    const { edges, vertices } = convPlexus(dag.nodesMap);
    expect(vertices).toHaveLength(2);
    expect(edges).toHaveLength(1);
  });

  it('ignores self-referencing links', () => {
    const dag = new TraceDag();
    const traceID = 'trace-abc';

    // spanA links to itself — should not create an edge to own node
    const mockSpanA = {
      traceID,
      spanID: 'spanA',
      links: [{ traceID, spanID: 'spanA', attributes: [] }],
    };

    dag.addNode('nodeA', null, {
      operation: 'opA',
      service: 'svc1',
      members: [{ id: 'spanA', span: mockSpanA, links: [{ traceID, spanID: 'spanA', attributes: [] }] }],
    });

    const { edges } = convPlexus(dag.nodesMap);
    // No edges — root has no parent, and self-link is ignored
    expect(edges).toHaveLength(0);
  });

  it('ignores links to unknown spans not in the DAG', () => {
    const dag = new TraceDag();
    const traceID = 'trace-abc';

    const mockSpanA = {
      traceID,
      spanID: 'spanA',
      links: [{ traceID, spanID: 'spanNONEXISTENT', attributes: [] }],
    };

    dag.addNode('nodeA', null, {
      operation: 'opA',
      service: 'svc1',
      members: [
        { id: 'spanA', span: mockSpanA, links: [{ traceID, spanID: 'spanNONEXISTENT', attributes: [] }] },
      ],
    });

    const { edges } = convPlexus(dag.nodesMap);
    expect(edges).toHaveLength(0);
  });
});
