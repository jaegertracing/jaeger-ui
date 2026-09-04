// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { writeFileSync } from 'fs';

/**
 * Generates a sample GenAI trace for the timeline tests and for manual UI checks.
 *
 * The topology is modelled on a real agent deployment: a request enters through an API
 * edge and a GraphQL gateway, the gateway resolves a field by calling an agent, and the
 * agent's tool calls reach downstream services through an MCP server. Neither the edge
 * nor the gateway emits GenAI spans, so the GenAI portion of the trace sits underneath
 * two plain tiers. Real traces look like this because a GenAI SDK usually starts its own
 * trace part-way down an existing request.
 *
 * The shape deliberately covers four cases that a service-level GenAI filter has to get
 * right:
 *
 *   1. A plain fan-out below the MCP server (auth, metrics, traces, k8s). Pruning these
 *      services is the win: a large subtree collapses into one placeholder row.
 *   2. A nested agent below a plain MCP server. The MCP server owns no GenAI span of its
 *      own, so a filter that only asks "does this service own a GenAI span" prunes it and
 *      hides the nested agent underneath.
 *   3. The LLM SDK's own HTTP client spans. These share the agent's service name, so no
 *      service-level filter can hide them.
 *   4. An error inside a pruned subtree, which the placeholder row must still report
 *      through prunedErrorCount.
 *
 * Attributes are limited to the ones the UI reads, so every span renders the way its
 * kind implies: gen_ai.* for the span pills and the GenAI detail tab sections in
 * genAiData.ts, http.* for the request spans, db.* for the datastore spans, plus
 * span.kind and error.
 *
 * Instructions to run this script:
 *
 *    node scripts/utils/make-genai-trace.js [--turns N] [--out FILE] [--envelope]
 *
 *    --turns N     agent turns to emit; each turn adds an LLM call, two tool calls and a
 *                  retrieval, with their downstream fan-out. Default 3.
 *    --out FILE    where to write. Default is the committed test fixture.
 *    --envelope    wrap the trace in {"data":[...]} so it can be loaded through the
 *                  Upload tab. Tests want the unwrapped form, which is the default.
 */

const DEFAULT_OUT = 'packages/jaeger-ui/src/components/TracePage/TraceTimelineViewer/genaiTestTrace.json';

const TRACE_ID = '4a1b2c3d4e5f60718293a4b5c6d7e8f9';

const SERVICES = {
  p1: 'api-edge',
  p2: 'graphql-gateway',
  p3: 'coding-agent',
  p4: 'mcp-gateway',
  p5: 'auth-service',
  p6: 'metrics-backend',
  p7: 'trace-store',
  p8: 'k8s-api',
  p9: 'vector-store',
  p10: 'summarizer-agent',
};

const TAG_TYPES = { string: 'string', number: 'int64', boolean: 'bool' };

const httpServer = (method, route, status) => ({
  'http.request.method': method,
  'http.route': route,
  'http.response.status_code': status,
});

const httpClient = (method, url, status) => ({
  'http.request.method': method,
  'url.full': url,
  'http.response.status_code': status,
});

const dbQuery = (system, namespace, query) => ({
  'db.system.name': system,
  'db.namespace': namespace,
  'db.query.text': query,
});

// Feeds the GenAI detail tab: provider/model, token usage and the conversation
// sections in genAiData.ts. Messages follow the current spec shape, an array of
// { role, parts: [{ type, content }] }.
const llmAttrs = (model, prompt, reply, inputTokens, outputTokens) => ({
  'gen_ai.provider.name': 'example-ai',
  'gen_ai.response.model': model,
  'gen_ai.usage.input_tokens': inputTokens,
  'gen_ai.usage.output_tokens': outputTokens,
  'gen_ai.usage.cache_read.input_tokens': Math.floor(inputTokens / 2),
  'gen_ai.system_instructions': JSON.stringify([
    { type: 'text', content: 'You are a triage assistant. Use the available tools before answering.' },
  ]),
  'gen_ai.input.messages': JSON.stringify([{ role: 'user', parts: [{ type: 'text', content: prompt }] }]),
  'gen_ai.output.messages': JSON.stringify([
    { role: 'assistant', parts: [{ type: 'text', content: reply }] },
  ]),
});

// These two URLs resolve, so a manual check of the media views shows a real picture and
// plays a real sound. The tab requests them only when the reader asks it to.
const MEDIA_IMAGE_URL = 'https://www.jaegertracing.io/img/jaeger-icon-reverse-color.svg';
const MEDIA_AUDIO_URL = 'https://github.com/rafaelreis-hotmart/Audio-Sample-files/raw/master/sample.mp3';

