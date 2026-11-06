// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from '../../../model/transform-trace-data';
import type { ITableSpan } from './types';
import { getColumnValues, getColumnValuesSecondDropdown } from './tableValues';

const names = ['__proto__', 'constructor', 'toString', 'hasOwnProperty'];

function makeTrace(name: string) {
  const traceID = '00000000000000000000000000003436';
  const transformed = transformTraceData({
    traceID,
    processes: { p1: { serviceName: 'database', tags: [] } },
    spans: [1000, 3000].map((duration, index) => ({
      traceID,
      spanID: (index + 1).toString(16).padStart(16, '0'),
      processID: 'p1',
      operationName: name,
      startTime: 1700000000000000 + index * 10000,
      duration,
      tags: [],
      logs: [],
      references: [],
    })),
  });
  if (!transformed) throw new Error('The statistics fixture must produce a trace');
  return transformed.asOtelTrace();
}

// Restore inherited objects before asserting, so a failing regression cannot
// leak mutated built-ins into other tests in this worker.
function captureAggregation(aggregate: () => ITableSpan[]) {
  const targets = [Object.prototype, Object, Object.prototype.toString, Object.prototype.hasOwnProperty];
  const snapshots = targets.map(target => Object.getOwnPropertyDescriptors(target));
  let rows: ITableSpan[] = [];
  let error: unknown;
  const changedProperties: string[] = [];
  try {
    rows = aggregate();
  } catch (caught) {
    error = caught;
  } finally {
    targets.forEach((target, index) => {
      const snapshot = snapshots[index];
      for (const key of Object.getOwnPropertyNames(target)) {
        if (!Object.hasOwn(snapshot, key)) {
          changedProperties.push(`${index}:${key}`);
          Reflect.deleteProperty(target, key);
        }
      }
      Object.defineProperties(target, snapshot);
    });
  }
  return { rows, error, changedProperties };
}

describe.each(['group', 'subgroup-parent', 'subgroup-value'] as const)(
  'statistics with inherited names in %s',
  mode => {
    it.each(names)('aggregates %s without altering inherited objects', name => {
      const trace = makeTrace(name);
      const { rows, error, changedProperties } = captureAggregation(() => {
        if (mode === 'group') return getColumnValues('Operation Name', trace, false);
        const first = mode === 'subgroup-parent' ? 'Operation Name' : 'Service Name';
        const second = mode === 'subgroup-parent' ? 'Service Name' : 'Operation Name';
        return getColumnValuesSecondDropdown(
          getColumnValues(first, trace, false),
          first,
          second,
          trace,
          false
        );
      });

      expect(error).toBeUndefined();
      expect(changedProperties).toEqual([]);
      expect(rows.find(row => row.name === name)).toMatchObject({
        count: 2,
        total: 4,
        avg: 2,
        min: 1,
        max: 3,
        selfTotal: 4,
        selfAvg: 2,
      });
      if (mode !== 'group') expect(rows.filter(row => row.isDetail)).toHaveLength(1);
    });
  }
);
