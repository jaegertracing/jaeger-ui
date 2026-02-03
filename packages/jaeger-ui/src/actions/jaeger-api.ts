// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createAction } from 'redux-actions';
import JaegerAPI from '../api/jaeger';

const metricType: Record<string, string> = {
  latencies: 'latencies',
  calls: 'calls',
  errors: 'errors',
};

export const fetchTrace = createAction(
  '@JAEGER_API/FETCH_TRACE',
  (id: string) => JaegerAPI.fetchTrace(id),
  (id: string) => ({ id })
);

export const fetchMultipleTraces = createAction(
  '@JAEGER_API/FETCH_MULTIPLE_TRACES',
  (ids: string[]) => JaegerAPI.searchTraces({ traceID: ids }),
  (ids: string[]) => ({ ids })
);

export const archiveTrace = createAction(
  '@JAEGER_API/ARCHIVE_TRACE',
  (id: string) => JaegerAPI.archiveTrace(id),
  (id: string) => ({ id })
);

export const searchTraces = createAction(
  '@JAEGER_API/SEARCH_TRACES',
  (query: Record<string, any>) => JaegerAPI.searchTraces(query),
  (query: Record<string, any>) => ({ query })
);

export const fetchDeepDependencyGraph = createAction(
  '@JAEGER_API/FETCH_DEEP_DEPENDENCY_GRAPH',
  (query: Record<string, any>) => JaegerAPI.fetchDeepDependencyGraph(query),
  (query: Record<string, any>) => ({ query })
);

export const fetchDependencies = createAction('@JAEGER_API/FETCH_DEPENDENCIES', () =>
  JaegerAPI.fetchDependencies()
);

export const fetchAllServiceMetrics = createAction(
  '@JAEGER_API/FETCH_ALL_SERVICE_METRICS',
  (serviceName?: string, query?: Record<string, any>) => {
    return Promise.allSettled([
      JaegerAPI.fetchMetrics(metricType.latencies, [serviceName!], { ...query, quantile: 0.5 }),
      JaegerAPI.fetchMetrics(metricType.latencies, [serviceName!], { ...query, quantile: 0.75 }),
      JaegerAPI.fetchMetrics(metricType.latencies, [serviceName!], { ...query }),
      JaegerAPI.fetchMetrics(metricType.calls, [serviceName!], { ...query }),
      JaegerAPI.fetchMetrics(metricType.errors, [serviceName!], { ...query }),
    ]);
  }
);

export const fetchAggregatedServiceMetrics = createAction(
  '@JAEGER_API/FETCH_AGGREGATED_SERVICE_METRICS',
  (serviceName?: string, queryParams?: Record<string, any>) => {
    const query = { ...queryParams, groupByOperation: true };
    return Promise.allSettled([
      JaegerAPI.fetchMetrics(metricType.latencies, [serviceName!], { ...query }),
      JaegerAPI.fetchMetrics(metricType.calls, [serviceName!], { ...query }),
      JaegerAPI.fetchMetrics(metricType.errors, [serviceName!], { ...query }),
    ]);
  }
);
