// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { generateTableData } from './generateTableData';
import testTrace from './testTrace.json';
import transformTraceData from '../../../model/transform-trace-data';

const otelTrace = transformTraceData(testTrace.data as any)!.asOtelTrace();

describe('generateTableData', () => {
  it('returns one row per unique service:operation', () => {
    const rows = generateTableData(otelTrace);
    expect(rows).toHaveLength(4);
    expect(rows.map(r => r.name).sort()).toEqual([
      'load-generator: HTTP GET',
      'load-generator: OrderVehicle',
      'ride-sharing-app: BikeHandler',
      'ride-sharing-app: FindNearestVehicle',
    ]);
  });

  it('shows sum of span durations as total', () => {
    const rows = generateTableData(otelTrace);
    const root = rows.find(r => r.name === 'load-generator: OrderVehicle')!;
    // Only one span with this name, so sum == single duration
    expect(root.total).toBe(1181596);
  });

  it('computes self time as duration minus non-overlapping children', () => {
    const rows = generateTableData(otelTrace);
    // OrderVehicle (1181596) has child HTTP GET (968334)
    // self = 1181596 - 968334 = 213262
    const root = rows.find(r => r.name === 'load-generator: OrderVehicle')!;
    expect(root.self).toBe(1181596 - 968334);
  });

  it('self time equals duration for leaf spans', () => {
    const rows = generateTableData(otelTrace);
    const leaf = rows.find(r => r.name === 'ride-sharing-app: FindNearestVehicle')!;
    expect(leaf.self).toBe(leaf.total);
  });

  it('extracts serviceName correctly', () => {
    const rows = generateTableData(otelTrace);
    const row = rows.find(r => r.name === 'load-generator: OrderVehicle')!;
    expect(row.serviceName).toBe('load-generator');
  });

  it('includes count field', () => {
    const rows = generateTableData(otelTrace);
    for (const row of rows) {
      expect(row.count).toBeGreaterThanOrEqual(1);
    }
  });

  it('groups spans by name and sums their durations', () => {
    const mockTrace = {
      spans: [
        {
          spanID: 's1',
          name: 'GET /api',
          duration: 100,
          startTime: 0,
          endTime: 100,
          hasChildren: false,
          childSpans: [],
          resource: { serviceName: 'frontend', attributes: [] },
        },
        {
          spanID: 's2',
          name: 'GET /api',
          duration: 50,
          startTime: 200,
          endTime: 250,
          hasChildren: false,
          childSpans: [],
          resource: { serviceName: 'frontend', attributes: [] },
        },
      ],
    } as any;

    const rows = generateTableData(mockTrace);
    expect(rows).toHaveLength(1);
    expect(rows[0].total).toBe(150); // 100 + 50
    expect(rows[0].self).toBe(150); // both are leaves, self = duration
    expect(rows[0].count).toBe(2);
  });

  it('handles overlapping children correctly', () => {
    const mockTrace = {
      spans: [
        {
          spanID: 'parent',
          name: 'parent-op',
          duration: 100,
          startTime: 0,
          endTime: 100,
          hasChildren: true,
          childSpans: [
            {
              spanID: 'c1',
              name: 'child-1',
              duration: 60,
              startTime: 10,
              endTime: 70,
              hasChildren: false,
              childSpans: [],
              resource: { serviceName: 'svc', attributes: [] },
            },
            {
              spanID: 'c2',
              name: 'child-2',
              duration: 40,
              startTime: 50,
              endTime: 90,
              hasChildren: false,
              childSpans: [],
              resource: { serviceName: 'svc', attributes: [] },
            },
          ],
          resource: { serviceName: 'svc', attributes: [] },
        },
        {
          spanID: 'c1',
          name: 'child-1',
          duration: 60,
          startTime: 10,
          endTime: 70,
          hasChildren: false,
          childSpans: [],
          resource: { serviceName: 'svc', attributes: [] },
        },
        {
          spanID: 'c2',
          name: 'child-2',
          duration: 40,
          startTime: 50,
          endTime: 90,
          hasChildren: false,
          childSpans: [],
          resource: { serviceName: 'svc', attributes: [] },
        },
      ],
    } as any;

    const rows = generateTableData(mockTrace);
    const parent = rows.find(r => r.name === 'svc: parent-op')!;
    // children: c1 [10,70], c2 [50,90]
    // non-overlapping coverage: [10, 90] = 80
    // self = 100 - 80 = 20
    expect(parent.self).toBe(20);
  });
});
