// Copyright (c) 2026 The Jaeger Authors.
// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

// Reserved dropdown values meaning "do not filter on this field". Both are shaped so a
// real operation or service name cannot collide with them, and neither reaches the
// backend: the search API reads an absent name as "any".
export const ALL_OPERATIONS = '__all_operations__';
export const ALL_SERVICES = '__all_services__';

// LEGACY_ALL_OPERATIONS is the value ALL_OPERATIONS had while it was a plain word.
// Bookmarked search URLs and stored last-searches still carry it, so it is normalized on
// the way in; nothing emits it. Searching for an operation literally named "all" was not
// possible before either, so nothing is lost by claiming the value.
const LEGACY_ALL_OPERATIONS = 'all';

export function normalizeOperation(operation: string | undefined): string | undefined {
  return operation === LEGACY_ALL_OPERATIONS ? ALL_OPERATIONS : operation;
}

export const DEFAULT_LOOKBACK = '1h';
export const DEFAULT_LIMIT = 20;
