// Copyright (c) 2026 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import HtmlLayersGroup from './HtmlLayersGroup';

describe('HtmlLayersGroup', () => {
  const mockGraphState = { edges: [], vertices: [], layoutEdges: [], layoutVertices: [] };
  const mockGetClassName = name => `mock-${name}`;
  const mockSetSizeVertices = jest.fn();

  const renderComponent = layers =>
    render(
      <HtmlLayersGroup
        getClassName={mockGetClassName}
        graphState={mockGraphState}
        layers={layers}
        setSizeVertices={mockSetSizeVertices}
      />
    );

  it('renders MeasurableNodesLayer when layer is measurable', () => {
    const { container } = renderComponent([
      {
        key: 'layer-1',
        measurable: true,
        renderNode: jest.fn(),
        setOnContainer: jest.fn(),
        setOnNode: jest.fn(),
      },
    ]);
    expect(container.querySelector('.mock-HtmlLayersGroup')).toBeInTheDocument();
  });

  it('renders NodesLayer when layer has renderNode', () => {
    const { container } = renderComponent([
      {
        key: 'layer-2',
        renderNode: jest.fn(),
        setOnContainer: jest.fn(),
        setOnNode: jest.fn(),
      },
    ]);
    expect(container.querySelector('.mock-HtmlLayersGroup')).toBeInTheDocument();
  });

  it('throws error for html edges layer', () => {
    expect(() => renderComponent([{ key: 'layer-3', setOnContainer: jest.fn() }])).toThrow('Not implemented');
  });

  it('renders multiple layers', () => {
    const { container } = renderComponent([
      {
        key: 'layer-1',
        measurable: true,
        renderNode: jest.fn(),
        setOnContainer: jest.fn(),
        setOnNode: jest.fn(),
      },
      {
        key: 'layer-2',
        renderNode: jest.fn(),
        setOnContainer: jest.fn(),
        setOnNode: jest.fn(),
      },
    ]);
    expect(container.querySelector('.mock-HtmlLayersGroup')).toBeInTheDocument();
  });
});
