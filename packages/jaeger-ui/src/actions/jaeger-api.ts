// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createAction } from 'redux-actions';
import JaegerAPI from '../api/jaeger';

const metricType = {
  latencies: 'latencies',
  calls: 'calls',
  errors: 'errors',
};

export const fetchTrace = createAction(
  '@JAEGER_API/FETCH_TRACE',
  id => JaegerAPI.fetchTrace(id),
  id => ({ id })
);

export const fetchMultipleTraces = createAction(
  '@JAEGER_API/FETCH_MULTIPLE_TRACES',
  ids => JaegerAPI.searchTraces({ traceID: ids }),
  ids => ({ ids })
);

export const archiveTrace = createAction(
  '@JAEGER_API/ARCHIVE_TRACE',
  id => JaegerAPI.archiveTrace(id),
  id => ({ id })
);

export const searchTraces = createAction(
  '@JAEGER_API/SEARCH_TRACES',
  query => JaegerAPI.searchTraces(query),
  query => ({ query })
);

export const fetchServices = createAction('@JAEGER_API/FETCH_SERVICES', () => JaegerAPI.fetchServices());

export const fetchServiceOperations = createAction(
  '@JAEGER_API/FETCH_SERVICE_OPERATIONS',
  serviceName => JaegerAPI.fetchServiceOperations(serviceName),
  serviceName => ({ serviceName })
);

export const fetchServiceServerOps = createAction(
  '@JAEGER_API/FETCH_SERVICE_SERVER_OP',
  serviceName => JaegerAPI.fetchServiceServerOps(serviceName),
  serviceName => ({ serviceName })
);

export const fetchDeepDependencyGraph = createAction(
  '@JAEGER_API/FETCH_DEEP_DEPENDENCY_GRAPH',
  query => JaegerAPI.fetchDeepDependencyGraph(query),
  query => ({ query })
);

export const fetchDependencies = createAction('@JAEGER_API/FETCH_DEPENDENCIES', () =>
  JaegerAPI.fetchDependencies()
);

export const fetchAllServiceMetrics = createAction(
  '@JAEGER_API/FETCH_ALL_SERVICE_METRICS',
  (serviceName, query) => {
    return Promise.allSettled([
      JaegerAPI.fetchMetrics(metricType.latencies, [serviceName], { ...query, quantile: 0.5 }),
      JaegerAPI.fetchMetrics(metricType.latencies, [serviceName], { ...query, quantile: 0.75 }),
      JaegerAPI.fetchMetrics(metricType.latencies, [serviceName], query),
      JaegerAPI.fetchMetrics(metricType.calls, [serviceName], query),
      JaegerAPI.fetchMetrics(metricType.errors, [serviceName], query),
    ]);
  }
);

export const fetchAggregatedServiceMetrics = createAction(
  '@JAEGER_API/FETCH_AGGREGATED_SERVICE_METRICS',
  (serviceName, queryParams) => {
    const query = { ...queryParams, groupByOperation: true };
    return Promise.allSettled([
      JaegerAPI.fetchMetrics(metricType.latencies, [serviceName], query),
      JaegerAPI.fetchMetrics(metricType.calls, [serviceName], query),
      JaegerAPI.fetchMetrics(metricType.errors, [serviceName], query),
    ]);
  }
);
