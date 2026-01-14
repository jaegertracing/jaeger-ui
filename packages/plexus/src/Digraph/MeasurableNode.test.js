// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import MeasurableNode from './MeasurableNode';
import { ELayerType } from './types';

describe('MeasurableNode', () => {
  const mockGetClassName = name => `plexus--${name}`;

  const mockRenderUtils = {
    getGlobalId: id => `global-${id}`,
    getZoomTransform: () => ({ k: 1, x: 0, y: 0 }),
  };

  const mockVertex = { key: 'test-vertex' };

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
    hidden: false,
    layerType: ELayerType.Html,
    layoutVertex: mockLayoutVertex,
    renderNode: mockRenderNode,
    renderUtils: mockRenderUtils,
    vertex: mockVertex,
  };

  describe('HTML layer type', () => {
    it('renders div wrapper for HTML layer type', () => {
      const { container } = render(
        <div>
          <MeasurableNode {...defaultProps} layerType={ELayerType.Html} />
        </div>
      );
      const wrapper = container.querySelector('.plexus--MeasurableHtmlNode');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper.tagName).toBe('DIV');
    });

    it('renders node content', () => {
      const { getByTestId } = render(
        <div>
          <MeasurableNode {...defaultProps} layerType={ELayerType.Html} />
        </div>
      );
      expect(getByTestId('node-content')).toBeInTheDocument();
    });

    it('applies hidden visibility when hidden is true', () => {
      const { container } = render(
        <div>
          <MeasurableNode {...defaultProps} layerType={ELayerType.Html} hidden={true} />
        </div>
      );
      const wrapper = container.querySelector('.plexus--MeasurableHtmlNode');
      expect(wrapper).toHaveStyle({ visibility: 'hidden' });
    });

    it('applies positioning styles from layoutVertex', () => {
      const { container } = render(
        <div>
          <MeasurableNode {...defaultProps} layerType={ELayerType.Html} />
        </div>
      );
      const wrapper = container.querySelector('.plexus--MeasurableHtmlNode');
      expect(wrapper).toHaveStyle({
        height: '50px',
        width: '100px',
        position: 'absolute',
      });
    });
  });

  describe('SVG layer type', () => {
    it('renders g wrapper for SVG layer type', () => {
      const { container } = render(
        <svg>
          <MeasurableNode {...defaultProps} layerType={ELayerType.Svg} />
        </svg>
      );
      const wrapper = container.querySelector('.plexus--MeasurableSvgNode');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper.tagName).toBe('g');
    });

    it('applies hidden visibility when hidden is true', () => {
      const { container } = render(
        <svg>
          <MeasurableNode {...defaultProps} layerType={ELayerType.Svg} hidden={true} />
        </svg>
      );
      const wrapper = container.querySelector('.plexus--MeasurableSvgNode');
      expect(wrapper).toHaveStyle({ visibility: 'hidden' });
    });

    it('applies transform attribute for positioning', () => {
      const { container } = render(
        <svg>
          <MeasurableNode {...defaultProps} layerType={ELayerType.Svg} />
        </svg>
      );
      const wrapper = container.querySelector('.plexus--MeasurableSvgNode');
      expect(wrapper).toHaveAttribute('transform', 'translate(10, 20)');
    });
  });

  describe('with null layoutVertex', () => {
    it('renders without positioning when layoutVertex is null', () => {
      const { container } = render(
        <div>
          <MeasurableNode {...defaultProps} layoutVertex={null} />
        </div>
      );
      const wrapper = container.querySelector('.plexus--MeasurableHtmlNode');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('ref methods', () => {
    it('exposes measure method via ref for HTML', () => {
      const ref = React.createRef();
      render(
        <div>
          <MeasurableNode {...defaultProps} ref={ref} layerType={ELayerType.Html} />
        </div>
      );
      expect(ref.current).toBeDefined();
      expect(typeof ref.current.measure).toBe('function');
      const measurement = ref.current.measure();
      expect(measurement).toHaveProperty('height');
      expect(measurement).toHaveProperty('width');
    });

    it('exposes measure method via ref for SVG', () => {
      const ref = React.createRef();
      render(
        <svg>
          <MeasurableNode {...defaultProps} ref={ref} layerType={ELayerType.Svg} />
        </svg>
      );
      expect(ref.current).toBeDefined();
      expect(typeof ref.current.measure).toBe('function');
      // Note: getBBox is not available in JSDOM, so we mock it
      const svgRef = ref.current.getRef().svgWrapper;
      if (svgRef) {
        svgRef.getBBox = jest.fn(() => ({ height: 100, width: 200 }));
      }
      const measurement = ref.current.measure();
      expect(measurement).toHaveProperty('height');
      expect(measurement).toHaveProperty('width');
    });

    it('exposes getRef method via ref for HTML', () => {
      const ref = React.createRef();
      render(
        <div>
          <MeasurableNode {...defaultProps} ref={ref} layerType={ELayerType.Html} />
        </div>
      );
      expect(typeof ref.current.getRef).toBe('function');
      const refResult = ref.current.getRef();
      expect(refResult).toHaveProperty('htmlWrapper');
    });

    it('exposes getRef method via ref for SVG', () => {
      const ref = React.createRef();
      render(
        <svg>
          <MeasurableNode {...defaultProps} ref={ref} layerType={ELayerType.Svg} />
        </svg>
      );
      expect(typeof ref.current.getRef).toBe('function');
      const refResult = ref.current.getRef();
      expect(refResult).toHaveProperty('svgWrapper');
    });
  });

  describe('setOnNode prop', () => {
    it('passes setOnNode props to wrapper', () => {
      const mockSetOnNode = jest.fn(() => ({ 'data-custom': 'value' }));
      const { container } = render(
        <div>
          <MeasurableNode {...defaultProps} setOnNode={mockSetOnNode} />
        </div>
      );
      const wrapper = container.querySelector('.plexus--MeasurableHtmlNode');
      expect(wrapper).toHaveAttribute('data-custom', 'value');
    });
  });
});