// Base64 of a 320x160 SVG, the form a blob part carries. Cases built from it render with
// the network switched off.
const MEDIA_BLOB_BASE64 =
  'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMTYwIj48cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iIzI2NDY1MyIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iODAiIHI9IjQ1IiBmaWxsPSIjZTljNDZhIi8+PHRleHQgeD0iMTUwIiB5PSI4OCIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjIwIj5lbWJlZGRlZCBibG9iPC90ZXh0Pjwvc3ZnPg==';

// Carries one message per media shape the GenAI tab has to handle, so the conversation is
// a manual check of every state: offered and loaded on request, rendered on sight, failed
// to load, and the parts that name nothing renderable and so keep the placeholder.
const mediaAttrs = () => ({
  'gen_ai.provider.name': 'example-ai',
  'gen_ai.response.model': 'model-multimodal',
  'gen_ai.usage.input_tokens': 210,
  'gen_ai.usage.output_tokens': 480,
  'gen_ai.input.messages': JSON.stringify([
    {
      role: 'user',
      parts: [{ type: 'text', content: 'Chart the checkout latency and read the summary out loud.' }],
    },
  ]),
  'gen_ai.output.messages': JSON.stringify([
    // A text part whose whole content is a link, which is how a plain media URL reaches the
    // tab under the current spec.
    { role: 'assistant', parts: [{ type: 'text', content: MEDIA_IMAGE_URL }] },
    { role: 'assistant', parts: [{ type: 'text', content: MEDIA_AUDIO_URL }] },
    // An embedded payload as a plain value: no request, so it renders on sight.
    {
      role: 'assistant',
      parts: [{ type: 'text', content: `data:image/svg+xml;base64,${MEDIA_BLOB_BASE64}` }],
    },
    // A link that resolves to nothing, so the load-failure path is reachable.
    { role: 'assistant', parts: [{ type: 'text', content: 'https://example.invalid/missing-chart.png' }] },
    // The rest are the spec's multimodal part types. These first two name something a
    // browser can render; the three after them do not.
    {
      role: 'assistant',
      parts: [{ type: 'uri', modality: 'image', mime_type: 'image/svg+xml', uri: MEDIA_IMAGE_URL }],
    },
    {
      role: 'assistant',
      parts: [{ type: 'blob', modality: 'image', mime_type: 'image/svg+xml', content: MEDIA_BLOB_BASE64 }],
    },
    // A URL with no file extension, where the part's own modality is the only thing that
    // says it is an image. The query string makes it look like a rendering endpoint,
    // which is how a provider hands one back.
    {
      role: 'assistant',
      parts: [{ type: 'uri', modality: 'image', uri: `${MEDIA_IMAGE_URL}?render=1` }],
    },
    // The spec allows a uri part to use a provider scheme, which no browser can fetch.
    {
      role: 'assistant',
      parts: [{ type: 'uri', modality: 'image', uri: 'gs://example-ai-outputs/chart-a1b2.png' }],
    },
    // mime_type is optional, and a modality of "audio" does not name a type, so there is
    // nothing to build a data: URI from.
    { role: 'assistant', parts: [{ type: 'blob', modality: 'audio', content: MEDIA_BLOB_BASE64 }] },
    // A file part carries an opaque provider id rather than a location.
    {
      role: 'assistant',
      parts: [{ type: 'file', modality: 'image', mime_type: 'image/png', file_id: 'provider_fileid_123' }],
    },
    // Attachments sharing a message with text, which is what the spec's own multimodal
    // example looks like. Each part is rendered in place, so neither the text nor the
    // attachment is lost to the other.
    {
      role: 'assistant',
      parts: [
        { type: 'text', content: 'Here is the chart you asked for:' },
        { type: 'uri', modality: 'image', mime_type: 'image/svg+xml', uri: MEDIA_IMAGE_URL },
      ],
    },
    {
      role: 'assistant',
      parts: [
        { type: 'text', content: 'And the same chart embedded rather than linked:' },
        { type: 'blob', modality: 'image', mime_type: 'image/svg+xml', content: MEDIA_BLOB_BASE64 },
        { type: 'text', content: 'Both show the same latency regression.' },
      ],
    },
  ]),
});

// Feeds the GenAI detail tab's tool-call section.
const toolCallAttrs = (name, callID, args, result) => ({
  'gen_ai.tool.name': name,
  'gen_ai.tool.call.id': callID,
  'gen_ai.tool.call.arguments': JSON.stringify(args),
  'gen_ai.tool.call.result': JSON.stringify(result),
});

function parseArgs(argv) {
  const args = { turns: 3, out: DEFAULT_OUT, envelope: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--turns') args.turns = Number(argv[++i]);
    else if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--envelope') args.envelope = true;
  }
  if (!Number.isInteger(args.turns) || args.turns < 1) {
    throw new Error(`--turns must be a positive integer, got ${args.turns}`);
  }
  return args;
}

