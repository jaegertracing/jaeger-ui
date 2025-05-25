// Copyright (c) 2023 The Jaeger Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { fetchedState } from '../../constants';
import { EViewModifier } from '../../model/ddg/types';
import { ApiError } from '../../types/api-error';
import { EmbeddedState } from '../../types/embedded';
import { MetricsReduxState } from '../../types/metrics';
import { Trace } from '../../types/trace';

/**
 * Factory for generating Redux state data to be used in unit tests.
 * This helps ensure tests use consistent state data that matches the actual Redux state shape.
 */

// Default config state
export const configDefaults = {
  archiveEnabled: false,
  dependencies: {
    dagMaxNumServices: 100,
    menuEnabled: true,
  },
  menu: [
    {
      label: 'About Jaeger',
      items: [
        {
          label: 'GitHub',
          url: 'https://github.com/jaegertracing/jaeger',
        },
        {
          label: 'Docs',
          url: 'https://www.jaegertracing.io/docs/latest',
        },
      ],
    },
  ],
  search: {
    maxLookback: {
      label: '2 Days',
      value: '2d',
    },
    maxLimit: 1500,
  },
  tracking: {
    gaID: null,
    trackErrors: true,
  },
};

// Default trace state
export const traceDefaults = {
  traces: {},
  search: {
    query: null,
    results: [],
  },
};

// Default services state
export const servicesDefaults = {
  error: null,
  loading: false,
  operationsForService: {},
  serverOpsForService: {},
  services: null,
};

// Default dependencies state
export const dependenciesDefaults = {
  dependencies: [],
  loading: false,
  error: null,
};

// Default ddg state
export const ddgDefaults = {};

// Default embedded state
export const embeddedDefaults = null;

// Default metrics state
export const metricsDefaults: MetricsReduxState = {
  serviceError: {
    service_latencies_50: null,
    service_latencies_75: null,
    service_latencies_95: null,
    service_call_rate: null,
    service_error_rate: null,
  },
  opsError: {
    opsLatencies: null,
    opsCalls: null,
    opsErrors: null,
  },
  isATMActivated: null,
  loading: false,
  operationMetricsLoading: undefined,
  serviceMetrics: null,
  serviceOpsMetrics: undefined,
};

// Default path agnostic decorations state
export const pathAgnosticDecorationsDefaults = {};

/**
 * Creates a trace object with the given ID and optional overrides
 */
export function createTrace(traceID: string, overrides: Partial<Trace> = {}): Trace {
  const defaultTrace: Trace = {
    traceID,
    processes: {},
    duration: 1000000,
    startTime: 1585244579920000,
    endTime: 1585244580920000,
    spans: [],
    traceName: 'test-trace',
    tracePageTitle: 'test-trace',
    traceEmoji: '🔍',
    services: [],
  };

  return { ...defaultTrace, ...overrides };
}

/**
 * Creates a trace state entry with the given ID and state
 */
export function createTraceState(
  id: string,
  state: typeof fetchedState.LOADING | typeof fetchedState.ERROR | typeof fetchedState.DONE,
  data?: Trace,
  error?: Error
) {
  if (state === fetchedState.LOADING) {
    return { id, state };
  }
  if (state === fetchedState.ERROR) {
    return { id, state, error: error || new Error('Unknown error') };
  }
  return { id, state, data };
}

/**
 * Creates a complete Redux state object with optional overrides for each slice
 */
export function createState(overrides: {
  config?: typeof configDefaults;
  trace?: typeof traceDefaults;
  services?: typeof servicesDefaults;
  dependencies?: typeof dependenciesDefaults;
  ddg?: Record<string, any>;
  embedded?: EmbeddedState;
  metrics?: MetricsReduxState;
  pathAgnosticDecorations?: Record<string, any>;
} = {}) {
  return {
    config: { ...configDefaults, ...(overrides.config || {}) },
    trace: { ...traceDefaults, ...(overrides.trace || {}) },
    services: { ...servicesDefaults, ...(overrides.services || {}) },
    dependencies: { ...dependenciesDefaults, ...(overrides.dependencies || {}) },
    ddg: { ...ddgDefaults, ...(overrides.ddg || {}) },
    embedded: overrides.embedded !== undefined ? overrides.embedded : embeddedDefaults,
    metrics: { ...metricsDefaults, ...(overrides.metrics || {}) },
    pathAgnosticDecorations: { ...pathAgnosticDecorationsDefaults, ...(overrides.pathAgnosticDecorations || {}) },
  };
}

/**
 * Creates a services state with the given services and operations
 */
export function createServicesState(
  services: string[] | null = null,
  operationsForService: Record<string, string[]> = {},
  loading = false,
  error: Error | null = null
) {
  const sortedServices = services ? [...services].sort() : null;
  const sortedOperations: Record<string, string[]> = {};
  
  Object.keys(operationsForService).forEach(service => {
    sortedOperations[service] = [...operationsForService[service]].sort();
  });

  return {
    ...servicesDefaults,
    services: sortedServices,
    operationsForService: sortedOperations,
    loading,
    error,
  };
}

/**
 * Creates a dependencies state with the given dependencies
 */
export function createDependenciesState(
  dependencies: Array<{ parent: string; child: string; callCount: number }> = [],
  loading = false,
  error: Error | null = null
) {
  return {
    ...dependenciesDefaults,
    dependencies,
    loading,
    error,
  };
}

/**
 * Creates a DDG state entry with the given key and state
 */
export function createDdgState(
  key: string,
  state: typeof fetchedState.LOADING | typeof fetchedState.ERROR | typeof fetchedState.DONE,
  model?: any,
  error?: ApiError,
  viewModifiers: Map<number, number> = new Map()
) {
  if (state === fetchedState.LOADING) {
    return { [key]: { state } };
  }
  if (state === fetchedState.ERROR) {
    return { [key]: { state, error: error || { message: 'Unknown error' } } };
  }
  return { [key]: { state, model, viewModifiers } };
}

/**
 * Creates a metrics state with the given metrics data
 */
export function createMetricsState(overrides: Partial<MetricsReduxState> = {}): MetricsReduxState {
  return {
    ...metricsDefaults,
    ...overrides,
  };
}

/**
 * Creates a path agnostic decorations state with the given decorations
 */
export function createPathAgnosticDecorationsState(decorations: Record<string, any> = {}) {
  return {
    ...pathAgnosticDecorationsDefaults,
    ...decorations,
  };
}

/**
 * Creates a trace search state with the given query and results
 */
export function createTraceSearchState(
  query: any = null,
  results: string[] = [],
  state?: typeof fetchedState.LOADING | typeof fetchedState.ERROR | typeof fetchedState.DONE,
  error?: Error
) {
  const search = {
    query,
    results,
  };

  if (state) {
    Object.assign(search, { state });
  }

  if (state === fetchedState.ERROR && error) {
    Object.assign(search, { error });
  }

  return {
    ...traceDefaults,
    search,
  };
}