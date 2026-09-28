// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { SpanData, TraceData } from '../types/trace';

export const ids = {
  root: 'd4dcb46e95b781f5',
  child: '41f71485ed2593e4',
  sibling: '4f623fd33c213cba',
  grandchild: '5a6b7c8d9e0f1234',
  orphan: 'aaaaaaaaaaaaaaaa',
  secondRoot: 'bbbbbbbbbbbbbbbb',
  missing: 'eeeeeeeeeeeeeeee',
};

export interface ITraceContractCase {
  name: string;
  input: TraceData & { spans: SpanData[] };
  order: string[];
  depths: number[];
  roots: string[];
  orphanCount: number;
}

// Extracted from transform-trace-data.test.js's timestamp-repair and collection
// cases. IDs are valid hex; NaN stays in the original legacy-only test because
// it cannot survive a backend conversion. Missing timestamps stay omitted here.
export function traceContractCases(): ITraceContractCase[] {
  let counter = 0;
  const make = (
    name: string,
    spans: Array<Partial<SpanData> & Pick<SpanData, 'spanID'>>,
    order: string[],
    depths: number[],
    roots = [ids.root],
    orphanCount = 0
  ): ITraceContractCase => {
    const traceID = `f77950feed55c1ce91dd8e8789${String(++counter).padStart(6, '0')}`;
    return {
      name,
      order,
      depths,
      roots,
      orphanCount,
      input: {
        traceID,
        processes: { p1: { serviceName: 'test-service', tags: [] } },
        spans: spans.map(span => ({
          traceID,
          operationName: 'test-op',
          processID: 'p1',
          startTime: 1000,
          duration: 100,
          tags: [],
          logs: [],
          ...span,
          references: span.references?.map(ref => ({ ...ref, traceID })),
        })),
      },
    };
  };
  const child = (
    spanID: string,
    parentID: string,
    startTime = 1010
  ): Partial<SpanData> & Pick<SpanData, 'spanID'> => ({
    spanID,
    startTime,
    references: [{ refType: 'CHILD_OF', traceID: '', spanID: parentID, span: null }],
  });
  const root = { spanID: ids.root, startTime: 1000, duration: 1000 };
  const realStart = 1784570820629325;
  const fieldMapping = make(
    'field-mapping',
    [root, child(ids.child, ids.root)],
    [ids.root, ids.child],
    [0, 1]
  );
  fieldMapping.input.processes.p1.tags = [{ key: 'res-tag', value: 'res-val' }];
  fieldMapping.input.spans[0].tags = [
    { key: 'span.kind', value: 'server' },
    { key: 'error', value: 'true' },
    { key: 'http.method', value: 'GET' },
    { key: 'otel.library.name', value: 'test-lib' },
    { key: 'otel.library.version', value: '1.0' },
    { key: 'gen_ai.operation.name', value: 'chat' },
  ];
  fieldMapping.input.spans[0].logs = [
    {
      timestamp: 1100,
      fields: [
        { key: 'event', value: 'test-event' },
        { key: 'foo', value: 'bar' },
      ],
    },
  ];
  const multiService = make(
    'multi-service',
    [child(ids.child, ids.root), root, child(ids.sibling, ids.root, 1020)],
    [ids.root, ids.child, ids.sibling],
    [0, 1, 1]
  );
  multiService.input.processes.p2 = { serviceName: 'second-service', tags: [] };
  multiService.input.spans[0].processID = 'p2';
  const shuffled = make(
    'shuffled-hierarchy',
    [
      child(ids.sibling, ids.root, 1020),
      child(ids.grandchild, ids.child, 1015),
      child(ids.child, ids.root),
      root,
    ],
    [ids.root, ids.child, ids.grandchild, ids.sibling],
    [0, 1, 2, 1]
  );
  return [
    fieldMapping,
    multiService,
    shuffled,
    make(
      'hierarchy',
      [
        root,
        child(ids.child, ids.root),
        child(ids.sibling, ids.root, 1020),
        child(ids.grandchild, ids.child, 1015),
      ],
      [ids.root, ids.child, ids.grandchild, ids.sibling],
      [0, 1, 2, 1]
    ),
    make(
      'all-zero',
      [
        { ...root, startTime: 0 },
        child(ids.child, ids.root, 0),
        { ...child(ids.sibling, ids.root), startTime: undefined } as unknown as SpanData,
      ],
      [ids.root, ids.child, ids.sibling],
      [0, 1, 1]
    ),
    make(
      'repaired-chain',
      [
        { ...root, startTime: realStart },
        { ...child(ids.child, ids.root, 0), duration: 200 },
        { ...child(ids.grandchild, ids.child), startTime: undefined, duration: 50 } as unknown as SpanData,
      ],
      [ids.root, ids.child, ids.grandchild],
      [0, 1, 2]
    ),
    make(
      'repaired-siblings',
      [
        { ...root, startTime: realStart },
        { ...child(ids.child, ids.root), startTime: undefined } as unknown as SpanData,
        child(ids.sibling, ids.root, 0),
        child(ids.grandchild, ids.root, realStart + 500),
      ],
      [ids.root, ids.child, ids.sibling, ids.grandchild],
      [0, 1, 1, 1]
    ),
    make(
      'missing-root',
      [{ ...root, startTime: undefined } as unknown as SpanData, child(ids.child, ids.root, 0)],
      [ids.root, ids.child],
      [0, 1]
    ),
    make(
      'orphan',
      [child(ids.root, ids.missing, 1000), child(ids.child, ids.root)],
      [ids.root, ids.child],
      [0, 1],
      [ids.root],
      1
    ),
    make(
      'multiple-orphans',
      [child(ids.root, ids.missing, 1000), child(ids.orphan, ids.missing, 1020)],
      [ids.root, ids.orphan],
      [0, 0],
      [ids.root, ids.orphan],
      2
    ),
    make(
      'multiple-roots',
      [root, { spanID: ids.secondRoot, startTime: 1100 }],
      [ids.root, ids.secondRoot],
      [0, 0],
      [ids.root, ids.secondRoot]
    ),
    make(
      'secondary-reference',
      [
        root,
        child(ids.child, ids.root),
        {
          ...child(ids.sibling, ids.root, 1020),
          references: [
            ...child(ids.sibling, ids.root).references!,
            { refType: 'FOLLOWS_FROM', traceID: '', spanID: ids.child, span: null },
          ],
        },
      ],
      [ids.root, ids.child, ids.sibling],
      [0, 1, 1]
    ),
    make(
      'secondary-child-of',
      [
        root,
        child(ids.child, ids.root),
        {
          ...child(ids.sibling, ids.root, 1020),
          references: [
            ...child(ids.sibling, ids.root).references!,
            { refType: 'CHILD_OF', traceID: '', spanID: ids.child, span: null },
          ],
        },
      ],
      [ids.root, ids.child, ids.sibling],
      [0, 1, 1]
    ),
    make(
      'follows-from-parent',
      [
        root,
        {
          spanID: ids.child,
          startTime: 1010,
          references: [{ refType: 'FOLLOWS_FROM', traceID: '', spanID: ids.root, span: null }],
        },
      ],
      [ids.root, ids.child],
      [0, 1]
    ),
    make(
      'duplicate-id',
      [root, { ...root, startTime: 1100, operationName: 'duplicate' }],
      [ids.root, `${ids.root}_1`],
      [0, 0],
      [ids.root, `${ids.root}_1`]
    ),
  ];
}

export function traceContractDifferences() {
  const cases = traceContractCases();
  const cycle = structuredClone(cases.find(item => item.name === 'hierarchy')!.input);
  cycle.spans = cycle.spans.slice(0, 2);
  cycle.spans[0].references = [
    { refType: 'CHILD_OF', traceID: cycle.traceID, spanID: ids.child, span: null },
  ];
  const crossTrace = structuredClone(cases.find(item => item.name === 'secondary-reference')!.input);
  crossTrace.spans[2].references![1].traceID = '0123456789abcdef0123456789abcdef';
  return [
    { name: 'parent-cycle', input: cycle },
    { name: 'cross-trace-link', input: crossTrace },
  ];
}
