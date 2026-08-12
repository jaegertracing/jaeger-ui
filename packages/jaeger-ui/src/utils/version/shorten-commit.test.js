// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import shortenCommit from './shorten-commit';

describe('shortenCommit', () => {
  it('abbreviates a bare 40-char SHA to 7 chars', () => {
    expect(shortenCommit('920680f404d1002529ddfd0a39b0f70c8265e50a')).toBe('920680f');
  });

  it('keeps a non-hash prefix and only shortens the SHA', () => {
    expect(shortenCommit('myorg/920680f404d1002529ddfd0a39b0f70c8265e50a')).toBe('myorg/920680f');
  });

  it('is case-insensitive for hex digits', () => {
    expect(shortenCommit('920680F404D1002529DDFD0A39B0F70C8265E50A')).toBe('920680F');
  });

  it('leaves an already-short commit unchanged', () => {
    expect(shortenCommit('920680f')).toBe('920680f');
  });

  it('leaves a non-hash value unchanged', () => {
    expect(shortenCommit('myorg')).toBe('myorg');
  });

  it('leaves an empty string unchanged', () => {
    expect(shortenCommit('')).toBe('');
  });

  it('does not shorten a hex run longer than 40 chars', () => {
    const tooLong = `${'920680f404d1002529ddfd0a39b0f70c8265e50a'}0`;
    expect(shortenCommit(tooLong)).toBe(tooLong);
  });

  it('does not shorten a hex run shorter than 40 chars', () => {
    expect(shortenCommit('920680f404d1002529ddfd0a39b0f70c8265e50')).toBe(
      '920680f404d1002529ddfd0a39b0f70c8265e50'
    );
  });
});
