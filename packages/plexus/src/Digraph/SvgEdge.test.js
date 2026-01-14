// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import SvgEdge from './SvgEdge';

describe('SvgEdge', () => {
  const createLayoutEdge = (from, to, pathPoints) => ({
    edge: { from, to },
    pathPoints: pathPoints || [
      [0, 0],
      [50, 25],
      [100, 50],
      [150, 75],
    ],
  });

  const defaultProps = {
    getClassName: name => `test-${name}`,
    layoutEdge: createLayoutEdge('a', 'b'),
    renderUtils: {
      getGlobalId: id => `global-${id}`,
    },
  };

  // Helper to render SVG component inside svg element
  const renderSvgEdge = props => {
    const { container } = render(
      <svg>
        <SvgEdge {...defaultProps} {...props} />
      </svg>
    );
    return container.querySelector('svg > g');
  };

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const g = renderSvgEdge();
      expect(g).toBeTruthy();
    });

    it('renders a path element', () => {
      const g = renderSvgEdge();
      const path = g.querySelector('path');
      expect(path).toBeTruthy();
    });

    it('applies className from getClassName', () => {
      const g = renderSvgEdge();
      const path = g.querySelector('path');
      expect(path.getAttribute('class')).toBe('test-SvgEdge');
    });

    it('sets fill to none on path', () => {
      const g = renderSvgEdge();
      const path = g.querySelector('path');
      expect(path.getAttribute('fill')).toBe('none');
    });

    it('sets vectorEffect to non-scaling-stroke', () => {
      const g = renderSvgEdge();
      const path = g.querySelector('path');
      expect(path.getAttribute('vector-effect')).toBe('non-scaling-stroke');
    });
  });

  describe('path d attribute', () => {
    it('generates correct path d from pathPoints', () => {
      const g = renderSvgEdge();
      const path = g.querySelector('path');
      const d = path.getAttribute('d');
      // Path format: M x0 y0 C x1 y1 x2 y2 x3 y3
      expect(d).toBe('M 0 0 C 50 25 100 50 150 75');
    });

    it('handles different pathPoints', () => {
      const customEdge = createLayoutEdge('x', 'y', [
        [10, 20],
        [30, 40],
        [50, 60],
        [70, 80],
      ]);
      const g = renderSvgEdge({ layoutEdge: customEdge });
      const path = g.querySelector('path');
      expect(path.getAttribute('d')).toBe('M 10 20 C 30 40 50 60 70 80');
    });
  });

  describe('markers', () => {
    it('does not set markerEnd when markerEndId is not provided', () => {
      const g = renderSvgEdge();
      const path = g.querySelector('path');
      expect(path.getAttribute('marker-end')).toBeFalsy();
    });

    it('does not set markerStart when markerStartId is not provided', () => {
      const g = renderSvgEdge();
      const path = g.querySelector('path');
      expect(path.getAttribute('marker-start')).toBeFalsy();
    });

    it('sets markerEnd with global ID when markerEndId is provided', () => {
      const g = renderSvgEdge({ markerEndId: 'arrow-end' });
      const path = g.querySelector('path');
      expect(path.getAttribute('marker-end')).toBe('url(#global-arrow-end)');
    });

    it('sets markerStart with global ID when markerStartId is provided', () => {
      const g = renderSvgEdge({ markerStartId: 'arrow-start' });
      const path = g.querySelector('path');
      expect(path.getAttribute('marker-start')).toBe('url(#global-arrow-start)');
    });
  });

  describe('label rendering', () => {
    it('does not render text element when label is not provided', () => {
      const g = renderSvgEdge();
      const text = g.querySelector('text');
      expect(text).toBeFalsy();
    });

    it('renders text element when label is provided', () => {
      const g = renderSvgEdge({ label: 'Test Label' });
      const text = g.querySelector('text');
      expect(text).toBeTruthy();
      expect(text.textContent).toBe('Test Label');
    });

    it('positions label at midpoint of edge', () => {
      // Path points: [0,0], [50,25], [100,50], [150,75]
      // Start: (0, 0), End: (150, 75)
      // MidY: (0 + 75) / 2 = 37.5
      // MidX with offset: (0 + 150) / 2 - (label.length * 5) = 75 - 50 = 25
      const g = renderSvgEdge({ label: 'Test Label' }); // 10 chars
      const text = g.querySelector('text');
      expect(text.getAttribute('y')).toBe('37.5');
      expect(text.getAttribute('x')).toBe('25');
    });

    it('applies correct text styling', () => {
      const g = renderSvgEdge({ label: 'Edge' });
      const text = g.querySelector('text');
      expect(text.getAttribute('fill')).toBe('#000');
      expect(text.getAttribute('font-size')).toBe('1rem');
      expect(text.getAttribute('font-weight')).toBe('bold');
    });
  });

  describe('setOnEdge custom props', () => {
    it('merges custom props from setOnEdge', () => {
      const setOnEdge = (edge, utils) => ({
        'data-edge-from': edge.edge.from,
        'data-edge-to': edge.edge.to,
      });
      const g = renderSvgEdge({ setOnEdge });
      const path = g.querySelector('path');
      expect(path.getAttribute('data-edge-from')).toBe('a');
      expect(path.getAttribute('data-edge-to')).toBe('b');
    });

    it('merges className from setOnEdge with default className', () => {
      const setOnEdge = () => ({
        className: 'custom-edge',
      });
      const g = renderSvgEdge({ setOnEdge });
      const path = g.querySelector('path');
      // Should merge both classes
      expect(path.getAttribute('class')).toContain('test-SvgEdge');
      expect(path.getAttribute('class')).toContain('custom-edge');
    });
  });

  describe('React.memo behavior', () => {
    it('is wrapped with React.memo for performance', () => {
      // React.memo wraps the component, so we check it's not a class
      expect(SvgEdge.$$typeof).toBeDefined();
    });
  });
});
