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

import type { Edge, LayoutVertex, SizeVertex, VertexKey } from '../../types/layout';

const GRAPH_HEADER = `digraph G {
  graph[sep=0.5, splines=true, overlap=false, rankdir=LR, ranksep=5, nodesep=1.5];
  node [shape=box, fixedsize=true, label="", color="_", fillcolor="_"];
  edge [arrowhead=none, arrowtail=none];`;

const GRAPH_FOOTER = `}`;

function makeNode(v: SizeVertex | LayoutVertex) {
  const { vertex, height, width } = v;
  let pos = '';
  if (v.left != null && v.top != null) {
    const { left, top } = ((v: any): LayoutVertex);
    pos = `,pos="${left.toFixed(5)},${top.toFixed(5)}!"`;
  }
  return `"${vertex.key}" [height=${height.toFixed(5)},width=${width.toFixed(5)}${pos}];`;
}

function makeEdge(head: VertexKey, tails: VertexKey | VertexKey[], isBidirectional: boolean = false) {
  const bidir = isBidirectional ? ' [style="bidir",dir=both]' : '';
  if (!Array.isArray(tails)) {
    return `"${head}"->"${tails}"${bidir};`;
  }
  const tailStrs = tails.map(tail => `"${tail}"`);
  return `"${head}"->{ ${tailStrs.join(' ')} };`;
}

export default function toDot(edges: Edge[], vertices: (SizeVertex | LayoutVertex)[]) {
  const bidirectional: Edge[] = [];
  const fromTo: Map<VertexKey, VertexKey[]> = new Map();
  edges.forEach(edge => {
    if (edge.isBidirectional) {
      bidirectional.push(edge);
      return;
    }
    const tails = fromTo.get(edge.from) || [];
    tails.push(edge.to);
    fromTo.set(edge.from, tails);
  });
  const nodeStrs = vertices.map(makeNode);
  const bidirStrs = bidirectional.map(edge => makeEdge(edge.from, edge.to, true));
  const edgeStrs: string[] = [];
  fromTo.forEach((tails, from) => {
    edgeStrs.push(makeEdge(from, tails));
  });
  return [
    GRAPH_HEADER,
    '  ',
    nodeStrs.join('\n  '),
    '  ',
    bidirStrs.join('\n  '),
    '  ',
    edgeStrs.join('\n  '),
    GRAPH_FOOTER,
  ].join('\n  ');
}
