// Copyright (c) 2024 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import genaiTestTraceRaw from './genaiTestTrace.json';

interface KeyValuePair {
  key: string;
  type: string;
  value: any;
}

interface SpanReference {
  refType: string;
  traceID: string;
  spanID: string;
}

interface Span {
  traceID: string;
  spanID: string;
  operationName: string;
  references: SpanReference[];
  startTime: number;
  duration: number;
  processID: string;
  tags: KeyValuePair[];
}

interface Trace {
  traceID: string;
  spans: Span[];
  processes: Record<string, any>;
}

interface FixtureData {
  data: Trace[];
}

const genaiTestTrace: FixtureData = genaiTestTraceRaw as any;

function requireSpan(spans: Span[], operationName: string): Span {
  const matches = spans.filter((s) => s.operationName === operationName);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one span with operationName '${operationName}', found ${matches.length}.`);
  }
  return matches[0];
}

function requireTag(tags: KeyValuePair[], key: string): KeyValuePair {
  const tag = tags.find((t) => t.key === key);
  if (!tag) {
    throw new Error(`Required tag '${key}' was not found.`);
  }
  return tag;
}

describe('genaiTestTrace.json fixture', () => {
  it('loads without errors and has correct structure', () => {
    expect(genaiTestTrace).toBeDefined();
    expect(Array.isArray(genaiTestTrace.data)).toBe(true);
  });

  it('contains a full GenAI trace with required span hierarchy', () => {
    const fullTrace = genaiTestTrace.data.find(t => t.traceID === 'genai-full-trace-001');
    if (!fullTrace) throw new Error('Could not find trace with ID genai-full-trace-001');

    const invokeAgentSpan = requireSpan(fullTrace.spans, 'invoke_agent');
    const chatSpan = requireSpan(fullTrace.spans, 'chat');
    const httpClientSpan = requireSpan(fullTrace.spans, 'HTTP POST');
    const executeToolSpan = requireSpan(fullTrace.spans, 'execute_tool');
    const retrievalSpan = requireSpan(fullTrace.spans, 'retrieval');

    // Verify parent-child relationships using some() to tolerate fixture reference ordering
    expect(chatSpan.references.some(r => r.refType === 'CHILD_OF' && r.spanID === invokeAgentSpan.spanID)).toBe(true);
    expect(httpClientSpan.references.some(r => r.refType === 'CHILD_OF' && r.spanID === chatSpan.spanID)).toBe(true);
    expect(executeToolSpan.references.some(r => r.refType === 'CHILD_OF' && r.spanID === invokeAgentSpan.spanID)).toBe(true);
    expect(retrievalSpan.references.some(r => r.refType === 'CHILD_OF' && r.spanID === invokeAgentSpan.spanID)).toBe(true);
  });

  it('gen_ai.input.messages value is >= 1 KB serialised', () => {
    const fullTrace = genaiTestTrace.data.find(t => t.traceID === 'genai-full-trace-001');
    if (!fullTrace) throw new Error('Could not find trace with ID genai-full-trace-001');

    const chatSpan = requireSpan(fullTrace.spans, 'chat');
    const messagesTag = requireTag(chatSpan.tags, 'gen_ai.input.messages');
    
    const messagesString = messagesTag.value;
    expect(typeof messagesString).toBe('string');
    expect(messagesString.length).toBeGreaterThanOrEqual(1024); // >= 1 KB
    
    expect(() => JSON.parse(messagesString as string)).not.toThrow();
    // Verify it's valid JSON and contains at least 3 messages
    const parsedMessages = JSON.parse(messagesString as string);
    expect(Array.isArray(parsedMessages)).toBe(true);
    expect(parsedMessages.length).toBeGreaterThanOrEqual(3);
  });

  it('contains a second partial-GenAI fixture (iconography-only)', () => {
    const partialTrace = genaiTestTrace.data.find(t => t.traceID === 'genai-partial-trace-002');
    if (!partialTrace) throw new Error('Could not find trace with ID genai-partial-trace-002');
    
    const llmSpan = requireSpan(partialTrace.spans, 'llm_completion');
    const systemTag = requireTag(llmSpan.tags, 'gen_ai.system');
    
    expect(systemTag.value).toBe('openai');
  });
});
