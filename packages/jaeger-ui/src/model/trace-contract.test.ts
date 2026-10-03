// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from './transform-trace-data';
import { SpanData, TraceData } from '../types/trace';
import { toLegacyTrace } from './trace-contract-spec';
import { runTraceContractSuite } from './trace-contract-suite';

runTraceContractSuite({
  name: 'legacy transformer',
  isLegacy: true,
  materialize: toLegacyTrace,
  spanID: (label: string) => label,
  parse: (traceData: TraceData & { spans: SpanData[] }) => transformTraceData(traceData)!.asOtelTrace(),
});
