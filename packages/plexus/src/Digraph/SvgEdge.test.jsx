// Copyright (c) 2026 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import SvgEdge from './SvgEdge';

const baseProps = {
  getClassName: name => `test-${name}`,
  renderUtils: {
    getGlobalId: id => `global-${id}`,
  },
  layoutEdge: {
    edge: { from: 'a', to: 'b' },
    pathPoints: [
      [0, 100],
      [50, 120],
    ],
  },
};

describe('SvgEdge', () => {
  it('renders the label text at the midpoint for normal edges', () => {
    const { container, getByText } = render(
      <svg>
        <SvgEdge {...baseProps} label="Hello" />
      </svg>
    );

    const text = getByText('Hello');
    expect(text).toBeTruthy();
    expect(container.querySelector('text').getAttribute('dominant-baseline')).toBe('middle');
    expect(text.getAttribute('y')).toBe('110');
  });

  it('lifts the label above self-loops', () => {
    const selfLoopProps = {
      ...baseProps,
      layoutEdge: {
        edge: { from: 'a', to: 'a' },
        pathPoints: [
          [0, 140],
          [40, 116],
          [80, 132],
        ],
      },
    };

    const { getByText } = render(
      <svg>
        <SvgEdge {...selfLoopProps} label="Loop" />
      </svg>
    );

    expect(getByText('Loop').getAttribute('y')).toBe('108');
  });
});
