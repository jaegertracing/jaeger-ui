// Copyright (c) 2023 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Provides access to constants injected by the build system.
 */

/**
 * Get the current execution environment, as inferred from NODE_ENV at build time.
 */
export function getAppEnvironment() {
  return __APP_ENVIRONMENT__;
}

/**
 * Get injected version details as a JSON-formatted string.
 */
export function getVersionInfo() {
  return __REACT_APP_VSN_STATE__;
}

export function shouldDebugGoogleAnalytics() {
  return __REACT_APP_GA_DEBUG__;
}
