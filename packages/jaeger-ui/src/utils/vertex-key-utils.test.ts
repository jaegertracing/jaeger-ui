// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import {
  VERTEX_KEY_PATH_SEPARATOR,
  VERTEX_KEY_PART_SEPARATOR,
  VERTEX_KEY_LEAF_MARKER,
  parseVertexKey,
  getLeafPart,
  vertexKeyMatches,
} from './vertex-key-utils';

describe('vertex-key-utils', () => {
  describe('parseVertexKey', () => {
    it('should parse a simple vertex key', () => {
      const key = `service1${VERTEX_KEY_PART_SEPARATOR}op1`;
      const result = parseVertexKey(key);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        service: 'service1',
        operation: 'op1',
        isLeaf: false,
      });
    });

    it('should parse a leaf vertex key', () => {
      const key = `service1${VERTEX_KEY_PART_SEPARATOR}op1${VERTEX_KEY_PART_SEPARATOR}${VERTEX_KEY_LEAF_MARKER}`;
      const result = parseVertexKey(key);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        service: 'service1',
        operation: 'op1',
        isLeaf: true,
      });
    });

    it('should parse a hierarchical vertex key', () => {
      const key = `serviceA${VERTEX_KEY_PART_SEPARATOR}opA${VERTEX_KEY_PATH_SEPARATOR}serviceB${VERTEX_KEY_PART_SEPARATOR}opB${VERTEX_KEY_PART_SEPARATOR}${VERTEX_KEY_LEAF_MARKER}`;
      const result = parseVertexKey(key);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        service: 'serviceA',
        operation: 'opA',
        isLeaf: false,
      });
      expect(result[1]).toEqual({
        service: 'serviceB',
        operation: 'opB',
        isLeaf: true,
      });
    });

    it('should handle empty string', () => {
      const result = parseVertexKey('');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        service: '',
        operation: '',
        isLeaf: false,
      });
    });
  });

  describe('getLeafPart', () => {
    it('should return the leaf part of a hierarchical key', () => {
      const key = `serviceA${VERTEX_KEY_PART_SEPARATOR}opA${VERTEX_KEY_PATH_SEPARATOR}serviceB${VERTEX_KEY_PART_SEPARATOR}opB${VERTEX_KEY_PART_SEPARATOR}${VERTEX_KEY_LEAF_MARKER}`;
      const result = getLeafPart(key);

      expect(result).toEqual({
        service: 'serviceB',
        operation: 'opB',
        isLeaf: true,
      });
    });

    it('should return the only part for a simple key', () => {
      const key = `service1${VERTEX_KEY_PART_SEPARATOR}op1`;
      const result = getLeafPart(key);

      expect(result).toEqual({
        service: 'service1',
        operation: 'op1',
        isLeaf: false,
      });
    });

    it('should handle empty string', () => {
      const result = getLeafPart('');

      expect(result).toEqual({
        service: '',
        operation: '',
        isLeaf: false,
      });
    });
  });

  describe('vertexKeyMatches', () => {
    const key = `serviceA${VERTEX_KEY_PART_SEPARATOR}opA${VERTEX_KEY_PATH_SEPARATOR}serviceB${VERTEX_KEY_PART_SEPARATOR}opB${VERTEX_KEY_PART_SEPARATOR}${VERTEX_KEY_LEAF_MARKER}`;

    it('should match by service name', () => {
      expect(vertexKeyMatches(key, 'serviceB')).toBe(true);
      expect(vertexKeyMatches(key, 'serviceA')).toBe(false); // Only matches leaf
      expect(vertexKeyMatches(key, 'serviceC')).toBe(false);
    });

    it('should match by operation name', () => {
      expect(vertexKeyMatches(key, undefined, 'opB')).toBe(true);
      expect(vertexKeyMatches(key, undefined, 'opA')).toBe(false); // Only matches leaf
      expect(vertexKeyMatches(key, undefined, 'opC')).toBe(false);
    });

    it('should match by both service and operation', () => {
      expect(vertexKeyMatches(key, 'serviceB', 'opB')).toBe(true);
      expect(vertexKeyMatches(key, 'serviceB', 'opA')).toBe(false);
      expect(vertexKeyMatches(key, 'serviceA', 'opB')).toBe(false);
    });

    it('should match with partial strings', () => {
      expect(vertexKeyMatches(key, 'vice')).toBe(true); // Contains "vice"
      expect(vertexKeyMatches(key, undefined, 'B')).toBe(true); // Contains "B"
    });

    it('should return true when no criteria specified', () => {
      expect(vertexKeyMatches(key)).toBe(true);
    });
  });
});
