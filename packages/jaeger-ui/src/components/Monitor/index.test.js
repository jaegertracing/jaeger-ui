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

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore, combineReducers } from 'redux';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import store from 'store';
import MonitorATMPage from '.';
import servicesReducer from '../../reducers/services';
import metricsReducer from '../../reducers/metrics';
import * as jaegerApiActions from '../../actions/jaeger-api';

// --- Mock Modules ---
// Mock the actions module
jest.mock('../../actions/jaeger-api');
// Mock the 'store' npm package
jest.mock('store');

// --- Mock References ---
// Reference the mocked actions module
const mockedJaegerApiActions = jaegerApiActions;
const mockedStorage = store;

// --- Redux Setup ---
const rootReducer = combineReducers({
  services: servicesReducer,
  metrics: metricsReducer,
});
const initialState = {
  services: { services: [], loading: false, error: null, operations: {} },
  metrics: {
    loading: false,
    operationMetricsLoading: false,
    isATMActivated: true, // Prevent rendering EmptyState initially
    opsError: { opsCalls: null, opsErrors: null, opsLatencies: null },
    serviceOpsMetrics: [],
    serviceMetrics: { service_latencies: null, service_error_rate: null, service_call_rate: null },
    serviceError: {
      service_latencies_50: null,
      service_latencies_75: null,
      service_latencies_95: null,
      service_error_rate: null,
      service_call_rate: null,
    },
  },
};
const mockStore = createStore(rootReducer, initialState);

describe('<MonitorATMPage>', () => {
  let container;

  beforeEach(() => {
    jest.clearAllMocks();

    // --- Configure Mocks ---
    // Configure mock implementations on the *actions* module
    // Use mockImplementation or mockReturnValue as appropriate for actions
    mockedJaegerApiActions.fetchServices.mockImplementation(() => ({ type: 'FETCH_SERVICES_MOCK' }));
    mockedJaegerApiActions.fetchAllServiceMetrics.mockImplementation(() => ({
      type: 'FETCH_ALL_METRICS_MOCK',
    }));
    mockedJaegerApiActions.fetchAggregatedServiceMetrics.mockImplementation(() => ({
      type: 'FETCH_AGG_METRICS_MOCK',
    }));

    // Configure store mocks
    mockedStorage.get.mockImplementation(key => {
      if (key === 'lastAtmSearchService') return '';
      if (key === 'lastAtmSearchSpanKind') return 'server';
      if (key === 'lastAtmSearchTimeframe') return 3600000;
      return null;
    });
    mockedStorage.set.mockImplementation(() => {});

    // --- Render Component ---
    const { container: c } = render(
      <Provider store={mockStore}>
        <MemoryRouter>
          <MonitorATMPage />
        </MemoryRouter>
      </Provider>
    );
    container = c;
  });

  it('does not explode and renders initial elements', () => {
    expect(container).toBeDefined();

    // Check calls on the mocked *actions*
    expect(mockedJaegerApiActions.fetchServices).toHaveBeenCalledTimes(1);
    // Note: fetchMetrics calls might not happen if initialState.services.services is empty.

    // Check main headings and selectors
    expect(screen.getByRole('heading', { name: /Service/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Span Kind/i })).toBeInTheDocument();
    expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(3);

    // Check graph headers using roles
    expect(screen.getByRole('heading', { name: /Latency/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Error rate/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Request rate/i })).toBeInTheDocument();

    // Check table section
    expect(screen.getByRole('heading', { name: /Operations metrics/i })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