function createBuilder() {
  const spans = [];
  let seq = 0;
  // Fixed start time keeps regenerated output byte-identical.
  let clock = 1770000000000000;

  function span({ name, proc, parent, kind = 'internal', genAIOp, model, error = false, duration, attrs }) {
    const spanID = (++seq).toString(16).padStart(16, '0');
    const tags = [{ key: 'span.kind', type: 'string', value: kind }];
    if (genAIOp) tags.push({ key: 'gen_ai.operation.name', type: 'string', value: genAIOp });
    if (model) tags.push({ key: 'gen_ai.request.model', type: 'string', value: model });
    for (const [key, value] of Object.entries(attrs ?? {})) {
      tags.push({ key, type: TAG_TYPES[typeof value], value });
    }
    if (error) tags.push({ key: 'error', type: 'bool', value: true });
    clock += 1000;
    spans.push({
      traceID: TRACE_ID,
      spanID,
      operationName: name,
      references: parent ? [{ refType: 'CHILD_OF', traceID: TRACE_ID, spanID: parent }] : [],
      startTime: clock,
      duration,
      tags,
      logs: [],
      processID: proc,
    });
    return spanID;
  }

  return { spans, span };
}

function buildTrace(turns) {
  const { spans, span } = createBuilder();

  // Two plain tiers above the agent. graphql-gateway owns no GenAI span and is not the
  // root service, so root-service protection does not apply to it.
  const edge = span({
    name: 'POST /api/graphql',
    proc: 'p1',
    kind: 'server',
    duration: 44000000,
    attrs: httpServer('POST', '/api/graphql', 200),
  });
  const gateway = span({
    name: 'Query.assistantReply',
    proc: 'p2',
    parent: edge,
    kind: 'server',
    duration: 43000000,
  });
  span({ name: 'graphql.execution', proc: 'p2', parent: gateway, duration: 43000000 });

  const agent = span({
    name: 'invoke_agent triage-agent',
    proc: 'p3',
    parent: gateway,
    kind: 'server',
    genAIOp: 'invoke_agent',
    duration: 42000000,
    attrs: { 'gen_ai.agent.name': 'triage-agent', 'gen_ai.provider.name': 'example-ai' },
  });

  // An LLM call always carries the SDK's own HTTP client span, in the agent's service.
  function llmCall(parent, model) {
    const llm = span({
      name: `chat ${model}`,
      proc: 'p3',
      parent,
      kind: 'client',
      genAIOp: 'chat',
      model,
      duration: 1800000,
      attrs: llmAttrs(
        model,
        'Why did the checkout latency regress this afternoon?',
        'Latency rose with a slow pod rollout. Checking the dashboards and traces now.',
        1840,
        260
      ),
    });
    span({
      name: 'POST /v1/messages',
      proc: 'p3',
      parent: llm,
      kind: 'client',
      duration: 1750000,
      attrs: httpClient('POST', 'https://api.example-ai.test/v1/messages', 200),
    });
    return llm;
  }

  // A tool call reaches downstream services through the MCP server.
  function toolCall(parent, toolName, fanOut) {
    const tool = span({
      name: `execute_tool ${toolName}`,
      proc: 'p3',
      parent,
      genAIOp: 'execute_tool',
      duration: 900000,
      attrs: toolCallAttrs(toolName, `call_${toolName}`, { window: '1h' }, { status: 'ok', rows: 12 }),
    });
    const mcp = span({
      name: 'POST /mcp/tools/call',
      proc: 'p4',
      parent: tool,
      kind: 'server',
      duration: 850000,
      attrs: httpServer('POST', '/mcp/tools/call', 200),
    });
    span({
      name: 'GET /validate',
      proc: 'p5',
      parent: mcp,
      kind: 'server',
      duration: 40000,
      attrs: httpServer('GET', '/validate', 200),
    });
    fanOut(mcp, span);
    return tool;
  }

  for (let turn = 0; turn < turns; turn++) {
    llmCall(agent, 'model-a');

    toolCall(agent, 'list_dashboards', (mcp, emit) => {
      const query = emit({
        name: 'GET /api/v1/query',
        proc: 'p6',
        parent: mcp,
        kind: 'server',
        duration: 300000,
        attrs: httpServer('GET', '/api/v1/query', 200),
      });
      emit({
        name: 'SELECT series',
        proc: 'p6',
        parent: query,
        kind: 'client',
        duration: 120000,
        attrs: dbQuery('clickhouse', 'metrics', 'SELECT series FROM samples WHERE name = ? AND ts > ?'),
      });
    });

    toolCall(agent, 'search_traces', (mcp, emit) => {
      const query = emit({
        name: 'GET /api/traces',
        proc: 'p7',
        parent: mcp,
        kind: 'server',
        duration: 500000,
        attrs: httpServer('GET', '/api/traces', 200),
      });
      emit({
        name: 'search',
        proc: 'p7',
        parent: query,
        kind: 'client',
        duration: 200000,
        attrs: dbQuery('elasticsearch', 'jaeger-span', '{"query":{"term":{"traceID":"?"}}}'),
      });
      // The only error in the trace, inside a subtree the filter prunes.
      emit({
        name: 'GET /api/v1/pods',
        proc: 'p8',
        parent: query,
        kind: 'server',
        error: turn === 0,
        duration: 80000,
        attrs: httpServer('GET', '/api/v1/pods', turn === 0 ? 500 : 200),
      });
    });

    const retrieval = span({
      name: 'retrieval vector-search',
      proc: 'p3',
      parent: agent,
      kind: 'client',
      genAIOp: 'retrieval',
      duration: 250000,
    });
    span({
      name: 'SEARCH docs',
      proc: 'p9',
      parent: retrieval,
      kind: 'server',
      duration: 200000,
      attrs: dbQuery('qdrant', 'docs', 'SEARCH collection=docs topK=8'),
    });
  }

  // A nested agent below the plain MCP server.
  const nestedTool = span({
    name: 'execute_tool summarize_findings',
    proc: 'p3',
    parent: agent,
    genAIOp: 'execute_tool',
    duration: 4000000,
  });
  const nestedMcp = span({
    name: 'POST /mcp/tools/call',
    proc: 'p4',
    parent: nestedTool,
    kind: 'server',
    duration: 3900000,
    attrs: httpServer('POST', '/mcp/tools/call', 200),
  });
  span({
    name: 'GET /validate',
    proc: 'p5',
    parent: nestedMcp,
    kind: 'server',
    duration: 40000,
    attrs: httpServer('GET', '/validate', 200),
  });
  const nestedAgent = span({
    name: 'invoke_agent summarizer',
    proc: 'p10',
    parent: nestedMcp,
    kind: 'server',
    genAIOp: 'invoke_agent',
    duration: 3700000,
    attrs: { 'gen_ai.agent.name': 'summarizer', 'gen_ai.provider.name': 'example-ai' },
  });
  llmCallIn(span, nestedAgent);

  llmCall(agent, 'model-a');

  // A multimodal turn, so the tab's media views have something to render.
  const mediaLlm = span({
    name: 'chat model-multimodal',
    proc: 'p3',
    parent: agent,
    kind: 'client',
    genAIOp: 'chat',
    model: 'model-multimodal',
    duration: 2100000,
    attrs: mediaAttrs(),
  });
  span({
    name: 'POST /v1/messages',
    proc: 'p3',
    parent: mediaLlm,
    kind: 'client',
    duration: 2050000,
    attrs: httpClient('POST', 'https://api.example-ai.test/v1/messages', 200),
  });

  return spans;
}

