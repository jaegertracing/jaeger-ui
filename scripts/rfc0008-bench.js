// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// Layout benchmark harness behind the timing table in
// docs/rfc/0008-graph-visualization-stack.md (Decision 1).
//
// One measurement per invocation:
//   node scripts/rfc0008-bench.js <topology> <n> <engine> [seed]
//     topology: dense | layered | realistic
//     engine:   dot | dagre
//     seed:     integer, default 42 (the RFC table uses 42, plus 7 and 99
//               for the multi-seed rows)
// Prints one JSON line with per-run wall-clock layout times and the median.
//
// Env vars:
//   RUNS=<k>  timed runs per invocation (default 3; the RFC's n=1200 rows
//             and extra-seed rows use RUNS=1)
//   STATS=1   skip timing and print topology statistics instead (edge count,
//             max in-degree, rank count and widths under longest-path
//             layering), for recording graph shape alongside timings
//
// Graph generation is seeded (mulberry32), so every graph is reproducible
// from (topology, n, seed); the STATS output for a given triple must not
// change across machines.
//
// The dot path mirrors plexus getLayout.ts: build the same DOT string
// toDot.tsx produces with DAG.tsx's production options (nodesep=1.5,
// rankdir=TB, ranksep=1.6, splines=polyline, node [shape=box,
// fixedsize=true]), then viz.renderString(dot, { engine: 'dot',
// format: 'plain' }). @viz-js/viz resolves from packages/plexus, so the
// benchmark always runs against the version the repo actually pins.
//
// The dagre path uses the same node sizes and equivalent separations in px.
// @dagrejs/dagre is deliberately not a repo dependency; to run that engine,
// install it without saving (for example `pnpm add -w @dagrejs/dagre@3.1.1`
// and discard the package.json change, or set NODE_PATH to any directory
// that contains it). The RFC table was measured with @dagrejs/dagre 3.1.1.

import { createRequire } from 'module';
import path from 'path';

// @viz-js/viz is a plexus dependency and pnpm keeps it out of the root
// node_modules, so resolve it (and, if installed there, dagre) from
// packages/plexus. localRequire is the fallback for a root-level or
// NODE_PATH install of dagre.
const plexusRequire = createRequire(
  path.join(import.meta.dirname, '..', 'packages', 'plexus', 'package.json')
);
const localRequire = createRequire(import.meta.url);

const NODE_W_IN = 0.83; // 60px circle-ish node at 72dpi, same for both engines
const NODE_H_IN = 0.83;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// RFC replication: "dense random graphs (with ~60% extra edges)".
// Spanning tree over shuffled order + 60% * n extra random forward edges.
function genDense(n, rnd) {
  const edges = [];
  const seen = new Set();
  for (let i = 1; i < n; i++) {
    const parent = Math.floor(rnd() * i);
    edges.push([parent, i]);
    seen.add(parent + '>' + i);
  }
  const extra = Math.floor(0.6 * n);
  let added = 0;
  while (added < extra) {
    const a = Math.floor(rnd() * n);
    const b = Math.floor(rnd() * n);
    if (a === b) continue;
    const [from, to] = a < b ? [a, b] : [b, a]; // keep acyclic
    const key = from + '>' + to;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push([from, to]);
    added++;
  }
  return edges;
}

