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
    spans: [{ spanID: 'span', operationName: 'op', ...timing }],
  });
  expect(trace.spans[0].duration).toBe(expected.duration);
  expect(trace.spans[0].startTime).toBe(expected.startTime);
  expect(Object.hasOwn(trace.spans[0], 'startTime')).toBe(Object.hasOwn(expected, 'startTime'));
  expect(Object.hasOwn(trace.spans[0], 'duration')).toBe(Object.hasOwn(expected, 'duration'));
});
