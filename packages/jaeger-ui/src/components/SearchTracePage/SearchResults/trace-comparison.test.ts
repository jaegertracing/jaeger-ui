// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vite-plus/test';
import { getTraceComparisonLabel } from './trace-comparison';

describe('trace-comparison', () => {
  describe('getTraceComparisonLabel', () => {
    it('uses traceName when provided', () => {
      expect(getTraceComparisonLabel('1234567890abcdef', 'frontend: GET /api')).toBe(
        'Select trace frontend: GET /api for comparison'
      );
    });

    it('falls back to trace ID when traceName is undefined', () => {
      expect(getTraceComparisonLabel('1234567890abcdef')).toBe(
        'Select trace 1234567890abcdef for comparison'
      );
    });

    it('falls back to trace ID when traceName is empty string', () => {
      expect(getTraceComparisonLabel('1234567890abcdef', '')).toBe(
        'Select trace 1234567890abcdef for comparison'
      );
    });

    it('falls back to trace ID when traceName is null', () => {
      expect(getTraceComparisonLabel('1234567890abcdef', null)).toBe(
        'Select trace 1234567890abcdef for comparison'
      );
    });
  });
});
