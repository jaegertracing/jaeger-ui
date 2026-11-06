// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getJaegerAGUIUrl } from './jaeger-AG-UI';

describe('getJaegerAGUIUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('falls back to the backend AI endpoint when the variable is not set', () => {
    vi.stubEnv('VITE_JAEGER_AG_UI_URL', undefined);
    expect(getJaegerAGUIUrl()).toBe('/api/ai/chat');
  });

  it('returns the trimmed variable when it is set', () => {
    vi.stubEnv('VITE_JAEGER_AG_UI_URL', '  http://agent.example/ag-ui  ');
    expect(getJaegerAGUIUrl()).toBe('http://agent.example/ag-ui');
  });

  it('returns an empty string when the variable is set to empty, which turns the assistant off', () => {
    vi.stubEnv('VITE_JAEGER_AG_UI_URL', '');
    expect(getJaegerAGUIUrl()).toBe('');
  });
});
