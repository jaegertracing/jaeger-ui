// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { isTraceIdLookupQuery } from './jaegerOmnibox';

describe('isTraceIdLookupQuery', () => {
  it('returns false for empty or whitespace', () => {
    expect(isTraceIdLookupQuery('')).toBe(false);
    expect(isTraceIdLookupQuery('   ')).toBe(false);
  });

  it('returns true for a single hex trace id (8–32 chars)', () => {
    expect(isTraceIdLookupQuery('abcdef12')).toBe(true);
    expect(isTraceIdLookupQuery('ABCDEF12')).toBe(true);
    expect(isTraceIdLookupQuery('a1b2c3d4e5f6789012345678abcdef')).toBe(true);
  });

  it('returns false for hex segment shorter than 8 or longer than 32', () => {
    expect(isTraceIdLookupQuery('abcdef1')).toBe(false);
    expect(isTraceIdLookupQuery(`${'a'.repeat(33)}`)).toBe(false);
  });

  it('returns false for non-hex single segment', () => {
    expect(isTraceIdLookupQuery('why is my span slow')).toBe(false);
    expect(isTraceIdLookupQuery('trace-id-with-dashes')).toBe(false);
  });

  it('returns true for compare pattern id...id when both sides are valid hex', () => {
    expect(isTraceIdLookupQuery('abcd1234...abcd5678')).toBe(true);
  });

  it('returns false for compare pattern with wrong number of segments', () => {
    expect(isTraceIdLookupQuery('a...b...c')).toBe(false);
    expect(isTraceIdLookupQuery('...')).toBe(false);
  });

  it('returns false for compare pattern with empty side', () => {
    expect(isTraceIdLookupQuery('abcd1234...')).toBe(false);
    expect(isTraceIdLookupQuery('...abcd1234')).toBe(false);
  });

  it('returns false for compare pattern with invalid hex', () => {
    expect(isTraceIdLookupQuery('zzzz1234...abcd5678')).toBe(false);
    expect(isTraceIdLookupQuery('abcd1234...zzzz5678')).toBe(false);
  });
});
