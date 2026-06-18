// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

const HEX_16_OR_32_RE = /^[0-9a-fA-F]{16,32}$/;
const BASE64_RE = /^[A-Za-z0-9+/]{16,}={0,2}$/;

/**
 * Returns true when the string looks like a trace ID (hex or base64 encoded),
 * as opposed to a natural-language question or search query.
 */
export function looksLikeTraceId(value: string): boolean {
  const v = value.trim();
  if (!v || v.includes(' ')) return false;
  if (HEX_16_OR_32_RE.test(v)) return true;
  if (BASE64_RE.test(v)) return true;
  return false;
}