// The nested agent's LLM call lives in its own service, so it cannot reuse llmCall above.
function llmCallIn(span, parent) {
  const llm = span({
    name: 'chat model-b',
    proc: 'p10',
    parent,
    kind: 'client',
    genAIOp: 'chat',
    model: 'model-b',
    duration: 3500000,
    attrs: llmAttrs(
      'model-b',
      'Summarise the findings from the dashboards and traces.',
      'A pod rollout at 14:05 slowed checkout; latency recovered once it completed.',
      920,
      140
    ),
  });
  span({
    name: 'POST /v1/messages',
    proc: 'p10',
    parent: llm,
    kind: 'client',
    duration: 3450000,
    attrs: httpClient('POST', 'https://api.example-ai.test/v1/messages', 200),
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const spans = buildTrace(args.turns);
  const processes = Object.fromEntries(
    Object.entries(SERVICES).map(([id, serviceName]) => [id, { serviceName, tags: [] }])
  );
  // JSON has no comments, so provenance rides along as a field. transformTraceData
  // reads only traceID, spans and processes, so the extra key is ignored everywhere.
  const trace = {
    _comment:
      'Generated by scripts/utils/make-genai-trace.js (pnpm run generate:genai-trace). ' +
      'Do not edit by hand - see that script for what the topology covers and why.',
    traceID: TRACE_ID,
    spans,
    processes,
    warnings: null,
  };
  const payload = args.envelope ? { data: [trace], total: 1, limit: 0, offset: 0, errors: null } : trace;

  writeFileSync(args.out, `${JSON.stringify(payload, null, 2)}\n`);
  const genAICount = spans.filter(s => s.tags.some(t => t.key === 'gen_ai.operation.name')).length;
  console.log(
    `wrote ${args.out}: ${spans.length} spans (${genAICount} GenAI), ` +
      `${Object.keys(SERVICES).length} services, turns=${args.turns}`
  );
}

main();
