// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// Singleton React Query cache keys for search-page data.
// All code that reads or writes these caches must import from here.
export const QUERY_KEY_TRACE_SUMMARIES = ['traceSummaries'] as const;
export const QUERY_KEY_UPLOADED_SUMMARIES = ['uploadedSummaries'] as const;
export const QUERY_KEY_UPLOADED_RAW_TRACES = ['uploadedRawTraces'] as const;
