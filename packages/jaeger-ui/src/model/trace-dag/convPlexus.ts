// Copyright (c) 2018-2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { TEdge } from '@jaegertracing/plexus/lib/types';

import { NodeID, TDenseSpanMembers } from './types';
import TDagNode from './types/TDagNode';
import TDagPlexusVertex from './types/TDagPlexusVertex';

export default function convPlexus<T extends { [k: string]: unknown }>(nodesMap: Map<NodeID, TDagNode<T>>) {
  const vertices: TDagPlexusVertex<T>[] = [];
  const edges: TEdge[] = [];
  const nodes = [...nodesMap.values()];

  // Build a mapping from spanID to nodeID for resolving links
  const spanIdToNodeId = new Map<string, NodeID>();
  for (let i = 0; i < nodes.length; i++) {
    const dagNode = nodes[i];
    const nodeData = dagNode as unknown as TDagNode<TDenseSpanMembers>;
    if (nodeData.members) {
      nodeData.members.forEach(member => {
        spanIdToNodeId.set(member.id, dagNode.id);
      });
    }
  }

  // Track existing edges to avoid duplicates
  const edgeSet = new Set<string>();

  for (let i = 0; i < nodes.length; i++) {
    const dagNode = nodes[i];
    vertices.push({
      key: dagNode.id,
      data: dagNode,
    });

    // Add parent-child edge
    if (dagNode.parentID) {
      const edgeKey = `${dagNode.parentID}->${dagNode.id}`;
      if (!edgeSet.has(edgeKey)) {
        edges.push({
          from: dagNode.parentID,
          to: dagNode.id,
        });
        edgeSet.add(edgeKey);
      }
    }

    // Add additional edges from span links (non-parent references)
    const nodeData = dagNode as unknown as TDagNode<TDenseSpanMembers>;
    if (nodeData.members) {
      nodeData.members.forEach(member => {
        if (member.links && member.links.length > 0) {
          member.links.forEach(link => {
            // Only consider links within the same trace
            if (link.traceID === member.span.traceID) {
              const linkedNodeId = spanIdToNodeId.get(link.spanID);
              if (linkedNodeId && linkedNodeId !== dagNode.id) {
                // Edge goes from the linked (referenced) node to the current node
                const edgeKey = `${linkedNodeId}->${dagNode.id}`;
                if (!edgeSet.has(edgeKey)) {
                  edges.push({
                    from: linkedNodeId,
                    to: dagNode.id,
                  });
                  edgeSet.add(edgeKey);
                }
              }
            }
          });
        }
      });
    }
  }
  return { edges, vertices };
}
