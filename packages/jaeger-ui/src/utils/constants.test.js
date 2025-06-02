// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

global.__APP_ENVIRONMENT__ = 'test';
global.__REACT_APP_VSN_STATE__ = '{"version":"1.2.3"}';
global.__REACT_APP_GA_DEBUG__ = 'true';

import { getAppEnvironment, getVersionInfo, shouldDebugGoogleAnalytics } from './constants';

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
