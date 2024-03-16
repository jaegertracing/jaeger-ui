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

import { fetchAllServiceMetrics, fetchAggregatedServiceMetrics } from '../actions/jaeger-api';
import metricReducer from './metrics';
import {
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
} from './metrics.mock';

const initialState = metricReducer(undefined, {});

describe('reducers/fetchAllServiceMetrics', () => {
  function verifyInitialState() {
    expect(initialState).toEqual(originInitialState);
  }

  beforeEach(verifyInitialState);
  afterEach(verifyInitialState);

  it('Pending state ', () => {
    const state = metricReducer(initialState, {
      type: `${fetchAllServiceMetrics}_PENDING`,
    });

    expect(state).toEqual({
      ...initialState,
      loading: true,
    });
  });

  it('payload is undefined', () => {
    const state = metricReducer(initialState, {
      type: `${fetchAllServiceMetrics}_FULFILLED`,
      payload: undefined,
    });

    const expected = {
      ...initialState,
      isATMActivated: true,
      loading: false,
      serviceMetrics: {
        service_latencies: null,
        service_call_rate: null,
        service_error_rate: null,
      },
      serviceError: {
        service_latencies_50: null,
        service_latencies_75: null,
        service_latencies_95: null,
        service_call_rate: null,
        service_error_rate: null,
      },
    };
    expect(state).toEqual(expected);
  });

  describe('handle successful payload', () => {
    it('no metric data', () => {
      const state = metricReducer(initialState, {
        type: `${fetchAllServiceMetrics}_FULFILLED`,
        payload: [
          emptyResponse(serviceLatencies50),
          emptyResponse(serviceLatencies75),
          emptyResponse(serviceLatencies95),
          emptyResponse(serviceCalls95Response),
          emptyResponse(serviceErrors95Response),
        ],
      });

      const expected = {
        ...initialState,
        isATMActivated: true,
        loading: false,
        serviceMetrics: {
          service_latencies: null,
          service_call_rate: null,
          service_error_rate: null,
        },
        serviceError: {
          service_latencies_50: null,
          service_latencies_75: null,
          service_latencies_95: null,
          service_call_rate: null,
          service_error_rate: null,
        },
      };
      expect(state).toEqual(expected);
    });

    it('null checks', () => {
      const state = metricReducer(initialState, {
        type: `${fetchAllServiceMetrics}_FULFILLED`,
        payload: [
          serviceLatencies50withNull,
          serviceLatencies75,
          serviceLatencies95,
          serviceCalls95Response,
          serviceErrors95Response,
        ],
      });

      const expected = {
        ...initialState,
        isATMActivated: true,
        loading: false,
        serviceMetrics: serviceMetricsWithNulls,
        serviceError: {
          service_latencies_50: null,
          service_latencies_75: null,
          service_latencies_95: null,
          service_call_rate: null,
          service_error_rate: null,
        },
      };
      expect(state).toEqual(expected);
    });

    it('all data are correct', () => {
      const state = metricReducer(initialState, {
        type: `${fetchAllServiceMetrics}_FULFILLED`,
        payload: [
          serviceLatencies50,
          serviceLatencies75,
          serviceLatencies95,
          serviceCalls95Response,
          serviceErrors95Response,
        ],
      });

      const expected = {
        ...initialState,
        isATMActivated: true,
        loading: false,
        serviceMetrics,
        serviceError: {
          service_latencies_50: null,
          service_latencies_75: null,
          service_latencies_95: null,
          service_call_rate: null,
          service_error_rate: null,
        },
      };
      expect(state).toEqual(expected);
    });
  });

  describe('handle rejected results', () => {
    it('some generic error', () => {
      const state = metricReducer(initialState, {
        type: `${fetchAllServiceMetrics}_FULFILLED`,
        payload: [
          {
            status: 'rejected',
            reason: 'Error',
          },
          {
            status: 'rejected',
            reason: 'Error',
          },
          {
            status: 'rejected',
            reason: 'Error',
          },
          {
            status: 'rejected',
            reason: 'Error',
          },
          {
            status: 'rejected',
            reason: 'Error',
          },
        ],
      });

      const expected = {
        ...initialState,
        isATMActivated: true,
        loading: false,
        serviceMetrics: {
          service_latencies: null,
          service_call_rate: null,
          service_error_rate: null,
        },
        serviceError: {
          service_latencies_50: 'Error',
          service_latencies_75: 'Error',
          service_latencies_95: 'Error',
          service_call_rate: 'Error',
          service_error_rate: 'Error',
        },
      };
      expect(state).toEqual(expected);
    });

    it('501 Not Implemented error', () => {
      const notImplementedRejection = {
        httpStatus: 501,
      };
      const state = metricReducer(initialState, {
        type: `${fetchAllServiceMetrics}_FULFILLED`,
        payload: [
          {
            status: 'rejected',
            reason: notImplementedRejection,
          },
          {
            status: 'rejected',
            reason: notImplementedRejection,
          },
          {
            status: 'rejected',
            reason: notImplementedRejection,
          },
          {
            status: 'rejected',
            reason: notImplementedRejection,
          },
          {
            status: 'rejected',
            reason: notImplementedRejection,
          },
        ],
      });

      const expected = {
        ...initialState,
        isATMActivated: false,
        loading: false,
        serviceMetrics: {
          service_latencies: null,
          service_call_rate: null,
          service_error_rate: null,
        },
        serviceError: {
          service_latencies_50: notImplementedRejection,
          service_latencies_75: notImplementedRejection,
          service_latencies_95: notImplementedRejection,
          service_call_rate: notImplementedRejection,
          service_error_rate: notImplementedRejection,
        },
      };
      expect(state).toEqual(expected);
    });
  });
});

