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

const serviceLatencies50 = {
  status: 'fulfilled',
  value: {
    name: 'service_latencies',
    type: 'GAUGE',
    help: '0.5th quantile latency, grouped by service',
    quantile: 0.5,
    metrics: [
      {
        labels: [
          {
            name: 'service_name',
            value: 'cartservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: 189.85919098822325,
            },
            timestamp: '2021-09-10T11:03:43.806Z',
          },
          {
            gaugeValue: {
              doubleValue: 189.85926305015352,
            },
            timestamp: '2021-09-10T11:04:43.806Z',
          },
        ],
      },
    ],
  },
};
const serviceLatencies50withNull = {
  status: 'fulfilled',
  value: {
    name: 'service_latencies',
    type: 'GAUGE',
    help: '0.5th quantile latency, grouped by service',
    quantile: 0.5,
    metrics: [
      {
        labels: [
          {
            name: 'service_name',
            value: 'cartservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: null,
            },
            timestamp: '2021-09-10T11:03:43.806Z',
          },
          {
            gaugeValue: {
              doubleValue: '189.85926305015352',
            },
            timestamp: '2021-09-10T11:04:43.806Z',
          },
        ],
      },
    ],
  },
};
const serviceLatencies75 = {
  status: 'fulfilled',
  value: {
    name: 'service_latencies',
    type: 'GAUGE',
    help: '0.75th quantile latency, grouped by service',
    quantile: 0.75,
    metrics: [
      {
        labels: [
          {
            name: 'service_name',
            value: 'cartservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: 189.85919098822325,
            },
            timestamp: '2021-09-10T11:03:43.806Z',
          },
          {
            gaugeValue: {
              doubleValue: 189.85926305015352,
            },
            timestamp: '2021-09-10T11:04:43.806Z',
          },
        ],
      },
    ],
  },
};
const serviceLatencies95 = {
  status: 'fulfilled',
  value: {
    name: 'service_latencies',
    type: 'GAUGE',
    help: '0.95th quantile latency, grouped by service',
    quantile: 0.95,
    metrics: [
      {
        labels: [
          {
            name: 'service_name',
            value: 'cartservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: 189.85919098822325,
            },
            timestamp: '2021-09-10T11:03:43.806Z',
          },
          {
            gaugeValue: {
              doubleValue: 189.85926305015352,
            },
            timestamp: '2021-09-10T11:04:43.806Z',
          },
        ],
      },
    ],
  },
};
const serviceCalls95Response = {
  status: 'fulfilled',
  value: {
    name: 'service_call_rate',
    type: 'GAUGE',
    help: 'calls/sec, grouped by service',
    quantile: 0.95,
    metrics: [
      {
        labels: [
          {
            name: 'service_name',
            value: 'cartservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: 0.05256012294063042,
            },
            timestamp: '2021-09-10T11:03:43.806Z',
          },
          {
            gaugeValue: {
              doubleValue: 0.05228198343384174,
            },
            timestamp: '2021-09-10T11:04:43.806Z',
          },
        ],
      },
    ],
  },
};
const serviceErrors95Response = {
  status: 'fulfilled',
  value: {
    name: 'service_error_rate',
    type: 'GAUGE',
    help: 'error rate, computed as a fraction of errors/sec over calls/sec, grouped by service',
    quantile: 0.95,
    metrics: [
      {
        labels: [
          {
            name: 'service_name',
            value: 'cartservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: 1,
            },
            timestamp: '2021-09-10T11:52:27.520Z',
          },
          {
            gaugeValue: {
              doubleValue: 1,
            },
            timestamp: '2021-09-10T11:53:27.520Z',
          },
        ],
      },
    ],
  },
};

const serviceOpsLatencies = {
  status: 'fulfilled',
  value: {
    name: 'service_operation_latencies',
    type: 'GAUGE',
    help: '0.95th quantile latency, grouped by service \u0026 operation',
    metrics: [
      {
        labels: [
          {
            name: 'operation',
            value: '/PlaceOrder',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: 737.3333333333333,
            },
            timestamp: '2021-09-13T12:00:36.235Z',
          },
          {
            gaugeValue: {
              doubleValue: 735,
            },
            timestamp: '2021-09-13T12:01:36.235Z',
          },
        ],
      },
    ],
  },
};

