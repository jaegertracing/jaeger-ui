// Copyright (c) 2026 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import Node from './Node';
import { ELayerType } from './types';

// Track props passed to utils
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

describe('Node', () => {
  const createLayoutVertex = (overrides = {}) => ({
    vertex: { key: 'test-vertex' },
    height: 100,
    width: 200,
    left: 50,
    top: 75,
    ...overrides,
  });

  const defaultProps = {
    getClassName: name => `test-${name}`,
    layerType: ELayerType.Svg,
    layoutVertex: createLayoutVertex(),
    renderNode: () => <span>Node Content</span>,
    renderUtils: {
      getGlobalId: id => `global-${id}`,
    },
  };

  beforeEach(() => {
    mockAssignMergeCssResults.length = 0;
    mockGetPropsResults.length = 0;
  });

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<Node {...defaultProps} />);
      expect(container).toBeTruthy();
    });

    it('renders node content from renderNode prop', () => {
      const { getByText } = render(<Node {...defaultProps} />);
      expect(getByText('Node Content')).toBeTruthy();
    });

    it('returns null when renderNode returns null', () => {
      const { container } = render(<Node {...defaultProps} renderNode={() => null} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when renderNode returns undefined', () => {
      const { container } = render(<Node {...defaultProps} renderNode={() => undefined} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('layer type - SVG', () => {
    it('uses g element as wrapper for SVG layer', () => {
      const { container } = render(<Node {...defaultProps} layerType={ELayerType.Svg} />);
      expect(container.querySelector('g')).toBeTruthy();
      expect(container.querySelector('div')).toBeNull();
    });

    it('applies transform attribute for SVG layer', () => {
      const { container } = render(<Node {...defaultProps} layerType={ELayerType.Svg} />);
      const wrapper = container.querySelector('g');
      expect(wrapper.getAttribute('transform')).toBe('translate(50,75)');
    });

    it('does not apply style for SVG layer', () => {
      render(<Node {...defaultProps} layerType={ELayerType.Svg} />);
      const cssArgs = mockAssignMergeCssResults[0].args[0];
      expect(cssArgs.style).toBeNull();
    });
  });

  describe('layer type - HTML', () => {
    it('uses div element as wrapper for HTML layer', () => {
      const { container } = render(<Node {...defaultProps} layerType={ELayerType.Html} />);
      expect(container.querySelector('div')).toBeTruthy();
    });

    it('applies positioning style for HTML layer', () => {
      render(<Node {...defaultProps} layerType={ELayerType.Html} />);
      const cssArgs = mockAssignMergeCssResults[0].args[0];
      expect(cssArgs.style).toEqual({
        height: 100,
        width: 200,
        position: 'absolute',
        transform: 'translate(50px,75px)',
      });
    });

    it('does not apply transform attribute for HTML layer', () => {
      render(<Node {...defaultProps} layerType={ELayerType.Html} />);
      const cssArgs = mockAssignMergeCssResults[0].args[0];
      expect(cssArgs.transform).toBeNull();
    });

    it('handles null left/top in HTML layer', () => {
      const layoutVertex = createLayoutVertex({ left: null, top: null });
      render(<Node {...defaultProps} layerType={ELayerType.Html} layoutVertex={layoutVertex} />);
      const cssArgs = mockAssignMergeCssResults[0].args[0];
      expect(cssArgs.style.transform).toBeUndefined();
    });
  });

  describe('className', () => {
    it('applies className from getClassName prop', () => {
      render(<Node {...defaultProps} />);
      const cssArgs = mockAssignMergeCssResults[0].args[0];
      expect(cssArgs.className).toBe('test-Node');
    });

    it('uses custom getClassName function', () => {
      const customGetClassName = name => `custom-prefix-${name}`;
      render(<Node {...defaultProps} getClassName={customGetClassName} />);
      const cssArgs = mockAssignMergeCssResults[0].args[0];
      expect(cssArgs.className).toBe('custom-prefix-Node');
    });
  });

  describe('setOnNode prop', () => {
    it('calls getProps with setOnNode, layoutVertex, and renderUtils', () => {
      const mockSetOnNode = jest.fn();
      render(<Node {...defaultProps} setOnNode={mockSetOnNode} />);
      expect(mockGetPropsResults[0][0]).toBe(mockSetOnNode);
      expect(mockGetPropsResults[0][1]).toBe(defaultProps.layoutVertex);
      expect(mockGetPropsResults[0][2]).toBe(defaultProps.renderUtils);
    });

    it('merges setOnNode props into wrapper', () => {
      const mockSetOnNode = jest.fn();
      const { container } = render(<Node {...defaultProps} setOnNode={mockSetOnNode} />);
      const wrapper = container.querySelector('g');
      expect(wrapper.getAttribute('data-custom')).toBe('prop');
    });

    it('handles undefined setOnNode', () => {
      render(<Node {...defaultProps} setOnNode={undefined} />);
      expect(mockGetPropsResults[0][0]).toBeUndefined();
    });
  });

  describe('renderNode callback', () => {
    it('passes layoutVertex to renderNode', () => {
      const mockRenderNode = jest.fn(() => <span>Content</span>);
      render(<Node {...defaultProps} renderNode={mockRenderNode} />);
      expect(mockRenderNode).toHaveBeenCalledWith(defaultProps.layoutVertex, defaultProps.renderUtils);
    });

    it('passes renderUtils to renderNode', () => {
      const mockRenderNode = jest.fn(() => <span>Content</span>);
      const customRenderUtils = { getGlobalId: id => `custom-${id}` };
      render(<Node {...defaultProps} renderNode={mockRenderNode} renderUtils={customRenderUtils} />);
      expect(mockRenderNode).toHaveBeenCalledWith(defaultProps.layoutVertex, customRenderUtils);
    });
  });

  describe('React.memo behavior', () => {
    it('is wrapped with React.memo for performance', () => {
      // React.memo components have a $$typeof symbol
      expect(Node.$$typeof).toBeDefined();
    });
  });
});
