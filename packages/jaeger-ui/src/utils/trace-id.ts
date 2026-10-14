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

/** Converts supported URL aliases to the v3 request format; the client validates the result. */
export function toTraceIdHex(value: string): string {
  const v = value.trim();
  if (HEX_16_OR_32_RE.test(v)) return v.padStart(32, '0');
  try {
    const bytes = atob(v.replace(/-/g, '+').replace(/_/g, '/'));
    if (bytes.length >= MIN_TRACE_ID_BYTES && bytes.length <= 16) {
      return Array.from(bytes, byte => byte.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
        .padStart(32, '0');
    }
  } catch {
    // Leave unsupported IDs for the client's request validation.
  }
  return v;
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
