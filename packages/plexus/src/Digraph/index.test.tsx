// Copyright (c) 2026 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import Digraph from './index';

describe('Digraph', () => {
  it('renders without crashing with minimal props', () => {
    const minProps = {
      edges: [],
      layers: [
        {
          key: 'test-layer',
          renderNode: () => <div />,
        },
      ] as any,
      layoutManager: {
        getLayout: () => ({ layout: Promise.resolve({ edges: [], graph: {}, vertices: [] }) }),
      } as any,
      measurableNodesKey: 'nodes',
      vertices: [],
    };

    const { container } = render(<Digraph {...minProps} />);
    expect(container).toBeTruthy();
  });
});
