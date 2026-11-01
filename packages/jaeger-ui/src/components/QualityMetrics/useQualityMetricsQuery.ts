// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { skipToken, useQuery, UseQueryResult } from '@tanstack/react-query';

import { jaegerClient } from '../../api/v3/client';
import type { ApiError } from '../../types/api-error';
import type { TQualityMetrics } from './types';

// Keying on service and lookback lets React Query cancel a request the page no longer
// shows, so a late response for a previous selection never replaces the current one.
export function useQualityMetricsQuery(
  service: string | undefined,
  lookback: number
): UseQueryResult<TQualityMetrics, ApiError> {
  return useQuery({
    queryKey: ['qualityMetrics', service, lookback],
    queryFn: service
      ? async ({ signal }) =>
          (await jaegerClient.fetchQualityMetrics(service, lookback, signal)) as TQualityMetrics
      : skipToken,
  });
}
