// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { generateTableData } from './generateTableData';
import { convertOtelTraceToFlameData, IFlameNode } from './convertOtelTraceToFlameData';
import testTrace from './testTrace.json';
import transformTraceData from '../../../model/transform-trace-data';

const otelTrace = transformTraceData(testTrace.data as any)!.asOtelTrace();
const flameData = convertOtelTraceToFlameData(otelTrace);

describe('generateTableData', () => {
  it('returns one row per unique service:operation plus the virtual root', () => {
    const rows = generateTableData(flameData);
    const names = rows.map(r => r.name).sort();
    expect(names).toContain('load-generator: OrderVehicle');
    expect(names).toContain('load-generator: HTTP GET');
    expect(names).toContain('ride-sharing-app: FindNearestVehicle');
    expect(names).toContain('ride-sharing-app: BikeHandler');
    expect(names).toContain('total');
  });

  it('sets total to the aggregated node value', () => {
    const rows = generateTableData(flameData);
    const root = rows.find(r => r.name === 'load-generator: OrderVehicle')!;
    expect(root.total).toBe(1181596);
  });

  it('computes self time as value minus sum of children values', () => {
    const rows = generateTableData(flameData);
    // OrderVehicle (1181596) has child HTTP GET (968334)
    // self = 1181596 - 968334 = 213262
    const root = rows.find(r => r.name === 'load-generator: OrderVehicle')!;
    expect(root.self).toBe(1181596 - 968334);
  });

  it('self time equals total for leaf nodes', () => {
    const rows = generateTableData(flameData);
    const leaf = rows.find(r => r.name === 'ride-sharing-app: FindNearestVehicle')!;
    expect(leaf.self).toBe(leaf.total);
  });

  it('extracts serviceName correctly', () => {
    const rows = generateTableData(flameData);
    const row = rows.find(r => r.name === 'load-generator: OrderVehicle')!;
    expect(row.serviceName).toBe('load-generator');
  });

  it('includes count field for grouped nodes', () => {
    const rows = generateTableData(flameData);
    for (const row of rows) {
      expect(row.count).toBeGreaterThanOrEqual(1);
    }
  });

  it('aggregates nodes with the same name', () => {
    const tree: IFlameNode = {
      name: 'total',
      value: 200,
      children: [
        { name: 'svc: op-A', value: 100, children: [] },
        { name: 'svc: op-A', value: 100, children: [] },
      ],
    };
    const rows = generateTableData(tree);
    const opA = rows.find(r => r.name === 'svc: op-A')!;
    expect(opA.total).toBe(200);
    expect(opA.self).toBe(200);
    expect(opA.count).toBe(2);
  });

  it('virtual root self time is zero when children account for all value', () => {
    const tree: IFlameNode = {
      name: 'total',
      value: 300,
      children: [
        { name: 'svc: A', value: 150, children: [] },
        { name: 'svc: B', value: 150, children: [] },
      ],
    };
    const rows = generateTableData(tree);
    const root = rows.find(r => r.name === 'total')!;
    expect(root.self).toBe(0);
  });
});