// Realistic service-dependency topology:
// - fixed shallow depth (7 layers: gateway -> 5 service tiers -> infra)
// - calls go to the next layer (mostly) or skip one layer (sometimes)
// - ~5% of nodes are shared-infra hubs (db/cache/queue) with high fan-in
// - avg out-degree ~2.2, matching published microservice-graph shapes
// hubProb=0 gives the 'layered' variant: same shape minus shared-infra fan-in,
// to isolate what the hub edges cost.
function genRealistic(n, rnd, hubProb = 0.4) {
  const LAYERS = 7;
  const nHubs = Math.max(3, Math.floor(n * 0.05));
  const nGateways = Math.max(1, Math.floor(n * 0.01));
  const nMid = n - nHubs - nGateways;
  const layerOf = Array.from({ length: n });
  let idx = 0;
  const gateways = [];
  for (let i = 0; i < nGateways; i++, idx++) {
    layerOf[idx] = 0;
    gateways.push(idx);
  }
  const midLayers = LAYERS - 2; // layers 1..LAYERS-2
  const perLayer = Math.ceil(nMid / midLayers);
  const layers = Array.from({ length: LAYERS }, () => []);
  gateways.forEach(g => layers[0].push(g));
  for (let i = 0; i < nMid; i++, idx++) {
    const layer = 1 + Math.min(midLayers - 1, Math.floor(i / perLayer));
    layerOf[idx] = layer;
    layers[layer].push(idx);
  }
  const hubs = [];
  for (let i = 0; i < nHubs; i++, idx++) {
    layerOf[idx] = LAYERS - 1;
    layers[LAYERS - 1].push(idx);
    hubs.push(idx);
  }

  const edges = [];
  const seen = new Set();
  const addEdge = (a, b) => {
    const key = a + '>' + b;
    if (a !== b && !seen.has(key)) {
      seen.add(key);
      edges.push([a, b]);
    }
  };
  const pick = arr => arr[Math.floor(rnd() * arr.length)];

  for (let v = 0; v < n; v++) {
    const layer = layerOf[v];
    if (layer >= LAYERS - 1) continue; // hubs call nothing
    // 1-4 downstream calls, skewed low: 40% one, 35% two, 20% three, 5% four
    const r = rnd();
    const fanout = r < 0.4 ? 1 : r < 0.75 ? 2 : r < 0.95 ? 3 : 4;
    for (let k = 0; k < fanout; k++) {
      // 80% next layer, 20% skip one layer
      const target = Math.min(LAYERS - 2, layer + (rnd() < 0.8 ? 1 : 2));
      if (layers[target].length) addEdge(v, pick(layers[target]));
    }
    // 40% of services also touch a shared-infra hub
    if (layer > 0 && rnd() < hubProb) addEdge(v, pick(hubs));
  }
  // make sure every non-gateway node is reachable: parent from previous layer
  for (let v = 0; v < n; v++) {
    const layer = layerOf[v];
    if (layer === 0) continue;
    const hasIn = edges.some(([, b]) => b === v);
    if (!hasIn) {
      const prev = layers[layer - 1].length ? layers[layer - 1] : layers[0];
      addEdge(pick(prev), v);
    }
  }
  return edges;
}

// Exact shape toDot.tsx emits for DAG.tsx's dot config.
function toDot(n, edges) {
  const lines = [];
  lines.push('digraph G {');
  lines.push('  graph[nodesep=1.500, rankdir=TB, ranksep=1.600, sep=0.500, splines=polyline];');
  lines.push('  node [shape=box, fixedsize=true, label="", color="_", fillcolor="_"];');
  lines.push('  edge [arrowhead=none, arrowtail=none];');
  for (let v = 0; v < n; v++) {
    lines.push(`  "${v}" [height=${NODE_H_IN.toFixed(5)},width=${NODE_W_IN.toFixed(5)}];`);
  }
  const fromTo = new Map();
  for (const [a, b] of edges) {
    if (!fromTo.has(a)) fromTo.set(a, []);
    fromTo.get(a).push(b);
  }
  for (const [from, tails] of fromTo) {
    lines.push(`  "${from}"->{ ${tails.map(t => `"${t}"`).join(' ')} };`);
  }
  lines.push('}');
  return lines.join('\n');
}

function requireDagre() {
  try {
    return plexusRequire('@dagrejs/dagre');
  } catch {
    try {
      return localRequire('@dagrejs/dagre');
    } catch (e2) {
      throw new Error(
        '@dagrejs/dagre is not installed (it is intentionally not a repo dependency). ' +
          'Install it without saving, e.g. `pnpm add -w @dagrejs/dagre@3.1.1` and discard ' +
          'the package.json change, or set NODE_PATH to a directory containing it.',
        { cause: e2 }
      );
    }
  }
}

