// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { ReduxState } from '../types';
import { IOtelTrace, IOtelSpan } from '../types/otel';
import OtelTraceFacade from '../model/OtelTraceFacade';

export const selectOtelTrace = (state: ReduxState, traceId: string): IOtelTrace | null => {
  const trace = state.trace.traces[traceId];
  return trace && trace.data ? new OtelTraceFacade(trace.data) : null;
};

export const selectOtelSpans = (state: ReduxState, traceId: string): IOtelSpan[] => {
  const trace = selectOtelTrace(state, traceId);
  return trace ? trace.spans : [];
};
