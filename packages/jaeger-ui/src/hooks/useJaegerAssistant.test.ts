// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

vi.mock('./useConfig');
vi.mock('../components/App/jaeger-AG-UI', () => ({
  getJaegerAGUIUrl: vi.fn(() => '/api/ai/chat'),
}));

import { renderHook } from '@testing-library/react';
import { getJaegerAGUIUrl } from '../components/App/jaeger-AG-UI';
import { useConfig } from './useConfig';
import { useJaegerAssistantConfigured, useJaegerAssistantEnabled } from './useJaegerAssistant';

const mockUseConfig = vi.mocked(useConfig);
const mockGetJaegerAgUiUrl = vi.mocked(getJaegerAGUIUrl);

const baseConfig = {
  criticalPathEnabled: false,
  disableFileUploadControl: false,
  disableJsonView: false,
  forbidNewPage: false,
  themes: { enabled: true },
  useOpenTelemetryTerms: false,
  menu: [],
  backendCapabilities: { aiAssistant: false },
  api: {
    requestTimeoutMs: 10000,
  },
};

describe('useJaegerAssistant', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue(baseConfig as ReturnType<typeof useConfig>);
    mockGetJaegerAgUiUrl.mockReturnValue('/api/ai/chat');
  });

  describe('useJaegerAssistantEnabled', () => {
    it('is false when backendCapabilities.aiAssistant is false', () => {
      const { result } = renderHook(() => useJaegerAssistantEnabled());
      expect(result.current).toBe(false);
    });

    it('is true when backendCapabilities.aiAssistant is true', () => {
      mockUseConfig.mockReturnValue({
        ...baseConfig,
        backendCapabilities: { aiAssistant: true },
      } as ReturnType<typeof useConfig>);
      const { result } = renderHook(() => useJaegerAssistantEnabled());
      expect(result.current).toBe(true);
    });
  });

  describe('useJaegerAssistantConfigured', () => {
    it('is false when the capability is off', () => {
      const { result } = renderHook(() => useJaegerAssistantConfigured());
      expect(result.current).toBe(false);
    });

    it('is true when the capability is on and URL is set', () => {
      mockUseConfig.mockReturnValue({
        ...baseConfig,
        backendCapabilities: { aiAssistant: true },
      } as ReturnType<typeof useConfig>);
      const { result } = renderHook(() => useJaegerAssistantConfigured());
      expect(result.current).toBe(true);
    });

    it('is false when the capability is on but URL is empty', () => {
      mockUseConfig.mockReturnValue({
        ...baseConfig,
        backendCapabilities: { aiAssistant: true },
      } as ReturnType<typeof useConfig>);
      mockGetJaegerAgUiUrl.mockReturnValue('');
      const { result } = renderHook(() => useJaegerAssistantConfigured());
      expect(result.current).toBe(false);
    });
  });
});
