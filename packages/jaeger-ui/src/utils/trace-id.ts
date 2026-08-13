// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

const HEX_16_OR_32_RE = /^[0-9a-fA-F]{16,32}$/;

const MIN_TRACE_ID_BYTES = 8;

// atob uses "forgiving base64 decode" (HTML spec) which handles unpadded input.
function isValidBase64(v: string): boolean {
  try {
    return atob(v.replace(/-/g, '+').replace(/_/g, '/')).length >= MIN_TRACE_ID_BYTES;
  } catch {
    return false;
  }
}

/**
 * Returns true when the string looks like a trace ID (hex or base64 encoded),
 * as opposed to a natural-language question or search query.
 */
export function looksLikeTraceId(value: string): boolean {
  const v = value.trim();
  if (!v || v.includes(' ')) return false;
  return HEX_16_OR_32_RE.test(v) || isValidBase64(v);
}
