// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { SpanData, TraceData } from '../types/trace';

/**
 * A span spec describes identity, parentage, timing, and attributes under test.
 * The pipeline adds wire-format boilerplate (process, empty logs, and the traceID
 * on every reference) when it materializes the spec. startTime is copied as given,
 * so a spec can omit it or set it to 0 or NaN to exercise the timestamp repair paths.
 */
interface ISpanSpec {
  spanID: string;
  operationName: string;
  parentSpanID?: string;
  references?: { refType: 'CHILD_OF' | 'FOLLOWS_FROM'; spanID: string }[];
  startTime?: number;
  duration: number;
  tags?: { key: string; value: string | number | boolean }[];
}

export interface ITraceSpec {
  traceID: string;
  serviceName: string;
  spans: ISpanSpec[];
}

const PROCESS_ID = 'p1';

/** Renders a trace spec as the legacy /api/traces JSON that transformTraceData() reads. */
export function toLegacyTrace({
  traceID,
  serviceName,
  spans,
}: ITraceSpec): TraceData & { spans: SpanData[] } {
  return {
    traceID,
    processes: { [PROCESS_ID]: { serviceName, tags: [] } },
    spans: spans.map(
      ({ spanID, operationName, parentSpanID, references = [], startTime, duration, tags }) => {
        const parentRef = parentSpanID ? [{ refType: 'CHILD_OF' as const, spanID: parentSpanID }] : [];
        return {
          traceID,
          spanID,
          operationName,
          references: [...parentRef, ...references].map(ref => ({ ...ref, traceID, span: undefined })),
          // SpanData declares startTime as required; a spec leaves it out on purpose
          // to exercise the repair path, so the cast below is intentional.
          ...(startTime === undefined ? {} : { startTime }),
          duration,
          tags: tags ?? [],
          logs: [],
          processID: PROCESS_ID,
        } as SpanData;
      }
    ),
  };
}
