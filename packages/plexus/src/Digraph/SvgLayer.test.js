// Copyright (c) 2026 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import SvgLayer from './SvgLayer';

// Mock SvgDefEntry component
// Use React.createElement instead of JSX, because jest.mock factory functions cannot reference external variables
jest.mock('./SvgDefEntry', () => {
  const React = require('react');
  const MockSvgDefEntry = ({ localId, getClassName }) =>
    React.createElement('marker', { id: localId, 'data-testid': `def-${localId}` });
  return MockSvgDefEntry;
});

// Mock ZoomManager
jest.mock('../zoom/ZoomManager', () => ({
  getZoomAttr: transform =>
    transform ? `translate(${transform.x.toFixed()},${transform.y.toFixed()}) scale(${transform.k})` : null,
}));

describe('SvgLayer', () => {
  const createGraphState = (zoomTransform = null) => ({
    vertices: [],
    layoutVertices: null,
    layoutEdges: null,
    renderUtils: {
      getGlobalId: id => `global-${id}`,
    },
    zoomTransform,
  });

  const defaultProps = {
    classNamePart: 'TestLayer',
    getClassName: name => `test-${name}`,
    graphState: createGraphState(),
    children: <rect data-testid="child-content" />,
  };

  // Helper to render inside SVG context
  const renderSvgLayer = (props, options = {}) => {
    const mergedProps = { ...defaultProps, ...props };
    // If standalone or topLayer, component renders its own svg
    if (mergedProps.standalone || mergedProps.topLayer) {
      return render(<SvgLayer {...mergedProps} />);
    }
    // Otherwise we need to wrap in svg
    return render(
      <svg>
        <SvgLayer {...mergedProps} />
      </svg>
    );
  };

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderSvgLayer();
      expect(container).toBeTruthy();
    });

    it('renders children content', () => {
      const { getByTestId } = renderSvgLayer();
      expect(getByTestId('child-content')).toBeTruthy();
    });

    it('applies className from classNamePart', () => {
      const { container } = renderSvgLayer();
      const g = container.querySelector('g.test-TestLayer');
      expect(g).toBeTruthy();
    });
  });

  describe('container props', () => {
    it('merges custom props from setOnContainer', () => {
      const setOnContainer = graphState => ({
        'data-custom': 'value',
      });
      const { container } = renderSvgLayer({ setOnContainer });
      const g = container.querySelector('g[data-custom="value"]');
      expect(g).toBeTruthy();
    });

    it('merges className from setOnContainer with default className', () => {
      const setOnContainer = () => ({
        className: 'custom-class',
      });
      const { container } = renderSvgLayer({ setOnContainer });
      const g = container.querySelector('g');
      expect(g.className.baseVal).toContain('test-TestLayer');
      expect(g.className.baseVal).toContain('custom-class');
    });
  });

  describe('defs rendering', () => {
    it('does not render defs element when defs prop is not provided', () => {
      const { container } = renderSvgLayer();
      const defs = container.querySelector('defs');
      expect(defs).toBeFalsy();
    });

    it('renders defs element when defs prop is provided', () => {
      const defs = [
        { localId: 'marker-1', renderEntry: () => <marker /> },
        { localId: 'marker-2', renderEntry: () => <marker /> },
      ];
      const { container } = renderSvgLayer({ defs });
      const defsElement = container.querySelector('defs');
      expect(defsElement).toBeTruthy();
    });

    it('renders SvgDefEntry for each def entry', () => {
      const defs = [
        { localId: 'arrow-start', renderEntry: () => <marker /> },
        { localId: 'arrow-end', renderEntry: () => <marker /> },
      ];
      const { getByTestId } = renderSvgLayer({ defs });
      expect(getByTestId('def-arrow-start')).toBeTruthy();
      expect(getByTestId('def-arrow-end')).toBeTruthy();
    });
  });

  describe('extraWrapper', () => {
    it('does not add extra wrapper when extraWrapper is not provided', () => {
      const { container } = renderSvgLayer();
      // Should have: svg > g.test-TestLayer > rect
      const layers = container.querySelectorAll('g');
      expect(layers.length).toBe(1);
    });

    it('wraps content in extra g element when extraWrapper is provided', () => {
      const extraWrapper = { stroke: '#000', fill: 'none' };
      const { container } = renderSvgLayer({ extraWrapper });
      // Should have: svg > g[stroke] > g.test-TestLayer > rect
      const outerG = container.querySelector('svg > g');
      expect(outerG.getAttribute('stroke')).toBe('#000');
      expect(outerG.getAttribute('fill')).toBe('none');
    });
  });

  describe('standalone mode', () => {
    it('renders own svg element when standalone is true', () => {
      const { container } = render(<SvgLayer {...defaultProps} standalone />);
      const svg = container.querySelector('svg.test-SvgLayer');
      expect(svg).toBeTruthy();
    });

    it('applies positioning style when standalone', () => {
      const { container } = render(<SvgLayer {...defaultProps} standalone />);
      const svg = container.querySelector('svg');
      expect(svg.style.position).toBe('absolute');
      expect(svg.style.top).toBe('0px');
      expect(svg.style.left).toBe('0px');
    });

    it('renders transformer g element when standalone', () => {
      const { container } = render(<SvgLayer {...defaultProps} standalone />);
      const transformer = container.querySelector('g.test-SvgLayer--transformer');
      expect(transformer).toBeTruthy();
    });

    it('applies zoom transform when available', () => {
      const graphState = createGraphState({ k: 2, x: 10, y: 20 });
      const { container } = render(<SvgLayer {...defaultProps} graphState={graphState} standalone />);
      const transformer = container.querySelector('g.test-SvgLayer--transformer');
      expect(transformer.getAttribute('transform')).toBe('translate(10,20) scale(2)');
    });
  });

  describe('topLayer mode', () => {
    it('renders own svg element when topLayer is true', () => {
      const { container } = render(<SvgLayer {...defaultProps} topLayer />);
      const svg = container.querySelector('svg.test-SvgLayer');
      expect(svg).toBeTruthy();
    });

    it('behaves same as standalone for wrapper rendering', () => {
      const { container } = render(<SvgLayer {...defaultProps} topLayer />);
      const transformer = container.querySelector('g.test-SvgLayer--transformer');
      expect(transformer).toBeTruthy();
    });
  });

  describe('React.memo behavior', () => {
    it('does not re-render when props are unchanged', () => {
      let renderCount = 0;

      // Create a child that tracks renders
      const TrackingChild = () => {
        renderCount++;
        return <rect data-testid="tracking-child" />;
      };

      const props = {
        ...defaultProps,
        children: <TrackingChild />,
      };

      const { rerender } = renderSvgLayer(props);

      const initialRenderCount = renderCount;

      // Rerender with the exact same props object references
      rerender(
        <svg>
          <SvgLayer {...props} />
        </svg>
      );

      // With React.memo, the component should not re-render when props are unchanged
      expect(renderCount).toBe(initialRenderCount);
    });
  });
});
