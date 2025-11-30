// Copyright (c) 2024 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Normalize trace ID to 16-character zero-padded hexadecimal string.
 *
 * Interface Definition Language (jaeger-idl/model/v1/ids.go) always zero-pads trace IDs to
 * 16 or 32 hex characters when serializing, but accepts shorter IDs when parsing.
 *
 * @param traceId - Trace ID to normalize
 * @returns 16-character zero-padded hex string, or original if invalid
 *
 * @example
 * normalizeTraceId('1') // '0000000000000001'
 * normalizeTraceId('xyz') // '0000000000000abc'
 * normalizeTraceId('abcd1234') // 'abcd1234'
 * normalizeTraceId('1234567890abcdef1234') // '1234567890abcdef1234'
 */
export function normalizeTraceId(traceId: string): string {
  if (typeof traceId !== 'string' || traceId.length === 0) {
    return traceId;
  }

  // Remove any non-hex characters and convert to lowercase
  const cleaned = traceId.toLowerCase().replace(/[^0-9a-f]/g, '');

  // Return original if empty or too long
  if (cleaned.length === 0 || cleaned.length > 32) {
    return traceId;
  }

  // Pad to 16 characters (64 bits)
  return cleaned.padStart(16, '0');
}
