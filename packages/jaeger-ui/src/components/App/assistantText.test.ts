// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { formatToolDisplayName, isInternalAgentTool } from './assistantText';

describe('formatToolDisplayName', () => {
  it('strips the mcp__<server>__ prefix', () => {
    expect(formatToolDisplayName('mcp__jaeger__search_traces')).toBe('search_traces');
    expect(formatToolDisplayName('mcp__jaeger__get_trace_topology')).toBe('get_trace_topology');
    expect(formatToolDisplayName('mcp__jaeger__get_critical_path')).toBe('get_critical_path');
    expect(formatToolDisplayName('mcp__jaeger__get_span_details')).toBe('get_span_details');
  });

  it('strips a server name that itself contains underscores', () => {
    expect(formatToolDisplayName('mcp__my_server__do_thing')).toBe('do_thing');
  });

  it('leaves ordinary tool names unchanged', () => {
    expect(formatToolDisplayName('read_skill')).toBe('read_skill');
    expect(formatToolDisplayName('ToolSearch')).toBe('ToolSearch');
  });
});

describe('isInternalAgentTool', () => {
  it('marks Claude Code ToolSearch as internal', () => {
    expect(isInternalAgentTool('ToolSearch')).toBe(true);
    expect(isInternalAgentTool('mcp__claude__ToolSearch')).toBe(true);
  });

  it('does not mark Jaeger tools as internal', () => {
    expect(isInternalAgentTool('mcp__jaeger__search_traces')).toBe(false);
    expect(isInternalAgentTool('search_traces')).toBe(false);
  });
});
