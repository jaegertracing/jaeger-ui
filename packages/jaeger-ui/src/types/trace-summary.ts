// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Microseconds } from './units';

export type ServiceSummary = {
  name: string;
  spanCount: number | undefined;
  errorSpanCount: number | undefined;
};

export type TraceSummary = {
  traceID: string;
  traceName: string;
  rootServiceName: string;
  rootOperationName: string;
  startTime: Microseconds;
  duration: Microseconds;
  spanCount: number | undefined;
  errorSpanCount: number | undefined;
  orphanSpanCount: number | undefined;
  services: ServiceSummary[];
};
