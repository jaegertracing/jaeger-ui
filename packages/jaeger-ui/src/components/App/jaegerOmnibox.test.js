// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { isCompareTraceRouteId, isTraceIdLookupQuery } from './jaegerOmnibox';

describe('isTraceIdLookupQuery', () => {
  it('returns false for empty or whitespace', () => {
    expect(isTraceIdLookupQuery('')).toBe(false);
    expect(isTraceIdLookupQuery('   ')).toBe(false);
  });

  it('returns true for a single hex trace id (1–32 chars, incl. short/partial)', () => {
    expect(isTraceIdLookupQuery('a')).toBe(true);
    expect(isTraceIdLookupQuery('abc123')).toBe(true);
    expect(isTraceIdLookupQuery('abcdef12')).toBe(true);
    expect(isTraceIdLookupQuery('ABCDEF12')).toBe(true);
    expect(isTraceIdLookupQuery('a1b2c3d4e5f6789012345678abcdef')).toBe(true);
  });

  it('returns false for hex segment longer than 32', () => {
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

describe('isCompareTraceRouteId', () => {
  it('returns true for a valid compare :id segment', () => {
    expect(isCompareTraceRouteId('76f3d9a7eb1d924e5a9a1a0774be2c4c...39412b1dd0e6b5df4a19e14584e52286')).toBe(
      true
    );
  });

  it('returns false for multiple ... segments', () => {
    expect(isCompareTraceRouteId('a1b2c3d4...b2c3d4e5...c3d4e5f6')).toBe(false);
  });

  it('returns false for a single trace id without ...', () => {
    expect(isCompareTraceRouteId('a1b2c3d4e5f67890')).toBe(false);
  });
});
