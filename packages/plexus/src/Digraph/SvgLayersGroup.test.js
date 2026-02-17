// Copyright (c) 2026 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import SvgLayersGroup from './SvgLayersGroup';
import { ELayerType } from './types';

// Track props passed to mocked components
const mockSvgEdgesLayerProps = [];
const mockNodesLayerProps = [];
const mockSvgLayerProps = [];

// jest.mock factories are hoisted above imports, so we use React.createElement instead of JSX here
jest.mock('./SvgEdgesLayer', () => {
  const React = require('react');
  let callCount = 0;
  const MockSvgEdgesLayer = props => {
    mockSvgEdgesLayerProps.push(props);
    callCount++;
    return React.createElement('g', { 'data-testid': `edges-layer-${callCount}` });
  };
  return MockSvgEdgesLayer;
});

jest.mock('./NodesLayer', () => {
  const React = require('react');
  let callCount = 0;
  const MockNodesLayer = props => {
    mockNodesLayerProps.push(props);
    callCount++;
    return React.createElement('g', { 'data-testid': `nodes-layer-${callCount}` });
  };
  return MockNodesLayer;
});

jest.mock('./SvgLayer', () => {
  const React = require('react');
  const MockSvgLayer = ({ children, classNamePart, topLayer, ...rest }) => {
    mockSvgLayerProps.push({ classNamePart, topLayer, ...rest });
    return React.createElement(
      'svg',
      { 'data-testid': 'svg-layer', 'data-classname-part': classNamePart, 'data-top-layer': topLayer },
      children
    );
  };
  return MockSvgLayer;
});

