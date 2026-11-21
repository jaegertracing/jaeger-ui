// Copyright (c) 2021 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

export const originInitialState = {
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
  loading: false,
  operationMetricsLoading: undefined,
  serviceMetrics: null,
  serviceOpsMetrics: undefined,
};

export const serviceMetrics = {
  service_call_rate: {
    max: 0.05,
    metricPoints: [
      {
        x: 1631271823806,
        y: 0.05,
      },
      {
        x: 1631271883806,
        y: 0.05,
      },
    ],
    quantile: 0.95,
    serviceName: 'cartservice',
  },
  service_error_rate: {
    max: 1,
    metricPoints: [
      {
        x: 1631274747520,
        y: 1,
      },
      {
        x: 1631274807520,
        y: 1,
      },
    ],
    quantile: 0.95,
    serviceName: 'cartservice',
  },
  service_latencies: [
    {
      max: 189.86,
      metricPoints: [
        {
          x: 1631271823806,
          y: 189.86,
        },
        {
          x: 1631271883806,
          y: 189.86,
        },
      ],
      quantile: 0.5,
      serviceName: 'cartservice',
    },
    {
      max: 189.86,
      metricPoints: [
        {
          x: 1631271823806,
          y: 189.86,
        },
        {
          x: 1631271883806,
          y: 189.86,
        },
      ],
      quantile: 0.75,
      serviceName: 'cartservice',
    },
    {
      max: 189.86,
      metricPoints: [
        {
          x: 1631271823806,
          y: 189.86,
        },
        {
          x: 1631271883806,
          y: 189.86,
        },
      ],
      quantile: 0.95,
      serviceName: 'cartservice',
    },
  ],
};

export const serviceMetricsWithOneServiceLatency = {
  service_call_rate: {
    max: 0.05,
    metricPoints: [
      {
        x: 1631271823806,
        y: 0.05,
      },
      {
        x: 1631271883806,
        y: 0.05,
      },
    ],
    quantile: 0.95,
    serviceName: 'cartservice',
  },
  service_error_rate: {
    max: 1,
    metricPoints: [
      {
        x: 1631274747520,
        y: 1,
      },
      {
        x: 1631274807520,
        y: 1,
      },
    ],
    quantile: 0.95,
    serviceName: 'cartservice',
  },
  service_latencies: {
    max: 189.86,
    metricPoints: [
      {
        x: 1631271823806,
        y: 189.86,
      },
      {
        x: 1631271883806,
        y: 189.86,
      },
    ],
    quantile: 0.5,
    serviceName: 'cartservice',
  },
};

export const serviceOpsMetrics = [
  {
    dataPoints: {
      avg: {
        service_operation_call_rate: 0.01,
        service_operation_error_rate: 1,
        service_operation_latencies: 736.16,
      },
      service_operation_call_rate: [
        {
          x: 1631534436235,
          y: 0.01,
        },
        {
          x: 1631534496235,
          y: 0.01,
        },
      ],
      service_operation_error_rate: [
        {
          x: 1631534436235,
          y: 1,
        },
        {
          x: 1631534496235,
          y: 1,
        },
      ],
      service_operation_latencies: [
        {
          x: 1631534436235,
          y: 737.33,
        },
        {
          x: 1631534496235,
          y: 735,
        },
      ],
    },
    errRates: 1,
    impact: 1,
    key: 0,
    latency: 736.16,
    name: '/PlaceOrder',
    requests: 0.01,
  },
];
