// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import MeasurableNodesLayer from './MeasurableNodesLayer';
import { ELayerType, ELayoutPhase } from './types';

// Track props passed to mocked components
const mockMeasurableNodesProps = [];
const mockHtmlLayerProps = [];
const mockSvgLayerProps = [];

jest.mock('./MeasurableNodes', () => {
  const MockMeasurableNodes = props => {
    mockMeasurableNodesProps.push(props);
    return <g data-testid="measurable-nodes" />;
  };
  return MockMeasurableNodes;
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

// Mock MeasurableNode ref behavior
jest.mock('./MeasurableNode', () => {
  return {};
});

describe('MeasurableNodesLayer', () => {
  const createVertex = key => ({ key, data: { label: key } });

  const createGraphState = (vertices = [], layoutPhase = ELayoutPhase.Done) => ({
    vertices,
    layoutVertices: vertices.map((v, i) => ({
      vertex: v,
      left: i * 100,
      top: i * 50,
      width: 100,
      height: 50,
    })),
    layoutEdges: null,
    layoutPhase,
    renderUtils: {
      getGlobalId: id => `global-${id}`,
    },
  });

  const defaultProps = {
    getClassName: name => `test-${name}`,
    graphState: createGraphState([createVertex('a'), createVertex('b')]),
    senderKey: 'test-sender',
    layerType: ELayerType.Svg,
    setSizeVertices: jest.fn(),
    renderNode: () => <circle />,
  };

  beforeEach(() => {
    mockMeasurableNodesProps.length = 0;
    mockHtmlLayerProps.length = 0;
    mockSvgLayerProps.length = 0;
    defaultProps.setSizeVertices.mockClear();
  });

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<MeasurableNodesLayer {...defaultProps} />);
      expect(container).toBeTruthy();
    });

    it('renders MeasurableNodes component', () => {
      const { getByTestId } = render(<MeasurableNodesLayer {...defaultProps} />);
      expect(getByTestId('measurable-nodes')).toBeTruthy();
    });

    it('renders content when nodeRefs are initialized', () => {
      const { container } = render(<MeasurableNodesLayer {...defaultProps} />);
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('layer type selection', () => {
    it('uses SvgLayer when layerType is Svg', () => {
      render(<MeasurableNodesLayer {...defaultProps} layerType={ELayerType.Svg} />);
      expect(mockSvgLayerProps.length).toBe(1);
      expect(mockHtmlLayerProps.length).toBe(0);
    });

    it('uses HtmlLayer when layerType is Html', () => {
      render(<MeasurableNodesLayer {...defaultProps} layerType={ELayerType.Html} />);
      expect(mockHtmlLayerProps.length).toBe(1);
      expect(mockSvgLayerProps.length).toBe(0);
    });
  });

  describe('layer component props', () => {
    it('passes classNamePart="MeasurableNodesLayer" to layer component', () => {
      const { getByTestId } = render(<MeasurableNodesLayer {...defaultProps} />);
      expect(getByTestId('svg-layer').getAttribute('data-classname-part')).toBe('MeasurableNodesLayer');
    });

    it('passes getClassName to layer component', () => {
      render(<MeasurableNodesLayer {...defaultProps} />);
      expect(mockSvgLayerProps[0].getClassName).toBe(defaultProps.getClassName);
    });

    it('passes graphState to layer component', () => {
      render(<MeasurableNodesLayer {...defaultProps} />);
      expect(mockSvgLayerProps[0].graphState).toBe(defaultProps.graphState);
    });
  });

  describe('MeasurableNodes child props', () => {
    it('passes getClassName to MeasurableNodes', () => {
      render(<MeasurableNodesLayer {...defaultProps} />);
      expect(mockMeasurableNodesProps[0].getClassName).toBe(defaultProps.getClassName);
    });

    it('passes layerType to MeasurableNodes', () => {
      render(<MeasurableNodesLayer {...defaultProps} />);
      expect(mockMeasurableNodesProps[0].layerType).toBe(ELayerType.Svg);
    });

    it('passes renderNode to MeasurableNodes', () => {
      render(<MeasurableNodesLayer {...defaultProps} />);
      expect(mockMeasurableNodesProps[0].renderNode).toBe(defaultProps.renderNode);
    });

    it('passes renderUtils from graphState to MeasurableNodes', () => {
      render(<MeasurableNodesLayer {...defaultProps} />);
      expect(mockMeasurableNodesProps[0].renderUtils).toBe(defaultProps.graphState.renderUtils);
    });

    it('passes vertices from graphState to MeasurableNodes', () => {
      render(<MeasurableNodesLayer {...defaultProps} />);
      expect(mockMeasurableNodesProps[0].vertices).toBe(defaultProps.graphState.vertices);
    });

    it('passes layoutVertices from graphState to MeasurableNodes', () => {
      render(<MeasurableNodesLayer {...defaultProps} />);
      expect(mockMeasurableNodesProps[0].layoutVertices).toBe(defaultProps.graphState.layoutVertices);
    });

    it('passes setOnNode to MeasurableNodes', () => {
      const mockSetOnNode = jest.fn();
      render(<MeasurableNodesLayer {...defaultProps} setOnNode={mockSetOnNode} />);
      expect(mockMeasurableNodesProps[0].setOnNode).toBe(mockSetOnNode);
    });

    it('creates nodeRefs array with correct length', () => {
      render(<MeasurableNodesLayer {...defaultProps} />);
      expect(mockMeasurableNodesProps[0].nodeRefs.length).toBe(2);
    });
  });

  describe('refs update on vertices change', () => {
    it('creates new refs when vertices change', () => {
      const { rerender } = render(<MeasurableNodesLayer {...defaultProps} />);

      const initialRefs = mockMeasurableNodesProps[0].nodeRefs;
      expect(initialRefs.length).toBe(2);

      // Change to 3 vertices
      const newGraphState = createGraphState([createVertex('a'), createVertex('b'), createVertex('c')]);
      rerender(<MeasurableNodesLayer {...defaultProps} graphState={newGraphState} />);

      const newRefs = mockMeasurableNodesProps[1].nodeRefs;
      expect(newRefs.length).toBe(3);
      expect(newRefs).not.toBe(initialRefs);
    });

    it('keeps same refs when vertices reference is unchanged', () => {
      const { rerender } = render(<MeasurableNodesLayer {...defaultProps} />);

      const initialRefs = mockMeasurableNodesProps[0].nodeRefs;

      // Force rerender with a different prop that doesn't affect refs
      rerender(<MeasurableNodesLayer {...defaultProps} senderKey="different-key" />);

      // Due to PureComponent/memo behavior, refs should remain the same
      // The component may or may not re-render, but refs should be stable
      const latestProps = mockMeasurableNodesProps[mockMeasurableNodesProps.length - 1];
      expect(latestProps.nodeRefs).toBe(initialRefs);
    });
  });

  describe('React.memo behavior', () => {
    it('is wrapped with React.memo for performance', () => {
      expect(MeasurableNodesLayer.$$typeof).toBeDefined();
    });
  });
});