describe('reducers/fetchAggregatedServiceMetrics', () => {
  function verifyInitialState() {
    expect(initialState).toEqual(originInitialState);
  }

  beforeEach(verifyInitialState);
  afterEach(verifyInitialState);

  it('Pending state ', () => {
    const state = metricReducer(initialState, {
      type: `${fetchAggregatedServiceMetrics}_PENDING`,
    });

    expect(state).toEqual({
      ...initialState,
      operationMetricsLoading: true,
    });
  });

  it('payload is undefined', () => {
    const state = metricReducer(initialState, {
      type: `${fetchAggregatedServiceMetrics}_FULFILLED`,
      payload: undefined,
    });

    const expected = {
      ...initialState,
      operationMetricsLoading: false,
    };
    expect(state).toEqual(expected);
  });

  it('handle rejected results', () => {
    const state = metricReducer(initialState, {
      type: `${fetchAggregatedServiceMetrics}_FULFILLED`,
      payload: [
        {
          status: 'rejected',
          reason: 'Error',
        },
        {
          status: 'rejected',
          reason: 'Error',
        },
        {
          status: 'rejected',
          reason: 'Error',
        },
      ],
    });

    const expected = {
      ...initialState,
      operationMetricsLoading: false,
      opsError: {
        opsLatencies: 'Error',
        opsCalls: 'Error',
        opsErrors: 'Error',
      },
    };
    expect(state).toEqual(expected);
  });

  describe('handle payload', () => {
    it('no metric data', () => {
      const state = metricReducer(initialState, {
        type: `${fetchAggregatedServiceMetrics}_FULFILLED`,
        payload: [
          emptyResponse(serviceOpsLatencies),
          emptyResponse(serviceOpsCalls),
          emptyResponse(serviceOpsErrors),
        ],
      });

      const expected = {
        ...initialState,
        operationMetricsLoading: false,
      };
      expect(state).toEqual(expected);
    });
  });

  it('null checks', () => {
    const state = metricReducer(initialState, {
      type: `${fetchAggregatedServiceMetrics}_FULFILLED`,
      payload: [serviceOpsLatenciesWithNull, serviceOpsCallsWithNull, serviceOpsErrorsWithNull],
    });

    const expected = {
      ...initialState,
      operationMetricsLoading: false,
      serviceOpsMetrics: serviceOpsMetricsWithNull,
    };
    expect(state).toEqual(expected);
  });

  it('no metrics', () => {
    const state = metricReducer(initialState, {
      type: `${fetchAggregatedServiceMetrics}_FULFILLED`,
      payload: [serviceOpsLatenciesNoMetrics, serviceOpsCallsNoMetrics, serviceOpsErrorsNoMetrics],
    });

    const expected = {
      ...initialState,
      operationMetricsLoading: false,
      serviceOpsMetrics: serviceOpsMetricsNoMetrics,
    };
    expect(state).toEqual(expected);
  });

  it('zero division', () => {
    const state = metricReducer(initialState, {
      type: `${fetchAggregatedServiceMetrics}_FULFILLED`,
      payload: [serviceOpsLatenciesZeroDivision, serviceOpsCallsZeroDivision, serviceOpsErrorsZeroDivision],
    });

    const expected = {
      ...initialState,
      operationMetricsLoading: false,
      serviceOpsMetrics: serviceOpsMetricsZeroDivision,
    };
    expect(state).toEqual(expected);
  });

  it('all data are correct', () => {
    const state = metricReducer(initialState, {
      type: `${fetchAggregatedServiceMetrics}_FULFILLED`,
      payload: [serviceOpsLatencies, serviceOpsCalls, serviceOpsErrors],
    });

    const expected = {
      ...initialState,
      operationMetricsLoading: false,
      serviceOpsMetrics,
    };
    expect(state).toEqual(expected);
  });
});
