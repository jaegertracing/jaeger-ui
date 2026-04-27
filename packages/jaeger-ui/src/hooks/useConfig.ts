// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import getConfig from '../utils/config/get-config';
import { Config } from '../types/config';

/**
 * Returns the application configuration.
 *
 * Config is static after app boot (assembled once from window.getJaegerUiConfig
 * and window.getJaegerStorageCapabilities, then memoized). This hook is a thin
 * wrapper so component code never imports getConfig directly — the backing
 * implementation can change without touching call sites.
 */
export function useConfig(): Config {
  return getConfig();
}