describe('SvgLayersGroup', () => {
  const createGraphState = () => ({
    vertices: [],
    layoutVertices: [{ vertex: { key: 'a' }, left: 0, top: 0, width: 100, height: 50 }],
    layoutEdges: [
      {
        edge: { from: 'a', to: 'b' },
        pathPoints: [
          [0, 0],
          [100, 100],
        ],
      },
    ],
    renderUtils: {
      getGlobalId: id => `global-${id}`,
    },
  });

  const defaultProps = {
    getClassName: name => `test-${name}`,
    graphState: createGraphState(),
    layers: [],
  };

  beforeEach(() => {
    mockSvgEdgesLayerProps.length = 0;
    mockNodesLayerProps.length = 0;
    mockSvgLayerProps.length = 0;
  });

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<SvgLayersGroup {...defaultProps} />);
      expect(container).toBeTruthy();
    });

    it('renders SvgLayer wrapper', () => {
      const { getByTestId } = render(<SvgLayersGroup {...defaultProps} />);
      expect(getByTestId('svg-layer')).toBeTruthy();
    });

    it('passes topLayer prop to SvgLayer', () => {
      render(<SvgLayersGroup {...defaultProps} />);
      expect(mockSvgLayerProps[0].topLayer).toBe(true);
    });

    it('passes classNamePart="SvgLayersGroup" to SvgLayer', () => {
      const { getByTestId } = render(<SvgLayersGroup {...defaultProps} />);
      expect(getByTestId('svg-layer').getAttribute('data-classname-part')).toBe('SvgLayersGroup');
    });

    it('passes getClassName to SvgLayer', () => {
      render(<SvgLayersGroup {...defaultProps} />);
      expect(mockSvgLayerProps[0].getClassName).toBe(defaultProps.getClassName);
    });

    it('passes graphState to SvgLayer', () => {
      render(<SvgLayersGroup {...defaultProps} />);
      expect(mockSvgLayerProps[0].graphState).toBe(defaultProps.graphState);
    });

    it('passes defs to SvgLayer', () => {
      const defs = [{ localId: 'def-1', renderEntry: jest.fn() }];
      render(<SvgLayersGroup {...defaultProps} defs={defs} />);
      expect(mockSvgLayerProps[0].defs).toBe(defs);
    });

    it('passes top-level setOnContainer to SvgLayer', () => {
      const mockSetOnContainer = jest.fn();
      render(<SvgLayersGroup {...defaultProps} setOnContainer={mockSetOnContainer} />);
      expect(mockSvgLayerProps[0].setOnContainer).toBe(mockSetOnContainer);
    });
  });

  describe('edge layers', () => {
    it('renders SvgEdgesLayer for layers with edges=true', () => {
      const layers = [{ key: 'edges-1', edges: true }];
      render(<SvgLayersGroup {...defaultProps} layers={layers} />);
      expect(mockSvgEdgesLayerProps.length).toBe(1);
    });

    it('passes correct props to SvgEdgesLayer', () => {
      const mockSetOnEdge = jest.fn();
      const mockSetOnContainer = jest.fn();
      const layers = [
        {
          key: 'edges-1',
          edges: true,
          markerEndId: 'arrow-end',
          markerStartId: 'arrow-start',
          setOnEdge: mockSetOnEdge,
          setOnContainer: mockSetOnContainer,
        },
      ];
      render(<SvgLayersGroup {...defaultProps} layers={layers} />);

      const edgesLayerProps = mockSvgEdgesLayerProps[0];
      expect(edgesLayerProps.getClassName).toBe(defaultProps.getClassName);
      expect(edgesLayerProps.graphState).toBe(defaultProps.graphState);
      expect(edgesLayerProps.markerEndId).toBe('arrow-end');
      expect(edgesLayerProps.markerStartId).toBe('arrow-start');
      expect(edgesLayerProps.setOnEdge).toBe(mockSetOnEdge);
      expect(edgesLayerProps.setOnContainer).toBe(mockSetOnContainer);
    });
  });

  describe('node layers', () => {
    it('renders NodesLayer for layers without edges', () => {
      const layers = [{ key: 'nodes-1', renderNode: () => <circle /> }];
      render(<SvgLayersGroup {...defaultProps} layers={layers} />);
      expect(mockNodesLayerProps.length).toBe(1);
    });

    it('passes correct props to NodesLayer', () => {
      const mockRenderNode = jest.fn();
      const mockSetOnNode = jest.fn();
      const mockSetOnContainer = jest.fn();
      const layers = [
        {
          key: 'nodes-1',
          renderNode: mockRenderNode,
          setOnNode: mockSetOnNode,
          setOnContainer: mockSetOnContainer,
        },
      ];
      render(<SvgLayersGroup {...defaultProps} layers={layers} />);

      const nodesLayerProps = mockNodesLayerProps[0];
      expect(nodesLayerProps.getClassName).toBe(defaultProps.getClassName);
      expect(nodesLayerProps.graphState).toBe(defaultProps.graphState);
      expect(nodesLayerProps.layerType).toBe(ELayerType.Svg);
      expect(nodesLayerProps.renderNode).toBe(mockRenderNode);
      expect(nodesLayerProps.setOnNode).toBe(mockSetOnNode);
      expect(nodesLayerProps.setOnContainer).toBe(mockSetOnContainer);
    });
  });

  describe('multiple layers', () => {
    it('renders multiple layers in order', () => {
      const layers = [
        { key: 'edges-1', edges: true },
        { key: 'nodes-1', renderNode: () => <circle /> },
        { key: 'edges-2', edges: true },
      ];
      render(<SvgLayersGroup {...defaultProps} layers={layers} />);

      expect(mockSvgEdgesLayerProps.length).toBe(2);
      expect(mockNodesLayerProps.length).toBe(1);
    });

    it('renders all layers from the layers prop', () => {
      const layers = [
        { key: 'my-edges', edges: true },
        { key: 'my-nodes', renderNode: () => <circle /> },
      ];
      const { container } = render(<SvgLayersGroup {...defaultProps} layers={layers} />);

      // Verify all layers are rendered inside the svg-layer wrapper
      const gElements = container.querySelectorAll('svg > g');
      expect(gElements.length).toBe(2);
    });
  });

  describe('measurable layers', () => {
    it('throws error for measurable layers (not implemented)', () => {
      const layers = [{ key: 'measurable-1', measurable: true }];

      expect(() => {
        render(<SvgLayersGroup {...defaultProps} layers={layers} />);
      }).toThrow('Not implemented');
    });
  });

  describe('React.memo behavior', () => {
    it('is wrapped with React.memo for performance', () => {
      // Verify component is wrapped with React.memo by checking $$typeof
      expect(SvgLayersGroup.$$typeof).toBe(Symbol.for('react.memo'));
    });

    it('does not re-render when props are unchanged', () => {
      const trackingLayers = [
        {
          key: 'tracking-layer',
          setOnContainer: jest.fn(),
          renderNode: jest.fn(() => null),
        },
      ];

      const callsBeforeRender = mockNodesLayerProps.length;
      const { rerender } = render(<SvgLayersGroup {...defaultProps} layers={trackingLayers} />);

      // NodesLayer should have been called once
      expect(mockNodesLayerProps.length).toBe(callsBeforeRender + 1);

      // Rerender with the exact same props (same object references)
      rerender(<SvgLayersGroup {...defaultProps} layers={trackingLayers} />);

      // With React.memo, NodesLayer should not be called again
      expect(mockNodesLayerProps.length).toBe(callsBeforeRender + 1);
    });
  });
});
