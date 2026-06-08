// Copyright (c) 2021 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import store from '../../utils/storage';
import MonitorATMPage from '.';
import getConfig from '../../utils/config/get-config';
import { serviceMetrics, serviceOpsMetrics, originInitialState } from '../../reducers/metrics.mock';

vi.mock('../../utils/config/get-config', () => ({
  default: jest.fn(() => ({
    qualityMetrics: { apiEndpoint: '/api/quality-metrics' },
    backendCapabilities: { metricsStorage: true },
  })),
}));

vi.mock('../../utils/storage', () => ({
  default: {
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBool: jest.fn(),
    getJSON: jest.fn(),
    set: jest.fn(),
  },
}));

vi.mock('../../hooks/useTraceDiscovery', () => {
  const services = ['service1', 'service2'];
  return {
    useServices: jest.fn(() => ({ data: services, isLoading: false })),
  };
});

vi.mock('../../hooks/useMetricsQuery', () => ({
  useServiceMetricsQuery: jest.fn(() => ({
    data: { serviceMetrics, serviceError: originInitialState.serviceError },
    isFetching: false,
  })),
  useOperationMetricsQuery: jest.fn(() => ({
    data: { serviceOpsMetrics, opsError: originInitialState.opsError },
    isFetching: false,
  })),
}));

const mockedStorage = store;

describe('<MonitorATMPage>', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedStorage.getString.mockImplementation(key => {
      if (key === 'lastAtmSearchService') return '';
      if (key === 'lastAtmSearchSpanKind') return 'server';
      return undefined;
    });
    mockedStorage.getNumber.mockImplementation((_key, defaultValue) => defaultValue);
    mockedStorage.getBool.mockImplementation((_key, defaultValue) => defaultValue);
    mockedStorage.set.mockImplementation(() => {});
  });

  it('does not explode and renders initial elements', () => {
    const { container } = render(
      <MemoryRouter>
        <MonitorATMPage />
      </MemoryRouter>
    );

    expect(container).toBeDefined();

    expect(screen.getByRole('heading', { name: /^Service$/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Span Kind/i })).toBeInTheDocument();
    expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(3);

    expect(screen.getByRole('heading', { name: /Latency/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Error rate/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Request rate/i })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /Operations metrics/i })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders EmptyState when metricsStorage is disabled in config', () => {
    getConfig.mockImplementation(() => ({
      qualityMetrics: { apiEndpoint: '/api/quality-metrics' },
      backendCapabilities: { metricsStorage: false },
    }));
    try {
      render(
        <MemoryRouter>
          <MonitorATMPage />
        </MemoryRouter>
      );

      expect(screen.getByAltText('jaeger-monitor-tab-preview')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /^Service$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /Latency/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    } finally {
      getConfig.mockImplementation(() => ({
        qualityMetrics: { apiEndpoint: '/api/quality-metrics' },
        backendCapabilities: { metricsStorage: true },
      }));
    }
  });
});
