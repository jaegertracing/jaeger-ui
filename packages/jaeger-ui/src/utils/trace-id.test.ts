// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { looksLikeTraceId } from './trace-id';

describe('looksLikeTraceId', () => {
  it('accepts 32-char lowercase hex', () => {
    expect(looksLikeTraceId('b36de06c5972ab071ac119c504ca07dc')).toBe(true);
  });

  it('accepts 16-char hex', () => {
    expect(looksLikeTraceId('a1b2c3d4e5f67890')).toBe(true);
  });

  it('accepts 32-char uppercase hex', () => {
    expect(looksLikeTraceId('B36DE06C5972AB071AC119C504CA07DC')).toBe(true);
  });

  it('accepts base64-encoded trace ID (with padding)', () => {
    expect(looksLikeTraceId('s23gbclyqrBxrBGcUEygfA==')).toBe(true);
  });

  it('accepts base64-encoded trace ID (without padding)', () => {
    expect(looksLikeTraceId('s23gbclyqrBxrBGcUEygfA')).toBe(true);
  });

  it('accepts base64 with + and / characters', () => {
    expect(looksLikeTraceId('abc+def/ghijklmnop==')).toBe(true);
  });

  it('rejects natural language (contains spaces)', () => {
    expect(looksLikeTraceId('What is a trace?')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(looksLikeTraceId('')).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    expect(looksLikeTraceId('   ')).toBe(false);
  });

  it('rejects short strings', () => {
    expect(looksLikeTraceId('abc')).toBe(false);
  });

  it('trims whitespace before checking', () => {
    expect(looksLikeTraceId('  b36de06c5972ab071ac119c504ca07dc  ')).toBe(true);
  });
});
