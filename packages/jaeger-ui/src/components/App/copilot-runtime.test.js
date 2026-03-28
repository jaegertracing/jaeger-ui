// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getJaegerCopilotRuntimeUrl } from './copilot-runtime';

describe('getJaegerCopilotRuntimeUrl', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it('returns trimmed URL when REACT_APP_JAEGER_COPILOT_RUNTIME_URL is set', () => {
    process.env.REACT_APP_JAEGER_COPILOT_RUNTIME_URL = '  https://copilot.example/api  ';
    delete process.env.VITE_JAEGER_COPILOT_RUNTIME_URL;
    expect(getJaegerCopilotRuntimeUrl()).toBe('https://copilot.example/api');
  });

  it('returns trimmed URL when VITE_JAEGER_COPILOT_RUNTIME_URL is set', () => {
    delete process.env.REACT_APP_JAEGER_COPILOT_RUNTIME_URL;
    process.env.VITE_JAEGER_COPILOT_RUNTIME_URL = '  https://vite-copilot.example/api  ';
    expect(getJaegerCopilotRuntimeUrl()).toBe('https://vite-copilot.example/api');
  });

  it('returns undefined when the env var is missing or blank in production-like mode', () => {
    delete process.env.REACT_APP_JAEGER_COPILOT_RUNTIME_URL;
    delete process.env.DEV;
    expect(getJaegerCopilotRuntimeUrl()).toBeUndefined();
  });

  it('returns /jaeger-assistant in dev when env var is unset (DEV fallback)', () => {
    delete process.env.REACT_APP_JAEGER_COPILOT_RUNTIME_URL;
    process.env.DEV = 'true';
    expect(getJaegerCopilotRuntimeUrl()).toBe('/jaeger-assistant');
  });
});
