// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

const SHORT_SHA_LENGTH = 7;

// Matches a full 40-character git SHA that stands on its own as a "word", so a
// value like `myorg/920680f404d1002529ddfd0a39b0f70c8265e50a` keeps its prefix
// and only the hash is abbreviated, while non-hash values are untouched.
const FULL_SHA_RE = /\b[0-9a-f]{40}\b/gi;

/**
 * Abbreviate any full 40-character git SHA embedded in `gitCommit` to its
 * conventional 7-character short form, leaving surrounding text (e.g. an
 * internal prefix) intact. Values without a full SHA are returned unchanged.
 */
export default function shortenCommit(gitCommit: string): string {
  return gitCommit.replace(FULL_SHA_RE, sha => sha.substring(0, SHORT_SHA_LENGTH));
}
