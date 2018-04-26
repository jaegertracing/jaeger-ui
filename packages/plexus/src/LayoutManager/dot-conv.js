// @flow

import type { Edge, Vertex, VertexKey } from '../types/layout';

const GRAPH_HEADER = `digraph G {
  graph[sep=0.5, splines=true, overlap=false, rankdir=LR, ranksep=1.8, nodesep=0.5];
  node [shape=box, fixedsize=true, label="", color="_", fillcolor="_"];
  edge [arrowhead=none, arrowtail=none];`;

const GRAPH_FOOTER = `}`;

const FLAG_MAPPINGS = {
  bidir: 'isBidirectional',
};


function makeEdge(head: VertexKey, tails: VertexKey[], isBidirectional: boolean = false) {
  const bidir = isBidirectional ? ' [style="bidir", dir=both]' : '';
  if (!Array.isArray(tails)) {
    return `"${head}"->"${tails}"${bidir};`;
  }
  const tailStrs = tails.map(tail => `"${tail}"`);
  return `"${head}"->{ ${tailStrs.join(' ')} };`;
}

export function toDot(edges: Edge[], vertices: Vertex[]) {
  console.log(edges);
  const bidirectional: Edge[] = [];
  const fromTo: Map<VertexKey, VertexKey[]> = new Map();
  edges.forEach(edge => {
    console.log(edge.isBidirectional, edge)
    if (edge.isBidirectional) {
      bidirectional.push(edge);
      return;
    }
    const tails = fromTo.get(edge.from) || [];
    tails.push(edge.to);
    fromTo.set(edge.from, tails);
  });
  console.log(bidirectional)
  const nodeStrs = vertices.map(vertex => `"${vertex.key}" [height=${vertex.height.toFixed(9)},width=${vertex.width.toFixed(9)}];`);
  const bidirStrs = bidirectional.map(edge => makeEdge(edge.from, edge.to, true));
  const edgeStrs: string[] = [];
  fromTo.forEach((tails, from) => {
    edgeStrs.push(makeEdge(from, tails));
  })
  // console.log([...fromTo])
  // const edgeStrs = [...fromTo.entries()].map(([from, tails]) => console.log(from, tails) || makeEdge(from, tails));
  return [
    GRAPH_HEADER,
    '  ', nodeStrs.join('\n  '),
    '  ', bidirStrs.join('\n  '),
    '  ', edgeStrs.join('\n  '),
    GRAPH_FOOTER
  ].join('\n  ');
}

// function nextSpace(str, i) {
//   return str.indexOf(' ', i);
// }

function throwMalformedPlain(str: string, i: number) {
  throw new Error(`Malformed plain output: ${str.slice(i - 100, i + 100)}`);
}

function parseString(str: string, startIndex: number) {
  const isQuoted = str[startIndex] === '"';
  const i = startIndex + Number(isQuoted);
  const end = str.indexOf(isQuoted ? '"' : ' ', i);
  return {
    value: str.slice(i, end),
    end: end + Number(isQuoted),
  };
}

function parseNumber(str: string, startIndex: number, boundary?: string = ' ') {
  const end = str.indexOf(boundary, startIndex);
  if (end < startIndex) {
    throwMalformedPlain(str, startIndex);
  }
  return {
    value: Number(str.slice(startIndex, end)),
    end,
  };
}

function parseNumbers(count: number, str: string, startIndex: number, boundary?: string = ' ') {
  const values: number[] = [];
  let ci = startIndex;
  let i = count;
  while (i--) {
    if (str[ci] === ' ') {
      ci++;
    }
    const { value, end } = parseNumber(str, ci, boundary);
    values.push(value);
    ci = end;
  }
  return { values, end: ci };
}

function parseNode(str: string, startIndex: number) {
  // skip "node "
  const i = startIndex + 5;
  const { value: key, end: keyEnd } = parseString(str, i);
  const { values, end } = parseNumbers(4, str, keyEnd + 1);
  const [left, top, width, height] = values;
  return {
    height,
    key,
    left,
    top,
    width,
    end: str.indexOf('\n', end + 1),
  };
}

function parseGraph(str: string, startIndex: number) {
  // skip "graph "
  const i = startIndex + 6;
  const { values: [scale, width], end: widthEnd } = parseNumbers(2, str, i);
  const { value: height, end } = parseNumber(str, widthEnd + 1, '\n');
  return {
    end,
    height,
    scale,
    width,
  };
}

function parseEdge(str: string, startIndex: number) {
  // skip "edge "
  const i = startIndex + 5;
  const { value: from, end: fromEnd } = parseString(str, i);
  const { value: to, end: toEnd } = parseString(str, fromEnd + 1);
  const { value: pointCount, end: endPtCount } = parseNumber(str, toEnd + 1);
  const { values: flatPoints, end: pointsEnd } = parseNumbers(pointCount * 2, str, endPtCount + 1);
  const { value: flags, end: flagsEnd } = parseString(str, pointsEnd + 1);
  const points: [number, number][] = [];
  for (let pi = 0; pi < flatPoints.length; pi += 2) {
    points.push([flatPoints[pi], flatPoints[pi + 1]]);
  }
  const edgeFlags = flags.split(',').reduce((accum, flag) => {
    const name = FLAG_MAPPINGS[flag];
    return name ? { ...accum, [name]: true } : accum;
  }, {});
  return {
    from,
    to,
    ...edgeFlags,
    end: str.indexOf('\n', flagsEnd + 1),
  };
}

export function fromPlain(str: string, parseEdges?: boolean = false) {
  const edges: Edge[] = [];
  const vertices: Vertex[] = [];
  let i = 0;
  if (str[0] !== 'g') {
    throwMalformedPlain(str, i);
  }
  const { end: graphEnd, ...graph } = parseGraph(str, i);
  i = graphEnd + 1;
  // stop when the "stop" line is hit
  while (str[i] !== 's') {
    if (str[i] === 'n') {
      const { end, ...node } = parseNode(str, i);
      vertices.push(node);
      i = end + 1;
      continue;
    }
    if (str[i] === 'e') {
      if (!parseEdges) {
        i = str.indexOf('\n', i) + 1;
        continue;
      }
      const { end, ...edge } = parseEdge(str, i);
      edges.push(edge);
      i = end + 1;
      continue;
    }
    throwMalformedPlain(str, i);
  }
  return { graph, vertices, edges: parseEdges ? edges : null };
}

