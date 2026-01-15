// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Node from './Node';
import { ELayerType } from './types';

describe('Node', () => {
  const mockGetClassName = name => `plexus--${name}`;

  const mockRenderUtils = {
    getGlobalId: id => `global-${id}`,
    getZoomTransform: () => ({ k: 1, x: 0, y: 0 }),
  };

  const createLayoutVertex = (key, left = 10, top = 20) => ({
    vertex: { key },
    height: 50,
    width: 100,
    left,
    top,
  });

  const mockLayoutVertex = createLayoutVertex('test-vertex');

  const mockRenderNode = () => <span data-testid="node-content">test content</span>;

  const defaultProps = {
    getClassName: mockGetClassName,
    layerType: ELayerType.Html,
    layoutVertex: mockLayoutVertex,
    renderNode: mockRenderNode,
    renderUtils: mockRenderUtils,
  };

  it('renders div wrapper for HTML layer type', () => {
    const { container } = render(
      <div>
        <Node {...defaultProps} layerType={ELayerType.Html} />
      </div>
    );
    const wrapper = container.querySelector('div.plexus--Node');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.tagName).toBe('DIV');
  });

  it('renders g wrapper for SVG layer type', () => {
    const { container } = render(
      <svg>
        <Node {...defaultProps} layerType={ELayerType.Svg} />
      </svg>
    );
    const wrapper = container.querySelector('g.plexus--Node');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.tagName).toBe('g');
  });

  it('returns null when renderNode returns null', () => {
    const nullRenderNode = () => null;
    const { container } = render(
      <div>
        <Node {...defaultProps} renderNode={nullRenderNode} />
      </div>
    );
    const wrapper = container.querySelector('.plexus--Node');
    expect(wrapper).not.toBeInTheDocument();
  });

  it('applies correct className from getClassName', () => {
    const customGetClassName = name => `custom-${name}`;
    const { container } = render(
      <div>
        <Node {...defaultProps} getClassName={customGetClassName} />
      </div>
    );
    const wrapper = container.querySelector('.custom-Node');
    expect(wrapper).toBeInTheDocument();
  });

  it('renders node content from renderNode', () => {
    const { getByTestId } = render(
      <div>
        <Node {...defaultProps} />
      </div>
    );
    expect(getByTestId('node-content')).toBeInTheDocument();
    expect(getByTestId('node-content')).toHaveTextContent('test content');
  });

  it('applies HTML positioning style for HTML layer type', () => {
    const { container } = render(
      <div>
        <Node {...defaultProps} layerType={ELayerType.Html} />
      </div>
    );
    const wrapper = container.querySelector('.plexus--Node');
    expect(wrapper).toHaveStyle({
      position: 'absolute',
      height: '50px',
      width: '100px',
      transform: 'translate(10px,20px)',
    });
  });

  it('handles null left/top in layoutVertex', () => {
    const vertexWithNullPosition = createLayoutVertex('test', null, null);
    const { container } = render(
      <div>
        <Node {...defaultProps} layoutVertex={vertexWithNullPosition} />
      </div>
    );
    const wrapper = container.querySelector('.plexus--Node');
    expect(wrapper).toBeInTheDocument();
    // Transform should not be applied when left/top are null
    expect(wrapper.style.transform).toBeFalsy();
  });

  it('applies transform attribute for SVG layer type', () => {
    const { container } = render(
      <svg>
        <Node {...defaultProps} layerType={ELayerType.Svg} />
      </svg>
    );
    const wrapper = container.querySelector('.plexus--Node');
    expect(wrapper).toHaveAttribute('transform', 'translate(10,20)');
  });

  it('passes setOnNode to child when provided', () => {
    const mockSetOnNode = jest.fn(() => ({ 'data-custom': 'value' }));
    const { container } = render(
      <div>
        <Node {...defaultProps} setOnNode={mockSetOnNode} />
      </div>
    );
    const wrapper = container.querySelector('.plexus--Node');
    expect(wrapper).toHaveAttribute('data-custom', 'value');
    expect(mockSetOnNode).toHaveBeenCalledWith(mockLayoutVertex, mockRenderUtils);
  });

  describe('React.memo behavior', () => {
    it('is wrapped with React.memo for performance', () => {
      // React.memo wraps components with a special $$typeof
      expect(Node.$$typeof).toBe(Symbol.for('react.memo'));
    });
  });
});