const serviceOpsLatenciesWithNull = {
  status: 'fulfilled',
  value: {
    name: 'service_operation_latencies',
    type: 'GAUGE',
    help: '0.95th quantile latency, grouped by service \u0026 operation',
    metrics: [
      {
        labels: [
          {
            name: 'operation',
            value: '/PlaceOrder',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: 1,
            },
            timestamp: '2021-09-13T12:00:36.235Z',
          },
          {
            gaugeValue: {
              doubleValue: 3,
            },
            timestamp: '2021-09-13T12:01:36.235Z',
          },
        ],
      },
      {
        labels: [
          {
            name: 'operation',
            value: '/Checkout',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: '737.3333333333333',
            },
            timestamp: '2021-09-13T12:00:36.235Z',
          },
          {
            gaugeValue: {
              doubleValue: null,
            },
            timestamp: '2021-09-13T12:01:36.235Z',
          },
        ],
      },
    ],
  },
};
const serviceOpsLatenciesZeroDivision = {
  status: 'fulfilled',
  value: {
    name: 'service_operation_latencies',
    type: 'GAUGE',
    help: '0.95th quantile latency, grouped by service \u0026 operation',
    metrics: [
      {
        labels: [
          {
            name: 'operation',
            value: '/PlaceOrder',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: 0,
            },
            timestamp: '2021-09-13T12:00:36.235Z',
          },
          {
            gaugeValue: {
              doubleValue: 0,
            },
            timestamp: '2021-09-13T12:01:36.235Z',
          },
        ],
      },
      {
        labels: [
          {
            name: 'operation',
            value: '/Checkout',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: '737.3333333333333',
            },
            timestamp: '2021-09-13T12:00:36.235Z',
          },
          {
            gaugeValue: {
              doubleValue: null,
            },
            timestamp: '2021-09-13T12:01:36.235Z',
          },
        ],
      },
    ],
  },
};
const serviceOpsErrors = {
  status: 'fulfilled',
  value: {
    name: 'service_operation_error_rate',
    type: 'GAUGE',
    help:
      'error rate, computed as a fraction of errors/sec over calls/sec, grouped by service \u0026 operation',
    metrics: [
      {
        labels: [
          {
            name: 'operation',
            value: '/PlaceOrder',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: 1,
            },
            timestamp: '2021-09-13T12:00:36.235Z',
          },
          {
            gaugeValue: {
              doubleValue: 1,
            },
            timestamp: '2021-09-13T12:01:36.235Z',
          },
        ],
      },
    ],
  },
};
const serviceOpsErrorsWithNull = {
  status: 'fulfilled',
  value: {
    name: 'service_operation_error_rate',
    type: 'GAUGE',
    help:
      'error rate, computed as a fraction of errors/sec over calls/sec, grouped by service \u0026 operation',
    metrics: [
      {
        labels: [
          {
            name: 'operation',
            value: '/PlaceOrder',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: '737.3333333333333',
            },
            timestamp: '2021-09-13T12:00:36.235Z',
          },
          {
            gaugeValue: {
              doubleValue: null,
            },
            timestamp: '2021-09-13T12:01:36.235Z',
          },
        ],
      },
      {
        labels: [
          {
            name: 'operation',
            value: '/Checkout',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: 1,
            },
            timestamp: '2021-09-13T12:00:36.235Z',
          },
          {
            gaugeValue: {
              doubleValue: 1,
            },
            timestamp: '2021-09-13T12:01:36.235Z',
          },
        ],
      },
    ],
  },
};
const serviceOpsErrorsZeroDivision = {
  status: 'fulfilled',
  value: {
    name: 'service_operation_error_rate',
    type: 'GAUGE',
    help:
      'error rate, computed as a fraction of errors/sec over calls/sec, grouped by service \u0026 operation',
    metrics: [
      {
        labels: [
          {
            name: 'operation',
            value: '/PlaceOrder',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: '737.3333333333333',
            },
            timestamp: '2021-09-13T12:00:36.235Z',
          },
          {
            gaugeValue: {
              doubleValue: null,
            },
            timestamp: '2021-09-13T12:01:36.235Z',
          },
        ],
      },
      {
        labels: [
          {
            name: 'operation',
            value: '/Checkout',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: 1,
            },
            timestamp: '2021-09-13T12:00:36.235Z',
          },
          {
            gaugeValue: {
              doubleValue: 1,
            },
            timestamp: '2021-09-13T12:01:36.235Z',
          },
        ],
      },
    ],
  },
};
const serviceOpsCalls = {
  status: 'fulfilled',
  value: {
    name: 'service_operation_call_rate',
    type: 'GAUGE',
    help: 'calls/sec, grouped by service \u0026 operation',
    metrics: [
      {
        labels: [
          {
            name: 'operation',
            value: '/PlaceOrder',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: 0.012657559165859726,
            },
            timestamp: '2021-09-13T12:00:36.235Z',
          },
          {
            gaugeValue: {
              doubleValue: 0.014052384663085615,
            },
            timestamp: '2021-09-13T12:01:36.235Z',
          },
        ],
      },
    ],
  },
};
const serviceOpsCallsWithNull = {
  status: 'fulfilled',
  value: {
    name: 'service_operation_call_rate',
    type: 'GAUGE',
    help: 'calls/sec, grouped by service \u0026 operation',
    metrics: [
      {
        labels: [
          {
            name: 'operation',
            value: '/PlaceOrder',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: 0.012657559165859726,
            },
            timestamp: '2021-09-13T12:00:36.235Z',
          },
          {
            gaugeValue: {
              doubleValue: 0.031052384663085615,
            },
            timestamp: '2021-09-13T12:01:36.235Z',
          },
        ],
      },
      {
        labels: [
          {
            name: 'operation',
            value: '/Checkout',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: 0.012657559165859726,
            },
            timestamp: '2021-09-13T12:00:36.235Z',
          },
          {
            gaugeValue: {
              doubleValue: 0.014052384663085615,
            },
            timestamp: '2021-09-13T12:01:36.235Z',
          },
        ],
      },
    ],
  },
};

