// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getIncompleteTraceTooltip } from './trace-viewer';

describe('getIncompleteTraceTooltip', () => {
  it('uses singular noun and verb for count of 1', () => {
    const result = getIncompleteTraceTooltip(1);
    expect(result).toContain('1 span has missing parent span.');
  });

  it('uses plural noun and verb for count > 1', () => {
    const result = getIncompleteTraceTooltip(3);
    expect(result).toContain('3 spans have missing parent spans.');
  });

  it('includes the reload suggestion', () => {
    const result = getIncompleteTraceTooltip(1);
    expect(result).toContain('opening or reloading the trace');
  });
});
