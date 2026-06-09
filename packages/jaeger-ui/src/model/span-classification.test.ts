// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IAttribute, IOtelSpan, SpanKind, StatusCode } from '../types/otel';
import { Microseconds } from '../types/units';
import { classifySpan, getAttribute, hasAttributePrefix, SpanType } from './span-classification';

const microseconds = (value: number) => value as Microseconds;

const createSpan = ({
  attributes = [],
  kind = SpanKind.INTERNAL,
  name = 'operation',
}: {
  attributes?: IAttribute[];
  kind?: SpanKind;
  name?: string;
} = {}): IOtelSpan => ({
  traceID: 'trace-id',
  spanID: 'span-id',
  name,
  kind,
  startTime: microseconds(0),
  endTime: microseconds(1),
  duration: microseconds(1),
  attributes,
  events: [],
  links: [],
  status: { code: StatusCode.OK },
  resource: { attributes: [], serviceName: 'service' },
  instrumentationScope: { name: 'scope' },
  depth: 0,
  hasChildren: false,
  childSpans: [],
  relativeStartTime: microseconds(0),
  inboundLinks: [],
  warnings: null,
});

describe('span-classification', () => {
  it('finds an attribute by key', () => {
    const attribute = { key: 'db.system', value: 'postgresql' };
    const span = createSpan({ attributes: [attribute] });

    expect(getAttribute(span, 'db.system')).toBe(attribute);
  });

  it('detects attribute prefixes', () => {
    const span = createSpan({ attributes: [{ key: 'gen_ai.request.model', value: 'gpt-4' }] });

    expect(hasAttributePrefix(span, 'gen_ai.')).toBe(true);
  });

  it('classifies database spans from semantic attributes', () => {
    const span = createSpan({ attributes: [{ key: 'db.system', value: 'postgresql' }] });

    expect(classifySpan(span)).toEqual({ type: SpanType.Database, label: 'Database call' });
  });

  it('classifies database spans from legacy db.type', () => {
    const span = createSpan({ attributes: [{ key: 'db.type', value: 'sql' }] });

    expect(classifySpan(span)).toEqual({ type: SpanType.Database, label: 'Database call' });
  });

  it('classifies GenAI spans from semantic attribute prefixes', () => {
    const span = createSpan({ attributes: [{ key: 'gen_ai.request.model', value: 'gpt-4' }] });

    expect(classifySpan(span)).toEqual({ type: SpanType.GenAI, label: 'GenAI step' });
  });

  it('classifies MCP tool calls before generic GenAI spans', () => {
    const span = createSpan({
      attributes: [
        { key: 'gen_ai.request.model', value: 'gpt-4' },
        { key: 'gen_ai.tool.name', value: 'search_docs' },
      ],
    });

    expect(classifySpan(span)).toEqual({ type: SpanType.MCP, label: 'MCP tool call' });
  });

  it('classifies MCP tool calls from operation names as a fallback', () => {
    const span = createSpan({ name: 'mcp tool call search_docs' });

    expect(classifySpan(span)).toEqual({ type: SpanType.MCP, label: 'MCP tool call' });
  });

  it('classifies messaging spans', () => {
    const span = createSpan({ attributes: [{ key: 'messaging.system', value: 'kafka' }] });

    expect(classifySpan(span)).toEqual({ type: SpanType.Messaging, label: 'Messaging span' });
  });

  it('classifies HTTP spans before generic RPC spans', () => {
    const span = createSpan({
      attributes: [{ key: 'http.request.method', value: 'GET' }],
      kind: SpanKind.CLIENT,
    });

    expect(classifySpan(span)).toEqual({ type: SpanType.HTTP, label: 'HTTP span' });
  });

  it('classifies RPC spans from attributes', () => {
    const span = createSpan({ attributes: [{ key: 'rpc.system', value: 'grpc' }] });

    expect(classifySpan(span)).toEqual({ type: SpanType.RPC, label: 'RPC span' });
  });

  it('classifies client and server spans as RPC fallback', () => {
    const span = createSpan({ kind: SpanKind.CLIENT });

    expect(classifySpan(span)).toEqual({ type: SpanType.RPC, label: 'RPC span' });
  });

  it('returns null when no heuristic matches', () => {
    expect(classifySpan(createSpan())).toBeNull();
  });
});
