// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from './transform-trace-data';
import { SpanData, TraceData } from '../types/trace';
import { runTraceContractSuite } from './trace-contract-suite';

const fixtures = import.meta.glob('./trace-contract/*.legacy.json', {
  eager: true,
  import: 'default',
}) as Record<string, TraceData & { spans: SpanData[] }>;

runTraceContractSuite({
  name: 'legacy transformer',
  isLegacy: true,
  load: (caseName: string) => {
    const fixture = fixtures[`./trace-contract/${caseName}.legacy.json`];
    if (!fixture) {
      throw new Error(`Missing legacy trace contract case: ${caseName}`);
    }
    return structuredClone(fixture);
  },
  parse: (traceData: TraceData & { spans: SpanData[] }) => transformTraceData(traceData)!.asOtelTrace(),
});
