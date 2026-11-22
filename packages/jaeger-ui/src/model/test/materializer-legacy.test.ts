// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { toLegacyTrace } from './materializer-legacy';

it.each([
  { timing: {}, expected: { startTime: 1, duration: 1 } },
  { timing: { startTime: undefined }, expected: { duration: 1 } },
  { timing: { duration: undefined }, expected: { startTime: 1 } },
  { timing: { startTime: 0, duration: 0 }, expected: { startTime: 0, duration: 0 } },
  { timing: { startTime: NaN }, expected: { startTime: NaN, duration: 1 } },
  { timing: { duration: NaN }, expected: { startTime: 1, duration: NaN } },
])('materializes timing $timing as $expected', ({ timing, expected }) => {
  const trace = toLegacyTrace({
    traceID: 'trace',
    serviceName: 'service',
    spans: [{ spanID: 'span', name: 'op', ...timing }],
  });
  expect(trace.spans[0].duration).toBe(expected.duration);
  expect(trace.spans[0].startTime).toBe(expected.startTime);
  expect(Object.hasOwn(trace.spans[0], 'startTime')).toBe(Object.hasOwn(expected, 'startTime'));
  expect(Object.hasOwn(trace.spans[0], 'duration')).toBe(Object.hasOwn(expected, 'duration'));
});

it('renders one process per service in first-appearance order', () => {
  const trace = toLegacyTrace({
    traceID: 'trace',
    serviceName: 'default-service',
    resource: [{ key: 'deployment.environment', value: 'test' }],
    spans: [
      { spanID: 'root', name: 'root' },
      { spanID: 'child', name: 'child', parentSpanID: 'root', serviceName: 'other-service' },
      { spanID: 'sibling', name: 'sibling', parentSpanID: 'root' },
    ],
  });

  expect(trace.processes).toEqual({
    p1: { serviceName: 'default-service', tags: [{ key: 'deployment.environment', value: 'test' }] },
    p2: { serviceName: 'other-service', tags: [{ key: 'deployment.environment', value: 'test' }] },
  });
  expect(trace.spans.map(span => span.processID)).toEqual(['p1', 'p2', 'p1']);
});

it('renders an error status as the legacy error tag', () => {
  const trace = toLegacyTrace({
    traceID: 'trace',
    serviceName: 'service',
    spans: [{ spanID: 'span', name: 'op', kind: 'server', status: { code: 'error', message: 'boom' } }],
  });

  expect(trace.spans[0].tags).toEqual([
    { key: 'span.kind', value: 'server' },
    { key: 'error', value: true },
    { key: 'otel.status_code', value: 'ERROR' },
    { key: 'otel.status_description', value: 'boom' },
  ]);
});

it('keeps the parent CHILD_OF reference before the link references', () => {
  const trace = toLegacyTrace({
    traceID: 'trace',
    serviceName: 'service',
    spans: [
      {
        spanID: 'span',
        name: 'op',
        parentSpanID: 'parent',
        links: [{ spanID: 'link' }, { spanID: 'cross', traceID: 'other-trace' }],
      },
    ],
  });

  expect(trace.spans[0].references).toEqual([
    { refType: 'CHILD_OF', traceID: 'trace', spanID: 'parent', span: undefined },
    { refType: 'FOLLOWS_FROM', traceID: 'trace', spanID: 'link', span: undefined },
    { refType: 'FOLLOWS_FROM', traceID: 'other-trace', spanID: 'cross', span: undefined },
  ]);
});
