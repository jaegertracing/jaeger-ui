// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useSelector } from 'react-redux';
import { ReduxState } from '../types';
import { IOtelTrace } from '../types/otel';
import { selectOtelTrace } from '../selectors/otel';

export const useOtelTrace = (traceId: string): IOtelTrace | null => {
  return useSelector((state: ReduxState) => selectOtelTrace(state, traceId));
};
