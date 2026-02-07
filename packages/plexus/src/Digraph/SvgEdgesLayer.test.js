// Copyright (c) 2026 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

import SvgEdgesLayer from './SvgEdgesLayer';
import { ELayoutPhase } from './types';

const getClassName = name => `test-${name}`;

const mockGraphState = {
  edges: [],
  layoutEdges: [],
  layoutGraph: null,
  layoutPhase: ELayoutPhase.Done,
  layoutVertices: null,
  renderUtils: {},
  vertices: [],
};

describe('SvgEdgesLayer', () => {
  it('applies default black stroke when defaultStroke is not provided', () => {
    const { container } = render(
      <svg>
        <SvgEdgesLayer classNamePart="edges" getClassName={getClassName} graphState={mockGraphState} />
      </svg>
    );

    const wrapper = container.querySelector('g');
    expect(wrapper).toHaveAttribute('stroke', '#000');
  });

  it('applies provided defaultStroke when specified', () => {
    const { container } = render(
      <svg>
        <SvgEdgesLayer
          classNamePart="edges"
          getClassName={getClassName}
          graphState={mockGraphState}
          defaultStroke="#ff0000"
        />
      </svg>
    );

    const wrapper = container.querySelector('g');
    expect(wrapper).toHaveAttribute('stroke', '#ff0000');
  });

  it('renders nothing when layoutEdges is null', () => {
    const { container } = render(
      <svg>
        <SvgEdgesLayer
          classNamePart="edges"
          getClassName={getClassName}
          graphState={{ ...mockGraphState, layoutEdges: null }}
        />
      </svg>
    );

    expect(container.querySelector('g')).toBeNull();
  });
});