async function main() {
  const [topology, nStr, engine, seedStr] = process.argv.slice(2);
  const n = parseInt(nStr, 10);
  if (!['dense', 'layered', 'realistic'].includes(topology) || !n || !['dot', 'dagre'].includes(engine)) {
    console.error('usage: node scripts/rfc0008-bench.js <dense|layered|realistic> <n> <dot|dagre> [seed]');
    process.exit(2);
  }
  const seed = parseInt(seedStr || '42', 10);
  const rnd = mulberry32(seed);
  const edges =
    topology === 'dense'
      ? genDense(n, rnd)
      : topology === 'layered'
        ? genRealistic(n, rnd, 0)
        : genRealistic(n, rnd);
  if (process.env.STATS) {
    const inDeg = {};
    for (const [, b] of edges) inDeg[b] = (inDeg[b] || 0) + 1;
    const degs = Object.values(inDeg).sort((x, y) => y - x);
    // longest-path layering: rank(v) = longest path from any source, an
    // approximation of the rank structure both engines must order
    const rank = Array.from({ length: n }, () => 0);
    const adj = Array.from({ length: n }, () => []);
    const indegCnt = Array.from({ length: n }, () => 0);
    for (const [a, b] of edges) {
      adj[a].push(b);
      indegCnt[b]++;
    }
    const q = [];
    for (let v = 0; v < n; v++) if (indegCnt[v] === 0) q.push(v);
    while (q.length) {
      const v = q.shift();
      for (const w of adj[v]) {
        if (rank[v] + 1 > rank[w]) rank[w] = rank[v] + 1;
        if (--indegCnt[w] === 0) q.push(w);
      }
    }
    const nRanks = Math.max(...rank) + 1;
    const widths = Array.from({ length: nRanks }, () => 0);
    for (let v = 0; v < n; v++) widths[rank[v]]++;
    console.log(
      JSON.stringify({
        topology,
        n,
        edges: edges.length,
        maxInDeg: degs[0],
        ranks: nRanks,
        maxRankWidth: Math.max(...widths),
        meanRankWidth: Math.round(n / nRanks),
      })
    );
    return;
  }

  // Warm up each engine on a tiny graph first (JIT/WASM warmup excluded from
  // timing), then take the measured runs and report all plus the median.
  const RUNS = parseInt(process.env.RUNS || '3', 10);
  const runsMs = [];
  if (engine === 'dot') {
    const { instance } = plexusRequire('@viz-js/viz');
    const viz = await instance(); // one-time init, excluded from timing
    viz.renderString(
      toDot(5, [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
      ]),
      { engine: 'dot', format: 'plain' }
    );
    const dot = toDot(n, edges);
    for (let i = 0; i < RUNS; i++) {
      const t0 = process.hrtime.bigint();
      const out = viz.renderString(dot, { engine: 'dot', format: 'plain' });
      const t1 = process.hrtime.bigint();
      runsMs.push(Number(t1 - t0) / 1e6);
      if (!out.startsWith('graph ')) throw new Error('unexpected plain output');
    }
  } else {
    const dagre = requireDagre();
    const build = es => {
      const g = new dagre.graphlib.Graph();
      g.setGraph({ rankdir: 'TB', nodesep: 1.5 * 72, ranksep: 1.6 * 72 });
      g.setDefaultEdgeLabel(() => ({}));
      const nn = Math.max(...es.flat()) + 1;
      for (let v = 0; v < nn; v++) {
        g.setNode(String(v), { width: NODE_W_IN * 72, height: NODE_H_IN * 72 });
      }
      for (const [a, b] of es) g.setEdge(String(a), String(b));
      return g;
    };
    dagre.layout(
      build([
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
      ])
    ); // warmup
    for (let i = 0; i < RUNS; i++) {
      const g = build(edges);
      const t0 = process.hrtime.bigint();
      dagre.layout(g);
      const t1 = process.hrtime.bigint();
      runsMs.push(Number(t1 - t0) / 1e6);
      const n0 = g.node('0');
      if (typeof n0.x !== 'number') throw new Error('dagre produced no coordinates');
    }
  }
  const sorted = [...runsMs].sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      topology,
      n,
      engine,
      seed,
      edges: edges.length,
      runs: runsMs.map(m => Math.round(m)),
      medianMs: Math.round(sorted[Math.floor(RUNS / 2)]),
    })
  );
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
