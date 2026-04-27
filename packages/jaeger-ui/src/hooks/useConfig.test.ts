// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

vi.mock('../utils/config/get-config');

import { renderHook } from '@testing-library/react';
import getConfig from '../utils/config/get-config';
import { useConfig } from './useConfig';

const mockGetConfig = vi.mocked(getConfig);

const baseConfig = {
  criticalPathEnabled: false,
  disableFileUploadControl: false,
  disableJsonView: false,
  forbidNewPage: false,
  themes: { enabled: true },
  useOpenTelemetryTerms: false,
  menu: [],
};

beforeEach(() => {
  mockGetConfig.mockReset();
  mockGetConfig.mockReturnValue(baseConfig as any);
});

describe('useConfig', () => {
  it('returns config from getConfig()', () => {
    const menu = [{ label: 'About Jaeger', items: [{ label: 'Docs', url: 'https://jaegertracing.io' }] }];
    const search = { maxLookback: { label: '2 Days', value: '2d' }, maxLimit: 1500 };
    mockGetConfig.mockReturnValue({ ...baseConfig, menu, search } as any);

    const { result } = renderHook(() => useConfig());

    expect(result.current.menu).toEqual(menu);
    expect(result.current.search).toEqual(search);
  });

  it('returns config with link patterns', () => {
    const linkPatterns = [
      { type: 'process', key: 'hostname', url: 'http://example.com/#{hostname}', text: 'View host' },
    ];
    mockGetConfig.mockReturnValue({ ...baseConfig, linkPatterns } as any);

    const { result } = renderHook(() => useConfig());
    expect(result.current.linkPatterns).toHaveLength(1);
  });

  it('returns config with archiveEnabled', () => {
    mockGetConfig.mockReturnValue({ ...baseConfig, archiveEnabled: true } as any);

    const { result } = renderHook(() => useConfig());
    expect(result.current.archiveEnabled).toBe(true);
  });

  it('returns config with tracking settings', () => {
    const tracking = { gaID: 'UA-000000-2', trackErrors: true, customWebAnalytics: null };
    mockGetConfig.mockReturnValue({ ...baseConfig, tracking } as any);

    const { result } = renderHook(() => useConfig());
    expect(result.current.tracking).toEqual(tracking);
  });

  it('returns the expected config across rerenders', () => {
    const config = { ...baseConfig, archiveEnabled: true };
    mockGetConfig.mockReturnValue(config as any);
    const { result, rerender } = renderHook(() => useConfig());
    expect(result.current).toEqual(config);
    rerender();
    expect(result.current).toEqual(config);
  });
});
