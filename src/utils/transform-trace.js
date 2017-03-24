// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

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
