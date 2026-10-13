// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import prefixUrl from '../utils/prefix-url';

export const DEFAULT_API_ROOT = prefixUrl('/api/');

// Shared while requests migrate from JaegerAPI to JaegerClient.
export const apiConfig = { apiRoot: DEFAULT_API_ROOT };
