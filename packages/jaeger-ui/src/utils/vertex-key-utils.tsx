// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Utility module for working with vertex keys in the trace DAG.
 * Encapsulates the encoding/decoding of hierarchical vertex keys to avoid
 * leaking implementation details across components.
 */

// Separator characters used in vertex keys
export const VERTEX_KEY_PATH_SEPARATOR = '\v'; // Vertical tab (\u000b) - separates hierarchy levels
export const VERTEX_KEY_PART_SEPARATOR = '\t'; // Tab - separates service and operation
export const VERTEX_KEY_LEAF_MARKER = '__LEAF__';

/**
 * Represents a parsed part of a vertex key
 */
export interface IVertexKeyPart {
  service: string;
  operation: string;
  isLeaf: boolean;
}

/**
 * Parses a hierarchical vertex key into its constituent parts.
 *
 * Example: "serviceA\topA\vserviceB\topB\t__LEAF__"
 * Returns: [
 *   { service: "serviceA", operation: "opA", isLeaf: false },
 *   { service: "serviceB", operation: "opB", isLeaf: true }
 * ]
 *
 * @param vertexKey The vertex key to parse
 * @returns Array of parsed vertex key parts representing the hierarchy
 */
export function parseVertexKey(vertexKey: string): IVertexKeyPart[] {
  const parts = vertexKey.split(VERTEX_KEY_PATH_SEPARATOR);
  return parts.map(part => {
    const segments = part.split(VERTEX_KEY_PART_SEPARATOR);
    const service = segments[0] || '';
    const operation = segments[1] || '';
    const isLeaf = segments[2] === VERTEX_KEY_LEAF_MARKER;
    return { service, operation, isLeaf };
  });
}

/**
 * Gets the leaf (most specific) part of a vertex key.
 *
 * @param vertexKey The vertex key to parse
 * @returns The leaf part, or null if the key is invalid
 */
export function getLeafPart(vertexKey: string): IVertexKeyPart | null {
  const parts = parseVertexKey(vertexKey);
  return parts.length > 0 ? parts[parts.length - 1] : null;
}

/**
 * Checks if a vertex key matches a given service name, operation name, or both.
 *
 * @param vertexKey The vertex key to check
 * @param serviceName Optional service name to match
 * @param operationName Optional operation name to match
 * @returns True if the leaf part of the vertex key matches the provided criteria
 */
export function vertexKeyMatches(vertexKey: string, serviceName?: string, operationName?: string): boolean {
  const leaf = getLeafPart(vertexKey);
  if (!leaf) return false;

  if (serviceName && !leaf.service.includes(serviceName)) {
    return false;
  }

  if (operationName && !leaf.operation.includes(operationName)) {
    return false;
  }

  return true;
}
