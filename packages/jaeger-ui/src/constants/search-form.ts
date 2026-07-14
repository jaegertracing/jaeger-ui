// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

export const DEFAULT_OPERATION = 'all';
export const DEFAULT_LOOKBACK = '1h';
export const DEFAULT_LIMIT = 20;
export const DEFAULT_SPAN_KIND = 'all';

// Mirrors the label/value set already used by Monitor/ServicesView's span kind filter.
export const SPAN_KIND_OPTIONS = [
  { label: 'Client', value: 'client' },
  { label: 'Server', value: 'server' },
  { label: 'Internal', value: 'internal' },
  { label: 'Producer', value: 'producer' },
  { label: 'Consumer', value: 'consumer' },
];
