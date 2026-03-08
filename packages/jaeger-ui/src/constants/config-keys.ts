// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// Fields that should be merged with user-supplied config values rather than overwritten.
export type TMergeField = 'dependencies' | 'search' | 'tracking' | 'monitor';
export const mergeFields: readonly TMergeField[] = ['dependencies', 'search', 'tracking', 'monitor'];
