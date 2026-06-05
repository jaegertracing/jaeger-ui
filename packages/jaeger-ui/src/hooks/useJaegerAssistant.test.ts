// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

vi.mock('./useConfig');
vi.mock('../components/App/jaeger-AG-UI', () => ({
  getJaegerAgUiUrl: vi.fn(() => '/api/ai/chat'),
}));

import { renderHook } from '@testing-library/react';
import { getJaegerAgUiUrl } from '../components/App/jaeger-AG-UI';
import { useConfig } from './useConfig';
import { useJaegerAssistantConfigured, useJaegerAssistantEnabled } from './useJaegerAssistant';

const mockUseConfig = vi.mocked(useConfig);
const mockGetJaegerAgUiUrl = vi.mocked(getJaegerAgUiUrl);

const baseConfig = {
  criticalPathEnabled: false,
  disableFileUploadControl: false,
  disableJsonView: false,
  forbidNewPage: false,
  themes: { enabled: true },
  useOpenTelemetryTerms: false,
  menu: [],
  ai: { enabled: false },
};

describe('useJaegerAssistant', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue(baseConfig as ReturnType<typeof useConfig>);
    mockGetJaegerAgUiUrl.mockReturnValue('/api/ai/chat');
  });

  describe('useJaegerAssistantEnabled', () => {
    it('is false when ai.enabled is false', () => {
      const { result } = renderHook(() => useJaegerAssistantEnabled());
      expect(result.current).toBe(false);
    });

    it('is true when ai.enabled is true', () => {
      mockUseConfig.mockReturnValue({ ...baseConfig, ai: { enabled: true } } as ReturnType<typeof useConfig>);
      const { result } = renderHook(() => useJaegerAssistantEnabled());
      expect(result.current).toBe(true);
    });
  });

  describe('useJaegerAssistantConfigured', () => {
    it('is false when ai.enabled is false', () => {
      const { result } = renderHook(() => useJaegerAssistantConfigured());
      expect(result.current).toBe(false);
    });

    it('is true when ai.enabled is true and URL is set', () => {
      mockUseConfig.mockReturnValue({ ...baseConfig, ai: { enabled: true } } as ReturnType<typeof useConfig>);
      const { result } = renderHook(() => useJaegerAssistantConfigured());
      expect(result.current).toBe(true);
    });

    it('is false when ai.enabled is true but URL is empty', () => {
      mockUseConfig.mockReturnValue({ ...baseConfig, ai: { enabled: true } } as ReturnType<typeof useConfig>);
      mockGetJaegerAgUiUrl.mockReturnValue('');
      const { result } = renderHook(() => useJaegerAssistantConfigured());
      expect(result.current).toBe(false);
    });
  });
});
