// Copyright (c) 2021 The Jaeger Authors.
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

import { handleActions } from 'redux-actions';

import { fetchAllServiceMetrics, fetchAggregatedServiceMetrics } from '../actions/jaeger-api';
import {
  MetricPointObject,
  MetricsReduxState,
  ServiceMetrics,
  MetricObject,
  ServiceMetricsObject,
  ServiceOpsMetrics,
  OpsDataPoints,
  FetchedAllServiceMetricsResponse,
  PromiseRejectedResult,
  FetchAggregatedServiceMetricsResponse,
} from '../types/metrics';

const initialState: MetricsReduxState = {
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

function fetchStarted(state: MetricsReduxState) {
  return {
    ...state,
    serviceError: initialState.serviceError,
    loading: true,
  };
}

function fetchServiceMetricsDone(
  state: MetricsReduxState,
  { payload }: { payload?: FetchedAllServiceMetricsResponse }
) {
  const serviceMetrics: ServiceMetrics = {
    service_latencies: null,
    service_call_rate: null,
    service_error_rate: null,
  };
  const serviceError: MetricsReduxState['serviceError'] = {
    service_latencies_50: null,
    service_latencies_75: null,
    service_latencies_95: null,
    service_call_rate: null,
    service_error_rate: null,
  };
  let isATMActivated = true;

  if (payload) {
    payload.forEach((promiseResult, i) => {
      if (promiseResult.status === 'fulfilled') {
        const metrics = promiseResult.value;
        if (metrics.metrics[0]) {
          let max = 0;
          const metric: ServiceMetricsObject = {
            serviceName: metrics.metrics[0].labels[0].value,
            quantile: metrics.quantile,
            max: 0,
            metricPoints: metrics.metrics[0].metricPoints.map((p: MetricPointObject) => {
              let y;
              try {
                y = parseFloat(p.gaugeValue.doubleValue.toFixed(2));
                max = y > max ? y : max;
              } catch (e) {
                y = null;
              }
              return {
                x: new Date(p.timestamp).getTime(),
                y,
              };
            }),
          };

          metric.max = max;
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

        if (typeof reason === 'object' && reason.httpStatus === 501) {
          isATMActivated = false;
        }

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
  }
  return { ...state, serviceMetrics, serviceError, loading: false, isATMActivated };
}

function fetchOpsMetricsStarted(state: MetricsReduxState) {
  return {
    ...state,
    opsError: initialState.opsError,
    operationMetricsLoading: true,
  };
}

function fetchOpsMetricsDone(
  state: MetricsReduxState,
  { payload }: { payload?: FetchAggregatedServiceMetricsResponse }
) {
  const opsError: MetricsReduxState['opsError'] = {
    opsLatencies: null,
    opsCalls: null,
    opsErrors: null,
  };

  let opsMetrics:
    | null
    | {
        [k in string]: {
          name: string;
          metricPoints: OpsDataPoints;
        };
      } = null;

  let serviceOpsMetrics: ServiceOpsMetrics[] | undefined = undefined;

  if (payload) {
    payload.forEach((promiseResult, i) => {
      if (promiseResult.status === 'fulfilled') {
        const metric = promiseResult.value;
        metric.metrics.forEach((metricDetails: MetricObject) => {
          if (opsMetrics === null) {
            opsMetrics = {};
          }

          let opsName: string | null = null;
          const avg: {
            service_operation_latencies: number;
            service_operation_call_rate: number;
            service_operation_error_rate: number;
          } = {
            service_operation_latencies: 0,
            service_operation_call_rate: 0,
            service_operation_error_rate: 0,
          };
          const count: {
            service_operation_latencies: number;
            service_operation_call_rate: number;
            service_operation_error_rate: number;
          } = {
            service_operation_latencies: 0,
            service_operation_call_rate: 0,
            service_operation_error_rate: 0,
          };
          metricDetails.labels.forEach((label: { name: string; value: string }) => {
            if (label.name === 'operation') {
              opsName = label.value;
            }
          });

          if (opsName) {
            if (opsMetrics[opsName] === undefined) {
              opsMetrics[opsName] = {
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

            opsMetrics[opsName].metricPoints[metric.name] = metricDetails.metricPoints.map(p => {
              let y;
              try {
                y = parseFloat(p.gaugeValue.doubleValue.toFixed(2));
                avg[metric.name] += y;
                count[metric.name] += 1; // Increment count for non-NaN values
              } catch (e) {
                y = null;
              }

              return {
                x: new Date(p.timestamp).getTime(),
                y,
              };
            });

            opsMetrics[opsName].metricPoints.avg[metric.name] =
              count[metric.name] > 0 ? parseFloat((avg[metric.name] / count[metric.name]).toFixed(2)) : null;
          }
        });
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

    const minMax: {
      min: number;
      max: number;
    } = {
      min: 0,
      max: 0,
    };

    if (opsMetrics) {
      serviceOpsMetrics = Object.keys(opsMetrics).map((operationName, i) => {
        let impact = 0;
        if (
          opsMetrics![operationName].metricPoints.avg.service_operation_latencies !== null &&
          opsMetrics![operationName].metricPoints.avg.service_operation_call_rate !== null
        ) {
          impact =
            (opsMetrics![operationName].metricPoints.avg.service_operation_latencies! *
              opsMetrics![operationName].metricPoints.avg.service_operation_call_rate!) /
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
          name: opsMetrics![operationName].name,
          latency: opsMetrics![operationName].metricPoints.avg.service_operation_latencies || 0,
          requests: opsMetrics![operationName].metricPoints.avg.service_operation_call_rate || 0,
          errRates: opsMetrics![operationName].metricPoints.avg.service_operation_error_rate || 0,
          impact,
          dataPoints: opsMetrics![operationName].metricPoints,
        };
      });

      if (serviceOpsMetrics && serviceOpsMetrics.length === 1) {
        serviceOpsMetrics.forEach((v, i) => {
          serviceOpsMetrics![i].impact = 1;
        });
      } else if (serviceOpsMetrics && serviceOpsMetrics.length > 1) {
        serviceOpsMetrics.forEach((v, i) => {
          if (minMax.max - minMax.min === 0) {
            serviceOpsMetrics![i].impact = 0;
          } else {
            serviceOpsMetrics![i].impact = (v.impact - minMax.min) / (minMax.max - minMax.min);
          }
        });
      }
    }
  }

  return { ...state, serviceOpsMetrics, opsError, operationMetricsLoading: false };
}

export default handleActions(
  {
    [`${fetchAllServiceMetrics}_PENDING`]: fetchStarted,
    [`${fetchAllServiceMetrics}_FULFILLED`]: fetchServiceMetricsDone,

    [`${fetchAggregatedServiceMetrics}_PENDING`]: fetchOpsMetricsStarted,
    [`${fetchAggregatedServiceMetrics}_FULFILLED`]: fetchOpsMetricsDone,
  },
  initialState
);
