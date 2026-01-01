// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useSelector } from 'react-redux';
import { ReduxState } from '../types';
import { IOtelSpan } from '../types/otel';
import { selectOtelSpans } from '../selectors/otel';

export const useOtelSpan = (traceId: string, spanId: string): IOtelSpan | null => {
  const spans = useSelector((state: ReduxState) => selectOtelSpans(state, traceId));
  return spans.find(s => s.spanId === spanId) || null;
};