const serviceOpsCallsZeroDivision = {
  status: 'fulfilled',
  value: {
    name: 'service_operation_call_rate',
    type: 'GAUGE',
    help: 'calls/sec, grouped by service \u0026 operation',
    metrics: [
      {
        labels: [
          {
            name: 'operation',
            value: '/PlaceOrder',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: 0.012657559165859726,
            },
            timestamp: '2021-09-13T12:00:36.235Z',
          },
          {
            gaugeValue: {
              doubleValue: 0.031052384663085615,
            },
            timestamp: '2021-09-13T12:01:36.235Z',
          },
        ],
      },
      {
        labels: [
          {
            name: 'operation',
            value: '/Checkout',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [
          {
            gaugeValue: {
              doubleValue: 0.012657559165859726,
            },
            timestamp: '2021-09-13T12:00:36.235Z',
          },
          {
            gaugeValue: {
              doubleValue: 0.014052384663085615,
            },
            timestamp: '2021-09-13T12:01:36.235Z',
          },
        ],
      },
    ],
  },
};

const emptyResponse = responseWithData => {
  return {
    ...responseWithData,
    value: {
      ...responseWithData.value,
      metrics: [],
    },
  };
};

const originInitialState = {
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
  operationMetricsLoading: null,
  serviceMetrics: null,
  serviceOpsMetrics: undefined,
};

const serviceMetrics = {
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

const serviceMetricsWithOneServiceLatency = {
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

const serviceMetricsWithNulls = {
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
      max: 0,
      metricPoints: [
        {
          x: 1631271823806,
          y: null,
        },
        {
          x: 1631271883806,
          y: null,
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
const serviceOpsMetrics = [
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
const serviceOpsMetricsWithNull = [
  {
    dataPoints: {
      avg: {
        service_operation_call_rate: 0.02,
        service_operation_error_rate: 0,
        service_operation_latencies: 2,
      },
      service_operation_call_rate: [
        {
          x: 1631534436235,
          y: 0.01,
        },
        {
          x: 1631534496235,
          y: 0.03,
        },
      ],
      service_operation_error_rate: [
        {
          x: 1631534436235,
          y: null,
        },
        {
          x: 1631534496235,
          y: null,
        },
      ],
      service_operation_latencies: [
        {
          x: 1631534436235,
          y: 1,
        },
        {
          x: 1631534496235,
          y: 3,
        },
      ],
    },
    errRates: 0,
    impact: 1,
    key: 0,
    latency: 2,
    name: '/PlaceOrder',
    requests: 0.02,
  },
  {
    dataPoints: {
      avg: {
        service_operation_call_rate: 0.01,
        service_operation_error_rate: 1,
        service_operation_latencies: 0,
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
          y: null,
        },
        {
          x: 1631534496235,
          y: null,
        },
      ],
    },
    errRates: 1,
    impact: 0,
    key: 1,
    latency: 0,
    name: '/Checkout',
    requests: 0.01,
  },
];
const serviceOpsMetricsZeroDivision = [
  {
    dataPoints: {
      avg: {
        service_operation_call_rate: 0.02,
        service_operation_error_rate: 0,
        service_operation_latencies: 0,
      },
      service_operation_call_rate: [
        {
          x: 1631534436235,
          y: 0.01,
        },
        {
          x: 1631534496235,
          y: 0.03,
        },
      ],
      service_operation_error_rate: [
        {
          x: 1631534436235,
          y: null,
        },
        {
          x: 1631534496235,
          y: null,
        },
      ],
      service_operation_latencies: [
        {
          x: 1631534436235,
          y: 0,
        },
        {
          x: 1631534496235,
          y: 0,
        },
      ],
    },
    errRates: 0,
    impact: 0,
    key: 0,
    latency: 0,
    name: '/PlaceOrder',
    requests: 0.02,
  },
  {
    dataPoints: {
      avg: {
        service_operation_call_rate: 0.01,
        service_operation_error_rate: 1,
        service_operation_latencies: 0,
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
          y: null,
        },
        {
          x: 1631534496235,
          y: null,
        },
      ],
    },
    errRates: 1,
    impact: 0,
    key: 1,
    latency: 0,
    name: '/Checkout',
    requests: 0.01,
  },
];

const serviceOpsLatenciesNoMetrics = {
  status: 'fulfilled',
  value: {
    name: 'service_operation_latencies',
    type: 'GAUGE',
    help: '0.95th quantile latency, grouped by service \u0026 operation',
    metrics: [
      {
        labels: [
          {
            name: 'operation',
            value: '/PlaceOrder',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [],
      },
      {
        labels: [
          {
            name: 'operation',
            value: '/Checkout',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [],
      },
    ],
  },
};
const serviceOpsMetricsNoMetrics = [
  {
    dataPoints: {
      avg: {
        service_operation_call_rate: null,
        service_operation_error_rate: null,
        service_operation_latencies: null,
      },
      service_operation_call_rate: [],
      service_operation_error_rate: [],
      service_operation_latencies: [],
    },
    errRates: 0,
    impact: 0,
    key: 0,
    latency: 0,
    name: '/PlaceOrder',
    requests: 0,
  },
  {
    dataPoints: {
      avg: {
        service_operation_call_rate: null,
        service_operation_error_rate: null,
        service_operation_latencies: null,
      },
      service_operation_call_rate: [],
      service_operation_error_rate: [],
      service_operation_latencies: [],
    },
    errRates: 0,
    impact: 0,
    key: 1,
    latency: 0,
    name: '/Checkout',
    requests: 0,
  },
];

const serviceOpsCallsNoMetrics = {
  status: 'fulfilled',
  value: {
    name: 'service_operation_call_rate',
    type: 'GAUGE',
    help: 'calls/sec, grouped by service \u0026 operation',
    metrics: [
      {
        labels: [
          {
            name: 'operation',
            value: '/PlaceOrder',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [],
      },
      {
        labels: [
          {
            name: 'operation',
            value: '/Checkout',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [],
      },
    ],
  },
};
const serviceOpsErrorsNoMetrics = {
  status: 'fulfilled',
  value: {
    name: 'service_operation_error_rate',
    type: 'GAUGE',
    help:
      'error rate, computed as a fraction of errors/sec over calls/sec, grouped by service \u0026 operation',
    metrics: [
      {
        labels: [
          {
            name: 'operation',
            value: '/PlaceOrder',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [],
      },
      {
        labels: [
          {
            name: 'operation',
            value: '/Checkout',
          },
          {
            name: 'service_name',
            value: 'checkoutservice',
          },
        ],
        metricPoints: [],
      },
    ],
  },
};

export {
  serviceLatencies50,
  serviceLatencies75,
  serviceLatencies95,
  serviceCalls95Response,
  serviceErrors95Response,
  serviceOpsLatencies,
  serviceOpsErrors,
  serviceOpsCalls,
  emptyResponse,
  originInitialState,
  serviceMetrics,
  serviceMetricsWithOneServiceLatency,
  serviceOpsMetrics,
  serviceLatencies50withNull,
  serviceMetricsWithNulls,
  serviceOpsLatenciesWithNull,
  serviceOpsMetricsWithNull,
  serviceOpsCallsWithNull,
  serviceOpsErrorsWithNull,
  serviceOpsLatenciesZeroDivision,
  serviceOpsMetricsZeroDivision,
  serviceOpsCallsZeroDivision,
  serviceOpsErrorsZeroDivision,
  serviceOpsLatenciesNoMetrics,
  serviceOpsMetricsNoMetrics,
  serviceOpsCallsNoMetrics,
  serviceOpsErrorsNoMetrics,
};
