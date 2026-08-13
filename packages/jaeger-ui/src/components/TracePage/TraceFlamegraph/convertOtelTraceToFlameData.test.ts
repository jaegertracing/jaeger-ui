// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { convertOtelTraceToFlameData } from './convertOtelTraceToFlameData';
import testTrace from './testTrace.json';
import transformTraceData from '../../../model/transform-trace-data';

const otelTrace = transformTraceData(testTrace.data as any)!.asOtelTrace();

describe('convertOtelTraceToFlameData', () => {
  it('returns a root node with name "total"', () => {
    const result = convertOtelTraceToFlameData(otelTrace);
    expect(result.name).toBe('total');
  });

  it('root value equals sum of root span durations', () => {
    const result = convertOtelTraceToFlameData(otelTrace);
    expect(result.value).toBe(otelTrace.rootSpans.reduce((sum, s) => sum + s.duration, 0));
  });

  it('produces correct hierarchy for the test trace', () => {
    const result = convertOtelTraceToFlameData(otelTrace);
    // Test trace: OrderVehicle -> HTTP GET -> BikeHandler -> FindNearestVehicle
    expect(result.children).toHaveLength(1);
    const root = result.children[0];
    expect(root.name).toBe('load-generator: OrderVehicle');
    expect(root.value).toBe(1181596);

    expect(root.children).toHaveLength(1);
    const httpGet = root.children[0];
    expect(httpGet.name).toBe('load-generator: HTTP GET');
    expect(httpGet.value).toBe(968334);

    expect(httpGet.children).toHaveLength(1);
    const bikeHandler = httpGet.children[0];
    expect(bikeHandler.name).toBe('ride-sharing-app: BikeHandler');
    expect(bikeHandler.value).toBe(967066);

    expect(bikeHandler.children).toHaveLength(1);
    const findNearest = bikeHandler.children[0];
    expect(findNearest.name).toBe('ride-sharing-app: FindNearestVehicle');
    expect(findNearest.value).toBe(966333);
    expect(findNearest.children).toHaveLength(0);
  });

  it('groups children with the same service:operation name', () => {
    const mockTrace = {
      rootSpans: [
        {
          spanID: 'root',
          name: 'parent-op',
          duration: 100,
          resource: { serviceName: 'svc-a', attributes: [] },
          childSpans: [
            {
              spanID: 'c1',
              name: 'child-op',
              duration: 30,
              resource: { serviceName: 'svc-b', attributes: [] },
              childSpans: [],
            },
            {
              spanID: 'c2',
              name: 'child-op',
              duration: 40,
              resource: { serviceName: 'svc-b', attributes: [] },
              childSpans: [],
            },
            {
              spanID: 'c3',
              name: 'other-op',
              duration: 20,
              resource: { serviceName: 'svc-b', attributes: [] },
              childSpans: [],
            },
          ],
        },
      ],
    } as any;

    const result = convertOtelTraceToFlameData(mockTrace);
    const parent = result.children[0];
    expect(parent.children).toHaveLength(2);

    const grouped = parent.children.find(c => c.name === 'svc-b: child-op');
    expect(grouped).toBeDefined();
    expect(grouped!.value).toBe(70); // 30 + 40

    const other = parent.children.find(c => c.name === 'svc-b: other-op');
    expect(other).toBeDefined();
    expect(other!.value).toBe(20);
  });

  it('handles traces with multiple root spans', () => {
    const mockTrace = {
      rootSpans: [
        {
          spanID: 'r1',
          name: 'op-a',
          duration: 50,
          resource: { serviceName: 'svc', attributes: [] },
          childSpans: [],
        },
        {
          spanID: 'r2',
          name: 'op-b',
          duration: 30,
          resource: { serviceName: 'svc', attributes: [] },
          childSpans: [],
        },
      ],
    } as any;

    const result = convertOtelTraceToFlameData(mockTrace);
    expect(result.value).toBe(80);
    expect(result.children).toHaveLength(2);
  });
});
