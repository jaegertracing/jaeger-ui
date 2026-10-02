// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatShortTraceId, getTraceComparisonLabel } from './trace-comparison';
import getConfig from '../../../utils/config/get-config';
import type { Config } from '../../../types/config';

vi.mock('../../../utils/config/get-config');

describe('trace-comparison', () => {
  beforeEach(() => {
    vi.mocked(getConfig).mockReturnValue({ traceIdDisplayLength: 7 } as unknown as Config);
  });

  describe('formatShortTraceId', () => {
    it('returns empty string if traceId is empty', () => {
      expect(formatShortTraceId('')).toBe('');
    });

    it('slices traceId to 7 characters by default', () => {
      expect(formatShortTraceId('1234567890abcdef1234567890abcdef')).toBe('1234567');
    });

    it('handles trace IDs shorter than the display length', () => {
      expect(formatShortTraceId('abc')).toBe('abc');
    });

    it('respects configured traceIdDisplayLength', () => {
      vi.mocked(getConfig).mockReturnValue({ traceIdDisplayLength: 10 } as unknown as Config);
      expect(formatShortTraceId('1234567890abcdef')).toBe('1234567890');
    });
  });

  describe('getTraceComparisonLabel', () => {
    it('uses traceName when provided', () => {
      expect(getTraceComparisonLabel('1234567890abcdef', 'frontend: GET /api')).toBe(
        'Select trace frontend: GET /api for comparison'
      );
    });

    it('falls back to short trace ID when traceName is undefined', () => {
      expect(getTraceComparisonLabel('1234567890abcdef')).toBe('Select trace 1234567 for comparison');
    });

    it('falls back to short trace ID when traceName is empty string', () => {
      expect(getTraceComparisonLabel('1234567890abcdef', '')).toBe('Select trace 1234567 for comparison');
    });

    it('falls back to short trace ID when traceName is null', () => {
      expect(getTraceComparisonLabel('1234567890abcdef', null)).toBe('Select trace 1234567 for comparison');
    });

    it('handles short trace ID in fallback', () => {
      expect(getTraceComparisonLabel('a', '')).toBe('Select trace a for comparison');
    });
  });
});
