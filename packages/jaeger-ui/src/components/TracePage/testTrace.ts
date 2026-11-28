// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { transformOtelTrace } from '../../api/v3/parser';
import { validateTracesData } from '../../api/v3/schemas';
import { IOtelTrace } from '../../types/otel';
import testTraceJson from './testTrace.json';

// Each call returns a new trace, so a caller that changes its trace does not change
// the trace of another caller.
export function loadTestTrace(): IOtelTrace {
  return transformOtelTrace(validateTracesData(testTraceJson))!;
}
