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

import cytoscape from 'cytoscape';
import type { Trace, Span } from '../types';

/**
 * Sorts spans by startTime
 */
export function sortSpansByStartTime(spans: Array<Span>): Array<Span> {
  return spans.sort((a, b) => a.startTime - b.startTime);
}

export default function transformTrace(
  trace: Trace
): {
  startTime: number,
  duration: number,
  spans: any,
  depth: number,
} {
  const cy = cytoscape({ headless: true });

  const spans = sortSpansByStartTime(trace.spans);

  // Create tree
  const nodes = [];
  const edges = [];
  spans.forEach(span => {
    nodes.push({
      group: 'nodes',
      data: { id: span.spanID, data: span },
    });
    if (span.references) {
      span.references.forEach(ref => {
        if (ref.spanID === span.spanID) {
          return;
        }
        edges.push({
          group: 'edges',
          data: {
            id: `${ref.spanID}=>${span.spanID}`,
            source: ref.spanID,
            target: span.spanID,
          },
        });
      });
    }
  });
  cy.add([...nodes, ...edges]);

  // Find all root nodes (really there should only be 1)
  const rootNodes = [];
  cy.nodes().roots().forEach(root => {
    rootNodes.push(root);
  });
  const rootNode = rootNodes[0];
  const rootSpan = rootNode.data().data;

  // Add depth and order trace
  const sortedSpans = [];
  let depth = 0;
  cy.elements().dfs({
    root: rootNode,
    visit(i, currentDepth, currentNode) {
      if (currentDepth > depth) {
        depth = currentDepth;
      }
      sortedSpans.push({
        depth: currentDepth,
        ...currentNode.data().data,
      });
    },
  });

  return {
    startTime: rootSpan.startTime,
    duration: rootSpan.duration,
    spans: sortedSpans,
    depth,
  };
}
