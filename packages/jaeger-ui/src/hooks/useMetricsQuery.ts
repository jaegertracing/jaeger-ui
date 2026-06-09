// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import JaegerAPI from '../api/jaeger';
import type { ApiError } from '../types/api-error';
import type {
  FetchAggregatedServiceMetricsResponse,
  FetchedAllServiceMetricsResponse,
  MetricObject,
  MetricPointObject,
  MetricsAPIQueryParams,
  OpsDataPoints,
  PromiseRejectedResult,
  ServiceMetrics,
  ServiceMetricsObject,
  ServiceOpsMetrics,
} from '../types/metrics';

export type MetricsHookParams = Omit<MetricsAPIQueryParams, 'endTs'>;

// Module-private query keys
function serviceMetricsQueryKey(
  serviceName: string | undefined,
  params: MetricsHookParams
): readonly ['serviceMetrics', string | undefined, MetricsHookParams] {
  return ['serviceMetrics', serviceName, params] as const;
}

function operationMetricsQueryKey(
  serviceName: string | undefined,
  params: MetricsHookParams
): readonly ['operationMetrics', string | undefined, MetricsHookParams] {
  return ['operationMetrics', serviceName, params] as const;
}

// Transformation helpers (extracted from src/reducers/metrics.ts)
export type ServiceMetricsResult = {
  serviceMetrics: ServiceMetrics;
  serviceError: {
    service_latencies_50: null | ApiError;
    service_latencies_75: null | ApiError;
    service_latencies_95: null | ApiError;
    service_call_rate: null | ApiError;
    service_error_rate: null | ApiError;
  };
};

export type OperationMetricsResult = {
  serviceOpsMetrics: ServiceOpsMetrics[] | undefined;
  opsError: {
    opsLatencies: null | ApiError;
    opsCalls: null | ApiError;
    opsErrors: null | ApiError;
  };
};

function parseMetricPoints(rawPoints: MetricPointObject[]): { x: number; y: number | null }[] {
  return rawPoints.map(p => {
    let y: number | null;
    try {
      y = parseFloat(p.gaugeValue.doubleValue.toFixed(2));
      if (Number.isNaN(y)) y = null;
    } catch {
      y = null;
    }
    return { x: new Date(p.timestamp).getTime(), y };
  });
}

export function transformServiceMetrics(payload: FetchedAllServiceMetricsResponse): ServiceMetricsResult {
  const serviceMetrics: ServiceMetrics = {
    service_latencies: null,
    service_call_rate: null,
    service_error_rate: null,
  };
  const serviceError: ServiceMetricsResult['serviceError'] = {
    service_latencies_50: null,
    service_latencies_75: null,
    service_latencies_95: null,
    service_call_rate: null,
    service_error_rate: null,
  };

  payload.forEach((promiseResult, i) => {
    if (promiseResult.status === 'fulfilled') {
      const metrics = promiseResult.value;
      if (metrics.metrics[0]) {
        const metricPoints = parseMetricPoints(metrics.metrics[0].metricPoints);
        const max = metricPoints.reduce((m, p) => (p.y !== null && p.y > m ? p.y : m), 0);
        const metric: ServiceMetricsObject = {
          serviceName: metrics.metrics[0].labels[0].value,
          quantile: metrics.quantile,
          max,
          metricPoints,
        };
        if (metrics.name === 'service_latencies') {
          if (serviceMetrics[metrics.name] === null) {
            serviceMetrics[metrics.name] = [];
          }
          serviceMetrics[metrics.name]!.push(metric);
        } else {
          serviceMetrics[metrics.name] = metric;
        }
      }
    } else {
      const reason = (promiseResult as PromiseRejectedResult).reason;
      switch (i) {
        case 0:
          serviceError.service_latencies_50 = reason;
          break;
        case 1:
          serviceError.service_latencies_75 = reason;
          break;
        case 2:
          serviceError.service_latencies_95 = reason;
          break;
        case 3:
          serviceError.service_call_rate = reason;
          break;
        case 4:
          serviceError.service_error_rate = reason;
          break;
      }
    }
  });

  return { serviceMetrics, serviceError };
}

