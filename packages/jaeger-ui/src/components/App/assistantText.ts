// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// Claude Code names MCP tools `mcp__<server>__<tool>`. The server segment may
// itself contain single underscores, so the separator is the double underscore.
const MCP_TOOL_NAME = /^mcp__.+?__(.+)$/;

// Agent-internal discovery tools. They are not Jaeger operations and only
// add noise next to the trace tools the user asked about.
const INTERNAL_AGENT_TOOLS = new Set(['ToolSearch']);

export function formatToolDisplayName(toolName: string): string {
  const match = MCP_TOOL_NAME.exec(toolName);
  if (!match?.[1]) return toolName;
  return match[1];
}

export function isInternalAgentTool(toolName: string): boolean {
  return INTERNAL_AGENT_TOOLS.has(toolName) || INTERNAL_AGENT_TOOLS.has(formatToolDisplayName(toolName));
}
