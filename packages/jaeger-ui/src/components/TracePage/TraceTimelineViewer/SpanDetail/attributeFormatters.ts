// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { AttributeValue } from '../../../../../types/otel';

/**
 * Formats an AttributeValue for display in the summary/collapsed view.
 * Returns a human-readable preview for complex types.
 */
export function formatAttributeSummary(value: AttributeValue): string {
  if (Array.isArray(value)) {
    return `[${value.length} item${value.length !== 1 ? 's' : ''}]`;
  }
  if (typeof value === 'object' && value !== null) {
    if (value instanceof Uint8Array) {
      return `<Uint8Array[${value.length}]>`;
    }
    return '{...}';
  }
  // Primitive values: string, number, boolean
  return String(value);
}

/**
 * Formats an AttributeValue for copying to clipboard.
 * Returns the actual value as a string (JSON for complex types).
 */
export function formatAttributeForCopy(value: AttributeValue): string {
  if (Array.isArray(value) || (typeof value === 'object' && value !== null && !(value instanceof Uint8Array))) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  if (value instanceof Uint8Array) {
    try {
      return JSON.stringify(Array.from(value), null, 2);
    } catch {
      return `<Uint8Array[${value.length}]>`;
    }
  }
  // Primitive values: string, number, boolean
  return String(value);
}

/**
 * Checks if a value is a complex type (array or object) that needs special handling.
 */
export function isComplexAttributeValue(value: AttributeValue): boolean {
  return Array.isArray(value) || (typeof value === 'object' && value !== null);
}
