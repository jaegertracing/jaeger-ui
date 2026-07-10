// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
//
// Standalone mock Jaeger backend for browser performance benchmarks.
//
// Usage:
//   node _bench_mock.mjs                     # start mock backend on :16686
//   npm start                                 # from packages/jaeger-ui/
//   # Open http://localhost:5173/trace/a1b2c3d4e5f60000 in Chromium
//   # Wait for "Total Spans 80000" to appear, then paste into DevTools:
//
//   (async()=>{const c=document.querySelector('.TimelineCollapser'),s=c.querySelectorAll('svg');
//   const C=(i)=>{s[i].dispatchEvent(new MouseEvent('click',{bubbles:true}))},S=(m)=>new Promise(r=>setTimeout(r,m));
//   const M=(n,i)=>new Promise(r=>{const m=_=>performance.memory?.usedJSHeapSize/1048576||0;
//   const b=m(),d0=document.querySelectorAll('*').length,t0=performance.now();let f=0;
//   const h=()=>{f++>=3?r({n,t:(performance.now()-t0).toFixed(1)+'ms',
//   h:(m()-b).toFixed(1)+'MB',d:[d0,document.querySelectorAll('*').length]}):requestAnimationFrame(h)};
//   C(i);requestAnimationFrame(h)});await S(1e3);
//   console.log(await M('CollapseAll',3));await S(2e3);
//   console.log(await M('ExpandAll',2));})();
//
// To test the OLD (RowState[]) baseline, checkout parent commit for the 2 SoA files:
//   git checkout 3cbbda48 -- packages/jaeger-ui/src/components/.../{generateRowStates.ts,VirtualizedTraceView.tsx}
//
// Prerequisite: The 80k trace has depth 72000 and requires iterative stack-safety
// fixes (PR #4195) — without them the page shows "Maximum call stack size exceeded".

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Try the most likely locations for the 80k-span fixture.
const traceCandidates = [
  path.join(__dirname, 'packages/jaeger-ui/public/large-trace.json'),
  path.join(__dirname, 'large-trace.json'),
];
let tracePath;
for (const candidate of traceCandidates) {
  if (fs.existsSync(candidate)) {
    tracePath = candidate;
    break;
  }
}
if (!tracePath) {
  console.error(
    '[bench-mock] ERROR: Cannot find large-trace.json.\n' +
      '  Expected at one of:\n' +
      `    ${traceCandidates.join('\n    ')}\n` +
      '  Generate it or copy the 80k-span trace file to one of those locations.'
  );
  process.exit(1);
}
const trace = fs.readFileSync(tracePath, 'utf-8');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.end('');
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  res.setHeader('Content-Type', 'application/json');

  // /api/traces/<traceID> — serve the 80k trace
  if (url.pathname.startsWith('/api/traces/')) {
    res.end(trace);
    return;
  }
  // /api/services — minimal service list
  if (url.pathname === '/api/services') {
    res.end(JSON.stringify({ data: ['demo'] }));
    return;
  }
  // /api/services/<svc>/operations — minimal ops
  if (url.pathname.match(/^\/api\/services\/[^/]+\/operations$/)) {
    res.end(JSON.stringify({ data: ['GET'] }));
    return;
  }
  // /api/traces — search (return empty)
  if (url.pathname === '/api/traces') {
    res.end(JSON.stringify({ data: [] }));
    return;
  }
  res.end(JSON.stringify({ data: [] }));
});

const PORT = 16686;
server.listen(PORT, () => {
  console.log(`[bench-mock] Jaeger mock backend listening on http://localhost:${PORT}`);
  console.log(`[bench-mock] Serving 80k-span trace at /api/traces/a1b2c3d4e5f60000`);
});
