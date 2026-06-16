// Copyright (c) 2024 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import genaiTestTrace from './genaiTestTrace.json';

describe('genaiTestTrace.json fixture', () => {
  it('loads without errors and has correct structure', () => {
    expect(genaiTestTrace).toBeDefined();
    expect(Array.isArray(genaiTestTrace.data)).toBe(true);
    expect(genaiTestTrace.data.length).toBe(2);
  });

  it('contains a full GenAI trace with required span hierarchy', () => {
    const fullTrace = genaiTestTrace.data[0];
    expect(fullTrace.traceID).toBe('genai-full-trace-001');

    const invokeAgentSpan = fullTrace.spans.find((s: any) => s.operationName === 'invoke_agent');
    const chatSpan = fullTrace.spans.find((s: any) => s.operationName === 'chat');
    const httpClientSpan = fullTrace.spans.find((s: any) => s.operationName === 'HTTP POST');
    const executeToolSpan = fullTrace.spans.find((s: any) => s.operationName === 'execute_tool');
    const retrievalSpan = fullTrace.spans.find((s: any) => s.operationName === 'retrieval');

    expect(invokeAgentSpan).toBeDefined();
    expect(chatSpan).toBeDefined();
    expect(httpClientSpan).toBeDefined();
    expect(executeToolSpan).toBeDefined();
    expect(retrievalSpan).toBeDefined();

    // Verify parent-child relationships
    expect(chatSpan.references[0].spanID).toBe(invokeAgentSpan.spanID);
    expect(httpClientSpan.references[0].spanID).toBe(chatSpan.spanID);
    expect(executeToolSpan.references[0].spanID).toBe(invokeAgentSpan.spanID);
    expect(retrievalSpan.references[0].spanID).toBe(invokeAgentSpan.spanID);
  });

  it('gen_ai.input.messages value is >= 1 KB serialised', () => {
    const fullTrace = genaiTestTrace.data[0];
    const chatSpan = fullTrace.spans.find((s: any) => s.operationName === 'chat');
    
    const messagesTag = chatSpan.tags.find((t: any) => t.key === 'gen_ai.input.messages');
    expect(messagesTag).toBeDefined();
    
    const messagesString = messagesTag.value;
    expect(messagesString.length).toBeGreaterThanOrEqual(1024); // >= 1 KB
    
    // Verify it's valid JSON and contains at least 3 messages
    const parsedMessages = JSON.parse(messagesString);
    expect(Array.isArray(parsedMessages)).toBe(true);
    expect(parsedMessages.length).toBeGreaterThanOrEqual(3);
  });

  it('contains a second partial-GenAI fixture (iconography-only)', () => {
    const partialTrace = genaiTestTrace.data[1];
    expect(partialTrace.traceID).toBe('genai-partial-trace-002');
    
    const llmSpan = partialTrace.spans.find((s: any) => s.operationName === 'llm_completion');
    expect(llmSpan).toBeDefined();
    
    const systemTag = llmSpan.tags.find((t: any) => t.key === 'gen_ai.system');
    expect(systemTag).toBeDefined();
    expect(systemTag.value).toBe('openai');
  });
});
