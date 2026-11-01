// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getAppEnvironment, getVersionInfo, shouldDebugGoogleAnalytics } from './constants';

const globalObj = globalThis as Record<string, unknown>;
globalObj.__APP_ENVIRONMENT__ = 'test';
globalObj.__REACT_APP_VSN_STATE__ = '{"version":"1.2.3"}';
globalObj.__REACT_APP_GA_DEBUG__ = 'true';

describe('constants real implementation', () => {
  it('should return correct app environment', () => {
    expect(getAppEnvironment()).toBe('test');
  });

  it('should return version info string', () => {
    expect(getVersionInfo()).toBe('{"version":"1.2.3"}');
  });

  it('should return GA debug flag', () => {
    expect(shouldDebugGoogleAnalytics()).toBe('true');
  });
});
