// Copyright (c) 2026 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import MeasurableNode from './MeasurableNode';
import { ELayerType } from './types';

// Track mock calls
const mockAssignMergeCssResults = [];
const mockGetPropsResults = [];

jest.mock('./utils', () => ({
  assignMergeCss: (...args) => {
    const result = Object.assign({}, ...args.filter(Boolean));
    mockAssignMergeCssResults.push({ args, result });
    return result;
  },
  getProps: (...args) => {
    mockGetPropsResults.push(args);
    return args[0] ? { 'data-custom': 'prop' } : null;
  },
}));

// Mock getBBox for SVG elements in JSDOM
beforeAll(() => {
  window.SVGElement.prototype.getBBox = function () {
    return { height: 100, width: 200 };
  };
});

describe('MeasurableNode', () => {
  const createVertex = key => ({ key, data: { label: key } });

  const createLayoutVertex = (key, overrides = {}) => ({
    vertex: createVertex(key),
    left: 50,
    top: 75,
    width: 100,
    height: 50,
    ...overrides,
  });

  const defaultProps = {
    getClassName: name => `test-${name}`,
    hidden: false,
    layerType: ELayerType.Svg,
    layoutVertex: createLayoutVertex('test'),
    renderNode: () => <circle r="5" />,
    renderUtils: {
      getGlobalId: id => `global-${id}`,
    },
    vertex: createVertex('test'),
  };

  beforeEach(() => {
    mockAssignMergeCssResults.length = 0;
    mockGetPropsResults.length = 0;
  });

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <svg>
          <MeasurableNode {...defaultProps} />
        </svg>
      );
      expect(container).toBeTruthy();
    });

    it('renders node content from renderNode prop', () => {
      const { container } = render(
        <svg>
          <MeasurableNode {...defaultProps} />
        </svg>
      );
      expect(container.querySelector('circle')).toBeTruthy();
    });
  });

  describe('layer type - SVG', () => {
    it('uses g element as wrapper for SVG layer', () => {
      const { container } = render(
        <svg>
          <MeasurableNode {...defaultProps} layerType={ELayerType.Svg} />
        </svg>
      );
      expect(container.querySelector('g.test-MeasurableSvgNode')).toBeTruthy();
    });

    it('applies transform for positioned SVG node', () => {
      render(
        <svg>
          <MeasurableNode {...defaultProps} layerType={ELayerType.Svg} />
        </svg>
      );
      const cssArgs = mockAssignMergeCssResults[0].args[0];
      expect(cssArgs.transform).toBe('translate(50, 75)');
    });

    it('applies hidden style when hidden is true for SVG', () => {
      render(
        <svg>
          <MeasurableNode {...defaultProps} layerType={ELayerType.Svg} hidden={true} />
        </svg>
      );
      const cssArgs = mockAssignMergeCssResults[0].args[0];
      expect(cssArgs.style).toEqual({ visibility: 'hidden' });
    });

    it('does not apply hidden style when hidden is false for SVG', () => {
      render(
        <svg>
          <MeasurableNode {...defaultProps} layerType={ELayerType.Svg} hidden={false} />
        </svg>
      );
      const cssArgs = mockAssignMergeCssResults[0].args[0];
      expect(cssArgs.style).toBeNull();
    });
  });

  describe('layer type - HTML', () => {
    it('uses div element as wrapper for HTML layer', () => {
      const { container } = render(<MeasurableNode {...defaultProps} layerType={ELayerType.Html} />);
      expect(container.querySelector('div.test-MeasurableHtmlNode')).toBeTruthy();
    });

    it('applies positioning style for HTML node', () => {
      render(<MeasurableNode {...defaultProps} layerType={ELayerType.Html} />);
      const cssArgs = mockAssignMergeCssResults[0].args[0];
      expect(cssArgs.style.position).toBe('absolute');
      expect(cssArgs.style.boxSizing).toBe('border-box');
      expect(cssArgs.style.transform).toBe('translate(50px,75px)');
    });

    it('applies dimensions from layoutVertex for HTML node', () => {
      render(<MeasurableNode {...defaultProps} layerType={ELayerType.Html} />);
      const cssArgs = mockAssignMergeCssResults[0].args[0];
      expect(cssArgs.style.width).toBe(100);
      expect(cssArgs.style.height).toBe(50);
    });

    it('applies hidden visibility when hidden is true for HTML', () => {
      render(<MeasurableNode {...defaultProps} layerType={ELayerType.Html} hidden={true} />);
      const cssArgs = mockAssignMergeCssResults[0].args[0];
      expect(cssArgs.style.visibility).toBe('hidden');
    });
  });

  describe('null layoutVertex handling', () => {
    it('handles null layoutVertex for SVG', () => {
      render(
        <svg>
          <MeasurableNode {...defaultProps} layerType={ELayerType.Svg} layoutVertex={null} />
        </svg>
      );
      const cssArgs = mockAssignMergeCssResults[0].args[0];
      expect(cssArgs.transform).toBeUndefined();
    });

    it('handles null layoutVertex for HTML', () => {
      render(<MeasurableNode {...defaultProps} layerType={ELayerType.Html} layoutVertex={null} />);
      const cssArgs = mockAssignMergeCssResults[0].args[0];
      expect(cssArgs.style.transform).toBeUndefined();
      expect(cssArgs.style.width).toBeNull();
      expect(cssArgs.style.height).toBeNull();
    });
  });

  describe('className', () => {
    it('applies MeasurableSvgNode className for SVG', () => {
      render(
        <svg>
          <MeasurableNode {...defaultProps} layerType={ELayerType.Svg} />
        </svg>
      );
      const cssArgs = mockAssignMergeCssResults[0].args[0];
      expect(cssArgs.className).toBe('test-MeasurableSvgNode');
    });

    it('applies MeasurableHtmlNode className for HTML', () => {
      render(<MeasurableNode {...defaultProps} layerType={ELayerType.Html} />);
      const cssArgs = mockAssignMergeCssResults[0].args[0];
      expect(cssArgs.className).toBe('test-MeasurableHtmlNode');
    });
  });

  describe('setOnNode prop', () => {
    it('calls getProps with setOnNode, vertex, renderUtils, and layoutVertex', () => {
      const mockSetOnNode = jest.fn();
      render(
        <svg>
          <MeasurableNode {...defaultProps} setOnNode={mockSetOnNode} />
        </svg>
      );
      expect(mockGetPropsResults[0][0]).toBe(mockSetOnNode);
      expect(mockGetPropsResults[0][1]).toBe(defaultProps.vertex);
      expect(mockGetPropsResults[0][2]).toBe(defaultProps.renderUtils);
      expect(mockGetPropsResults[0][3]).toBe(defaultProps.layoutVertex);
    });
  });

  describe('renderNode callback', () => {
    it('passes vertex, renderUtils, and layoutVertex to renderNode', () => {
      const mockRenderNode = jest.fn(() => <circle />);
      render(
        <svg>
          <MeasurableNode {...defaultProps} renderNode={mockRenderNode} />
        </svg>
      );
      expect(mockRenderNode).toHaveBeenCalledWith(
        defaultProps.vertex,
        defaultProps.renderUtils,
        defaultProps.layoutVertex
      );
    });
  });

  describe('imperative handle - getRef', () => {
    it('exposes getRef method via ref for SVG', () => {
      const ref = React.createRef();
      render(
        <svg>
          <MeasurableNode {...defaultProps} ref={ref} layerType={ELayerType.Svg} />
        </svg>
      );
      const result = ref.current.getRef();
      expect(result.svgWrapper).toBeDefined();
      expect(result.htmlWrapper).toBeUndefined();
    });

    it('exposes getRef method via ref for HTML', () => {
      const ref = React.createRef();
      render(<MeasurableNode {...defaultProps} ref={ref} layerType={ELayerType.Html} />);
      const result = ref.current.getRef();
      expect(result.htmlWrapper).toBeDefined();
      expect(result.svgWrapper).toBeUndefined();
    });
  });

  describe('imperative handle - measure', () => {
    it('exposes measure method via ref', () => {
      const ref = React.createRef();
      render(
        <svg>
          <MeasurableNode {...defaultProps} ref={ref} />
        </svg>
      );
      const result = ref.current.measure();
      expect(result).toHaveProperty('height');
      expect(result).toHaveProperty('width');
    });

    it('returns dimensions for SVG layer', () => {
      const ref = React.createRef();
      render(
        <svg>
          <MeasurableNode {...defaultProps} ref={ref} layerType={ELayerType.Svg} />
        </svg>
      );
      const result = ref.current.measure();
      // In JSDOM, getBBox returns 0,0 for unmocked SVG elements
      expect(typeof result.height).toBe('number');
      expect(typeof result.width).toBe('number');
    });

    it('returns dimensions for HTML layer', () => {
      const ref = React.createRef();
      render(<MeasurableNode {...defaultProps} ref={ref} layerType={ELayerType.Html} />);
      const result = ref.current.measure();
      // In JSDOM, offsetHeight/offsetWidth return 0 for unmocked elements
      expect(typeof result.height).toBe('number');
      expect(typeof result.width).toBe('number');
    });

    // Cross-validation: Test that measure() still works correctly after component lifecycle
    it('measure returns valid dimensions throughout component lifecycle', () => {
      const ref = React.createRef();
      const { unmount } = render(
        <svg>
          <MeasurableNode {...defaultProps} ref={ref} layerType={ELayerType.Svg} />
        </svg>
      );

      // Before unmount - ref should be populated
      expect(ref.current).not.toBeNull();
      const beforeUnmount = ref.current.measure();
      expect(beforeUnmount).toHaveProperty('height');
      expect(beforeUnmount).toHaveProperty('width');

      // Store reference to measure function before unmount
      const measureFn = ref.current.measure;

      // After unmount
      unmount();

      // After unmount, ref.current becomes null, but the measure function
      // closure still holds references to the internal refs which are now null
      // This is the ONLY way to trigger the null ref checks (lines 56, 65)
      const afterUnmount = measureFn();
      expect(afterUnmount).toEqual({ height: 0, width: 0 });
    });

    it('measure returns zero dimensions after HTML component unmounts', () => {
      const ref = React.createRef();
      const { unmount } = render(<MeasurableNode {...defaultProps} ref={ref} layerType={ELayerType.Html} />);

      // Store reference to measure function before unmount
      const measureFn = ref.current.measure;

      // After unmount, internal refs become null
      unmount();

      // This triggers the null check on line 56
      const afterUnmount = measureFn();
      expect(afterUnmount).toEqual({ height: 0, width: 0 });
    });
  });

  describe('React.memo behavior', () => {
    it('is wrapped with React.memo for performance', () => {
      // React.memo wraps components with a special $$typeof
      expect(MeasurableNode.$$typeof).toBe(Symbol.for('react.memo'));
    });
  });
});
