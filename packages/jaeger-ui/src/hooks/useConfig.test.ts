// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import React from 'react';
import { useConfig } from './useConfig';
import { Config } from '../types/config';
import { ReduxState } from '../types';

describe('useConfig', () => {
  const createMockStore = (config: Partial<Config>) => {
    const fullConfig: Config = {
      criticalPathEnabled: false,
      disableFileUploadControl: false,
      disableJsonView: false,
      forbidNewPage: false,
      themes: { enabled: true },
      useOpenTelemetryTerms: false,
      menu: [],
      ...config,
    };

    const mockState: Partial<ReduxState> = {
      config: fullConfig,
    };

    return createStore(() => mockState as ReduxState);
  };

  const createWrapper = (store: ReturnType<typeof createStore>) => {
    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      return React.createElement(Provider, { store, children });
    };
    return Wrapper;
  };

  it('returns config from Redux state', () => {
    const mockConfig: Partial<Config> = {
      menu: [
        {
          label: 'About Jaeger',
          items: [
            {
              label: 'Documentation',
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
      linkPatterns: [],
      dependencies: {
        dagMaxNumServices: 100,
        menuEnabled: true,
      },
    };

    const store = createMockStore(mockConfig);
    const { result } = renderHook(() => useConfig(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.menu).toEqual(mockConfig.menu);
    expect(result.current.search).toEqual(mockConfig.search);
    expect(result.current.dependencies).toEqual(mockConfig.dependencies);
  });

  it('returns updated config when state changes', () => {
    const initialConfig: Partial<Config> = {
      menu: [],
      search: {
        maxLookback: {
          label: '1 Day',
          value: '1d',
        },
        maxLimit: 1000,
      },
      linkPatterns: [],
      dependencies: {
        dagMaxNumServices: 50,
        menuEnabled: false,
      },
    };

    let currentConfig = initialConfig;
    const dynamicStore = createStore(() => {
      const fullConfig: Config = {
        criticalPathEnabled: false,
        disableFileUploadControl: false,
        disableJsonView: false,
        forbidNewPage: false,
        themes: { enabled: true },
        useOpenTelemetryTerms: false,
        menu: [],
        ...currentConfig,
      };
      return { config: fullConfig } as ReduxState;
    });

    const { result, rerender } = renderHook(() => useConfig(), {
      wrapper: createWrapper(dynamicStore),
    });

    expect(result.current.search).toEqual(initialConfig.search);

    // Simulate config change
    const updatedConfig: Partial<Config> = {
      ...initialConfig,
      search: {
        maxLookback: {
          label: '7 Days',
          value: '7d',
        },
        maxLimit: 2000,
      },
    };

    currentConfig = updatedConfig;
    const newStore = createStore(() => {
      const fullConfig: Config = {
        criticalPathEnabled: false,
        disableFileUploadControl: false,
        disableJsonView: false,
        forbidNewPage: false,
        themes: { enabled: true },
        useOpenTelemetryTerms: false,
        menu: [],
        ...currentConfig,
      };
      return { config: fullConfig } as ReduxState;
    });

    const { result: newResult } = renderHook(() => useConfig(), {
      wrapper: createWrapper(newStore),
    });

    expect(newResult.current.search).toEqual(updatedConfig.search);
  });

  it('works correctly with minimal config', () => {
    const minimalConfig: Partial<Config> = {
      menu: [],
      linkPatterns: [],
      dependencies: {
        dagMaxNumServices: 100,
        menuEnabled: true,
      },
    };

    const store = createMockStore(minimalConfig);
    const { result } = renderHook(() => useConfig(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.menu).toEqual([]);
    expect(result.current.linkPatterns).toEqual([]);
  });

  it('returns config with link patterns', () => {
    const configWithLinkPatterns: Partial<Config> = {
      menu: [],
      linkPatterns: [
        {
          type: 'process',
          key: 'hostname',
          url: 'http://example.com/host/#{hostname}',
          text: 'View host: #{hostname}',
        },
        {
          type: 'logs',
          key: 'traceID',
          url: 'http://logs.example.com/trace/#{traceID}',
          text: 'View logs',
        },
      ],
      dependencies: {
        dagMaxNumServices: 100,
        menuEnabled: true,
      },
    };

    const store = createMockStore(configWithLinkPatterns);
    const { result } = renderHook(() => useConfig(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.linkPatterns).toHaveLength(2);
  });

  it('returns config with archiveEnabled', () => {
    const configWithArchive: Partial<Config> = {
      menu: [],
      linkPatterns: [],
      dependencies: {
        dagMaxNumServices: 100,
        menuEnabled: true,
      },
      archiveEnabled: true,
    };

    const store = createMockStore(configWithArchive);
    const { result } = renderHook(() => useConfig(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.archiveEnabled).toBe(true);
  });

  it('returns config with tracking settings', () => {
    const configWithTracking: Partial<Config> = {
      menu: [],
      linkPatterns: [],
      dependencies: {
        dagMaxNumServices: 100,
        menuEnabled: true,
      },
      tracking: {
        gaID: 'UA-000000-2',
        trackErrors: true,
        customWebAnalytics: null,
      },
    };

    const store = createMockStore(configWithTracking);
    const { result } = renderHook(() => useConfig(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.tracking).toEqual({
      gaID: 'UA-000000-2',
      trackErrors: true,
      customWebAnalytics: null,
    });
  });
});