export function transformOperationMetrics(
  payload: FetchAggregatedServiceMetricsResponse
): OperationMetricsResult {
  const opsError: OperationMetricsResult['opsError'] = {
    opsLatencies: null,
    opsCalls: null,
    opsErrors: null,
  };

  type OpsMap = Record<string, { name: string; metricPoints: OpsDataPoints }>;
  let opsMetrics: OpsMap | null = null;

  payload.forEach((promiseResult, i) => {
    if (promiseResult.status === 'fulfilled') {
      const metric = promiseResult.value;
      if (metric.metrics && Array.isArray(metric.metrics)) {
        metric.metrics.forEach((metricDetails: MetricObject) => {
          if (opsMetrics === null) opsMetrics = {};

          let opsName: string | null = null;
          const avg = {
            service_operation_latencies: 0,
            service_operation_call_rate: 0,
            service_operation_error_rate: 0,
          };
          const count = {
            service_operation_latencies: 0,
            service_operation_call_rate: 0,
            service_operation_error_rate: 0,
          };

          metricDetails.labels.forEach(label => {
            if (label.name === 'operation') opsName = label.value;
          });

          if (opsName) {
            if (opsMetrics![opsName] === undefined) {
              opsMetrics![opsName] = {
                name: opsName,
                metricPoints: {
                  service_operation_latencies: [],
                  service_operation_call_rate: [],
                  service_operation_error_rate: [],
                  avg: {
                    service_operation_latencies: null,
                    service_operation_call_rate: null,
                    service_operation_error_rate: null,
                  },
                },
              };
            }

            opsMetrics![opsName].metricPoints[metric.name] = parseMetricPoints(
              metricDetails.metricPoints
            ).map(point => {
              if (point.y !== null) {
                avg[metric.name] += point.y;
                count[metric.name] += 1;
              }
              return point;
            });

            opsMetrics![opsName].metricPoints.avg[metric.name] =
              count[metric.name] > 0 ? parseFloat((avg[metric.name] / count[metric.name]).toFixed(2)) : null;
          }
        });
      }
    } else {
      switch (i) {
        case 0:
          opsError.opsLatencies = (promiseResult as PromiseRejectedResult).reason;
          break;
        case 1:
          opsError.opsCalls = (promiseResult as PromiseRejectedResult).reason;
          break;
        case 2:
          opsError.opsErrors = (promiseResult as PromiseRejectedResult).reason;
          break;
      }
    }
  });

  let serviceOpsMetrics: ServiceOpsMetrics[] | undefined;

  if (opsMetrics) {
    const minMax = { min: 0, max: 0 };
    serviceOpsMetrics = Object.keys(opsMetrics).map((operationName, i) => {
      const op = opsMetrics![operationName];
      let impact = 0;
      if (
        op.metricPoints.avg.service_operation_latencies !== null &&
        op.metricPoints.avg.service_operation_call_rate !== null
      ) {
        impact =
          (op.metricPoints.avg.service_operation_latencies! *
            op.metricPoints.avg.service_operation_call_rate!) /
          100;
      }
      if (i === 0) {
        minMax.max = impact;
        minMax.min = impact;
      } else {
        minMax.max = minMax.max < impact ? impact : minMax.max;
        minMax.min = minMax.min > impact ? impact : minMax.min;
      }
      return {
        key: i,
        name: op.name,
        latency: op.metricPoints.avg.service_operation_latencies || 0,
        requests: op.metricPoints.avg.service_operation_call_rate || 0,
        errRates: op.metricPoints.avg.service_operation_error_rate || 0,
        impact,
        dataPoints: op.metricPoints,
      };
    });

    if (serviceOpsMetrics.length === 1) {
      serviceOpsMetrics[0].impact = 1;
    } else if (serviceOpsMetrics.length > 1) {
      serviceOpsMetrics.forEach((v, i) => {
        serviceOpsMetrics![i].impact =
          minMax.max - minMax.min === 0 ? 0 : (v.impact - minMax.min) / (minMax.max - minMax.min);
      });
    }
  }

  return { serviceOpsMetrics, opsError };
}

// Hooks

/**
 * Fetches service-level latency, error-rate, and call-rate metrics
 * (`Promise.allSettled` across 5 `GET /api/metrics/*` calls).
 *
 * `endTs` is resolved to `Date.now()` inside `queryFn`
 */
export function useServiceMetricsQuery(
  serviceName: string | undefined,
  params: MetricsHookParams | undefined
): UseQueryResult<ServiceMetricsResult, ApiError> {
  return useQuery({
    queryKey: params
      ? serviceMetricsQueryKey(serviceName, params)
      : (['serviceMetrics', 'disabled'] as const),
    queryFn: async () => {
      const endTs = Date.now();
      const payload = (await Promise.allSettled([
        JaegerAPI.fetchMetrics('latencies', [serviceName!], { ...params!, quantile: 0.5, endTs }),
        JaegerAPI.fetchMetrics('latencies', [serviceName!], { ...params!, quantile: 0.75, endTs }),
        JaegerAPI.fetchMetrics('latencies', [serviceName!], { ...params!, endTs }),
        JaegerAPI.fetchMetrics('calls', [serviceName!], { ...params!, endTs }),
        JaegerAPI.fetchMetrics('errors', [serviceName!], { ...params!, endTs }),
      ])) as FetchedAllServiceMetricsResponse;
      return transformServiceMetrics(payload);
    },
    enabled: Boolean(serviceName && params),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetches per-operation latency, call-rate, and error-rate metrics
 * (`Promise.allSettled` across 3 `GET /api/metrics/*` calls with `groupByOperation=true`).
 *
 * `endTs` is resolved to `Date.now()` inside `queryFn`
 */
export function useOperationMetricsQuery(
  serviceName: string | undefined,
  params: MetricsHookParams | undefined
): UseQueryResult<OperationMetricsResult, ApiError> {
  return useQuery({
    queryKey: params
      ? operationMetricsQueryKey(serviceName, params)
      : (['operationMetrics', 'disabled'] as const),
    queryFn: async () => {
      const endTs = Date.now();
      const query = { ...params!, groupByOperation: true, endTs };
      const payload = (await Promise.allSettled([
        JaegerAPI.fetchMetrics('latencies', [serviceName!], { ...query }),
        JaegerAPI.fetchMetrics('calls', [serviceName!], { ...query }),
        JaegerAPI.fetchMetrics('errors', [serviceName!], { ...query }),
      ])) as FetchAggregatedServiceMetricsResponse;
      return transformOperationMetrics(payload);
    },
    enabled: Boolean(serviceName && params),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
