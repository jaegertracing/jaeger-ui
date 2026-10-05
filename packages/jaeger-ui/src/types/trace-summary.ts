// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Microseconds } from './units';

export type ServiceSummary = {
  name: string;
  spanCount?: number;
  errorSpanCount?: number;
};

export type TraceSummary = {
  // Set only for traces loaded from a local file. Absent summaries come from the backend.
  source?: 'upload';
  traceID: string;
  traceName: string;
  rootServiceName: string;
  rootOperationName: string;
  startTime: Microseconds;
  duration: Microseconds;
  spanCount?: number;
  errorSpanCount?: number;
  orphanSpanCount?: number;
  services: ServiceSummary[];
};
