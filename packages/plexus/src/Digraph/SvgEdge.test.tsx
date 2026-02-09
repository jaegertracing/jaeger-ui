// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import SvgEdge from './SvgEdge';

describe('<SvgEdge>', () => {
  const mockPoints: [number, number][] = [
    [0, 0],
    [10, 10],
  ];

  const props: any = {
    getClassName: (name: string) => `test-${name}`,
    layoutEdge: {
      edge: { from: 'a', to: 'b', label: '15' },
      points: mockPoints,
      label: { x: 5, y: 5 },
      // Duplicate points at the top level just in case
      pathPoints: mockPoints,
    },
    // Inject points directly into the root as well
    points: mockPoints,
    renderUtils: {
      getGlobalId: (id: string) => id,
      getZoomTransform: () => ({ k: 1, x: 0, y: 0 }),
    },
  };

  it('correctly handles setOnTop visibility', () => {
    const { rerender, container, queryByText } = render(
      <svg>
        <SvgEdge {...props} setOnTop={false} />
      </svg>
    );
    // 1. Should show path when setOnTop is false
    expect(container.querySelector('path')).toBeInTheDocument();

    rerender(
      <svg>
        <SvgEdge {...props} setOnTop={true} />
      </svg>
    );
    // 2. Path should be HIDDEN when setOnTop is true (Our Fix!)
    expect(container.querySelector('path')).not.toBeInTheDocument();
    // 3. Label should still be visible
    expect(queryByText('15')).toBeInTheDocument();
  });
});
