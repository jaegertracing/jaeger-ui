// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import NodesLayer from './NodesLayer';
import { ELayerType } from './types';

// Track props passed to mocked components
const mockNodesProps = [];
const mockHtmlLayerProps = [];
const mockSvgLayerProps = [];

jest.mock('./Nodes', () => {
  const MockNodes = props => {
    mockNodesProps.push(props);
    return <g data-testid="nodes" />;
  };
  return MockNodes;
});

jest.mock('./HtmlLayer', () => {
  const MockHtmlLayer = ({ children, classNamePart, ...rest }) => {
    mockHtmlLayerProps.push({ classNamePart, ...rest });
    return (
      <div data-testid="html-layer" data-classname-part={classNamePart}>
        {children}
      </div>
    );
  };
  return MockHtmlLayer;
});

jest.mock('./SvgLayer', () => {
  const MockSvgLayer = ({ children, classNamePart, ...rest }) => {
    mockSvgLayerProps.push({ classNamePart, ...rest });
    return (
      <svg data-testid="svg-layer" data-classname-part={classNamePart}>
        {children}
      </svg>
    );
  };
  return MockSvgLayer;
});

describe('NodesLayer', () => {
  const createLayoutVertex = (key, left, top) => ({
    vertex: { key },
    left,
    top,
    width: 100,
    height: 50,
  });

  const createGraphState = (layoutVertices = null) => ({
    vertices: [],
    layoutVertices,
    layoutEdges: null,
    renderUtils: {
      getGlobalId: id => `global-${id}`,
    },
  });

  const mockRenderNode = () => <circle />;

  const defaultProps = {
    getClassName: name => `test-${name}`,
    graphState: createGraphState([createLayoutVertex('a', 0, 0), createLayoutVertex('b', 100, 50)]),
    layerType: ELayerType.Svg,
    renderNode: mockRenderNode,
  };

  beforeEach(() => {
    mockNodesProps.length = 0;
    mockHtmlLayerProps.length = 0;
    mockSvgLayerProps.length = 0;
  });

  describe('conditional rendering', () => {
    it('returns null when layoutVertices is null', () => {
      const props = {
        ...defaultProps,
        graphState: createGraphState(null),
      };
      const { container } = render(<NodesLayer {...props} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when renderNode is not provided', () => {
      const props = {
        ...defaultProps,
        renderNode: undefined,
      };
      const { container } = render(<NodesLayer {...props} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders when layoutVertices and renderNode are provided', () => {
      const { getByTestId } = render(<NodesLayer {...defaultProps} />);
      expect(getByTestId('svg-layer')).toBeTruthy();
    });
  });

  describe('layer type selection', () => {
    it('uses SvgLayer when layerType is Svg', () => {
      render(<NodesLayer {...defaultProps} layerType={ELayerType.Svg} />);
      expect(mockSvgLayerProps.length).toBe(1);
      expect(mockHtmlLayerProps.length).toBe(0);
    });

    it('uses HtmlLayer when layerType is Html', () => {
      render(<NodesLayer {...defaultProps} layerType={ELayerType.Html} />);
      expect(mockHtmlLayerProps.length).toBe(1);
      expect(mockSvgLayerProps.length).toBe(0);
    });
  });

  describe('layer component props', () => {
    it('passes classNamePart="NodesLayer" to layer component', () => {
      const { getByTestId } = render(<NodesLayer {...defaultProps} />);
      expect(getByTestId('svg-layer').getAttribute('data-classname-part')).toBe('NodesLayer');
    });

    it('passes getClassName to layer component', () => {
      render(<NodesLayer {...defaultProps} />);
      expect(mockSvgLayerProps[0].getClassName).toBe(defaultProps.getClassName);
    });

    it('passes graphState to layer component', () => {
      render(<NodesLayer {...defaultProps} />);
      expect(mockSvgLayerProps[0].graphState).toBe(defaultProps.graphState);
    });

    it('passes standalone prop to layer component', () => {
      render(<NodesLayer {...defaultProps} standalone />);
      expect(mockSvgLayerProps[0].standalone).toBe(true);
    });

    it('passes setOnContainer to layer component', () => {
      const mockSetOnContainer = jest.fn();
      render(<NodesLayer {...defaultProps} setOnContainer={mockSetOnContainer} />);
      expect(mockSvgLayerProps[0].setOnContainer).toBe(mockSetOnContainer);
    });
  });

  describe('Nodes child props', () => {
    it('passes getClassName to Nodes', () => {
      render(<NodesLayer {...defaultProps} />);
      expect(mockNodesProps[0].getClassName).toBe(defaultProps.getClassName);
    });

    it('passes layerType to Nodes', () => {
      render(<NodesLayer {...defaultProps} />);
      expect(mockNodesProps[0].layerType).toBe(ELayerType.Svg);
    });

    it('passes layoutVertices from graphState to Nodes', () => {
      render(<NodesLayer {...defaultProps} />);
      expect(mockNodesProps[0].layoutVertices).toBe(defaultProps.graphState.layoutVertices);
    });

    it('passes renderNode to Nodes', () => {
      render(<NodesLayer {...defaultProps} />);
      expect(mockNodesProps[0].renderNode).toBe(mockRenderNode);
    });

    it('passes renderUtils from graphState to Nodes', () => {
      render(<NodesLayer {...defaultProps} />);
      expect(mockNodesProps[0].renderUtils).toBe(defaultProps.graphState.renderUtils);
    });

    it('passes setOnNode to Nodes', () => {
      const mockSetOnNode = jest.fn();
      render(<NodesLayer {...defaultProps} setOnNode={mockSetOnNode} />);
      expect(mockNodesProps[0].setOnNode).toBe(mockSetOnNode);
    });
  });

  describe('React.memo behavior', () => {
    it('is wrapped with React.memo for performance', () => {
      expect(NodesLayer.$$typeof).toBeDefined();
    });
  });
});
