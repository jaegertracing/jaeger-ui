// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

export type SearchQuery = {
  // Target
  service?: string;
  operation?: string;
  // Time window
  start: number | string;
  end: number | string;
  lookback: string;
  // Filters
  minDuration?: string;
  maxDuration?: string;
  tags?: string;
  // Pagination
  limit: number | string;
};
