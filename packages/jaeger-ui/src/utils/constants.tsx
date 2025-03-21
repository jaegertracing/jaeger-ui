// Copyright (c) 2023 The Jaeger Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
