// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import Digraph from './index';
import { ELayerType, ELayoutPhase } from './types';

// Track props passed to mocked components
const mockHtmlLayersGroupProps = [];
const mockSvgLayersGroupProps = [];
const mockSvgEdgesLayerProps = [];
const mockMeasurableNodesLayerProps = [];
const mockNodesLayerProps = [];
const mockMiniMapProps = [];

// Mock ZoomManager
const mockZoomManagerInstance = {
  setElement: jest.fn(),
  setContentSize: jest.fn(),
  getProps: jest.fn(() => ({ viewAll: jest.fn() })),
};

jest.mock('../zoom/ZoomManager', () => {
  const actual = jest.requireActual('../zoom/ZoomManager');
  return {
    __esModule: true,
    default: jest.fn(() => mockZoomManagerInstance),
    zoomIdentity: actual.zoomIdentity,
    ZoomTransform: actual.ZoomTransform,
  };
});

jest.mock('../zoom/MiniMap', () => {
  const MockMiniMap = props => {
    mockMiniMapProps.push(props);
    return <div data-testid="minimap" />;
  };
  return MockMiniMap;
});

jest.mock('./HtmlLayersGroup', () => {
  const MockHtmlLayersGroup = props => {
    mockHtmlLayersGroupProps.push(props);
    return <div data-testid="html-layers-group" />;
  };
  return MockHtmlLayersGroup;
});

jest.mock('./SvgLayersGroup', () => {
  const MockSvgLayersGroup = props => {
    mockSvgLayersGroupProps.push(props);
    return <svg data-testid="svg-layers-group" />;
  };
  return MockSvgLayersGroup;
});

jest.mock('./SvgEdgesLayer', () => {
  const MockSvgEdgesLayer = props => {
    mockSvgEdgesLayerProps.push(props);
    return <svg data-testid="svg-edges-layer" />;
  };
  return MockSvgEdgesLayer;
});

jest.mock('./MeasurableNodesLayer', () => {
  const MockMeasurableNodesLayer = props => {
    mockMeasurableNodesLayerProps.push(props);
    return <div data-testid="measurable-nodes-layer" />;
  };
  return MockMeasurableNodesLayer;
});

jest.mock('./NodesLayer', () => {
  const MockNodesLayer = props => {
    mockNodesLayerProps.push(props);
    return <div data-testid="nodes-layer" />;
  };
  return MockNodesLayer;
});

describe('Digraph', () => {
  const createVertex = key => ({ key, data: { label: key } });
  const createEdge = (from, to) => ({ from, to, data: {} });

  const createLayoutManager = () => ({
    getLayout: jest.fn(() => ({
      layout: Promise.resolve({
        isCancelled: false,
        edges: [],
        graph: { width: 100, height: 100 },
        vertices: [],
      }),
    })),
  });

  const defaultProps = {
    edges: [createEdge('a', 'b')],
    vertices: [createVertex('a'), createVertex('b')],
    layers: [
      {
        key: 'nodes',
        layerType: ELayerType.Svg,
        renderNode: () => <circle />,
      },
    ],
    layoutManager: createLayoutManager(),
    measurableNodesKey: 'measurable',
  };

  beforeEach(() => {
    mockHtmlLayersGroupProps.length = 0;
    mockSvgLayersGroupProps.length = 0;
    mockSvgEdgesLayerProps.length = 0;
    mockMeasurableNodesLayerProps.length = 0;
    mockNodesLayerProps.length = 0;
    mockMiniMapProps.length = 0;
    mockZoomManagerInstance.setElement.mockClear();
    mockZoomManagerInstance.setContentSize.mockClear();
    mockZoomManagerInstance.getProps.mockClear();
  });

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<Digraph {...defaultProps} />);
      expect(container).toBeTruthy();
    });

    it('renders with correct className', () => {
      const { container } = render(<Digraph {...defaultProps} className="custom-class" />);
      expect(container.firstChild.className).toContain('custom-class');
    });

    it('applies custom style', () => {
      const { container } = render(<Digraph {...defaultProps} style={{ backgroundColor: 'red' }} />);
      expect(container.firstChild.style.backgroundColor).toBe('red');
    });

    it('uses classNamePrefix for root className', () => {
      const { container } = render(<Digraph {...defaultProps} classNamePrefix="custom" />);
      expect(container.firstChild.className).toContain('custom');
      expect(container.firstChild.className).toContain('custom-Digraph');
    });
  });

  describe('static properties', () => {
    it('has propsFactories static property', () => {
      expect(Digraph.propsFactories).toBeDefined();
      expect(Digraph.propsFactories.classNameIsSmall).toBeDefined();
      expect(Digraph.propsFactories.scaleOpacity).toBeDefined();
    });

    it('has scaleProperty static property', () => {
      expect(Digraph.scaleProperty).toBeDefined();
      expect(Digraph.scaleProperty.opacity).toBeDefined();
    });

    it('has defaultProps static property', () => {
      expect(Digraph.defaultProps).toBeDefined();
      expect(Digraph.defaultProps.classNamePrefix).toBe('plexus');
      expect(Digraph.defaultProps.minimap).toBe(false);
      expect(Digraph.defaultProps.zoom).toBe(false);
    });
  });

  describe('layer rendering', () => {
    it('renders NodesLayer for simple node layer', () => {
      render(<Digraph {...defaultProps} />);
      expect(mockNodesLayerProps.length).toBe(1);
    });

    it('renders MeasurableNodesLayer for measurable layer', () => {
      const layers = [
        {
          key: 'measurable',
          layerType: ELayerType.Svg,
          measurable: true,
          renderNode: () => <circle />,
        },
      ];
      render(<Digraph {...defaultProps} layers={layers} />);
      expect(mockMeasurableNodesLayerProps.length).toBe(1);
    });

    it('renders HtmlLayersGroup for Html group layer', () => {
      const layers = [
        {
          key: 'html-group',
          layerType: ELayerType.Html,
          layers: [{ key: 'inner', layerType: ELayerType.Html, renderNode: () => <div /> }],
        },
      ];
      render(<Digraph {...defaultProps} layers={layers} />);
      expect(mockHtmlLayersGroupProps.length).toBe(1);
    });

    it('renders SvgLayersGroup for Svg group layer', () => {
      const layers = [
        {
          key: 'svg-group',
          layerType: ELayerType.Svg,
          layers: [{ key: 'inner', layerType: ELayerType.Svg, renderNode: () => <circle /> }],
        },
      ];
      render(<Digraph {...defaultProps} layers={layers} />);
      expect(mockSvgLayersGroupProps.length).toBe(1);
    });

    it('passes correct props to NodesLayer', () => {
      render(<Digraph {...defaultProps} classNamePrefix="test" />);
      expect(mockNodesLayerProps[0].standalone).toBe(true);
      expect(mockNodesLayerProps[0].layerType).toBe(ELayerType.Svg);
      expect(typeof mockNodesLayerProps[0].getClassName).toBe('function');
      expect(mockNodesLayerProps[0].graphState).toBeDefined();
    });

    it('getClassName produces correct class names', () => {
      render(<Digraph {...defaultProps} classNamePrefix="myPrefix" />);
      const getClassName = mockNodesLayerProps[0].getClassName;
      expect(getClassName('test')).toBe('myPrefix myPrefix-Digraph--test');
    });
  });

  describe('zoom functionality', () => {
    it('does not create ZoomManager when zoom is disabled', () => {
      const ZoomManager = require('../zoom/ZoomManager').default;
      ZoomManager.mockClear();
      render(<Digraph {...defaultProps} zoom={false} />);
      expect(ZoomManager).not.toHaveBeenCalled();
    });

    it('creates ZoomManager when zoom is enabled', () => {
      const ZoomManager = require('../zoom/ZoomManager').default;
      ZoomManager.mockClear();
      render(<Digraph {...defaultProps} zoom />);
      expect(ZoomManager).toHaveBeenCalled();
    });

    it('sets element on ZoomManager on mount', () => {
      render(<Digraph {...defaultProps} zoom />);
      expect(mockZoomManagerInstance.setElement).toHaveBeenCalled();
    });

    it('applies zoom wrapper style when zoom is enabled', () => {
      const { container } = render(<Digraph {...defaultProps} zoom />);
      expect(container.firstChild.style.overflow).toBe('hidden');
      expect(container.firstChild.style.height).toBe('100%');
      expect(container.firstChild.style.width).toBe('100%');
    });
  });

  describe('minimap functionality', () => {
    it('does not render MiniMap when minimap is disabled', () => {
      render(<Digraph {...defaultProps} zoom minimap={false} />);
      expect(mockMiniMapProps.length).toBe(0);
    });

    it('renders MiniMap when minimap and zoom are enabled', () => {
      render(<Digraph {...defaultProps} zoom minimap />);
      expect(mockMiniMapProps.length).toBe(1);
    });

    it('does not render MiniMap when zoom is disabled even if minimap is enabled', () => {
      render(<Digraph {...defaultProps} zoom={false} minimap />);
      expect(mockMiniMapProps.length).toBe(0);
    });

    it('passes minimapClassName to MiniMap', () => {
      render(<Digraph {...defaultProps} zoom minimap minimapClassName="custom-minimap" />);
      expect(mockMiniMapProps[0].className).toBe('custom-minimap');
    });
  });

  describe('layout phase management', () => {
    it('starts with CalcSizes phase when data is provided', () => {
      render(<Digraph {...defaultProps} />);
      expect(mockNodesLayerProps[0].graphState.layoutPhase).toBe(ELayoutPhase.CalcSizes);
    });

    it('starts with NoData phase when edges are empty', () => {
      render(<Digraph {...defaultProps} edges={[]} />);
      expect(mockNodesLayerProps[0].graphState.layoutPhase).toBe(ELayoutPhase.NoData);
    });

    it('starts with NoData phase when vertices are empty', () => {
      render(<Digraph {...defaultProps} vertices={[]} />);
      expect(mockNodesLayerProps[0].graphState.layoutPhase).toBe(ELayoutPhase.NoData);
    });
  });

  describe('graphState passed to layers', () => {
    it('includes vertices in graphState', () => {
      render(<Digraph {...defaultProps} />);
      expect(mockNodesLayerProps[0].graphState.vertices).toEqual(defaultProps.vertices);
    });

    it('includes edges in graphState', () => {
      render(<Digraph {...defaultProps} />);
      expect(mockNodesLayerProps[0].graphState.edges).toEqual(defaultProps.edges);
    });

    it('includes renderUtils in graphState', () => {
      render(<Digraph {...defaultProps} />);
      const { renderUtils } = mockNodesLayerProps[0].graphState;
      expect(renderUtils).toBeDefined();
      expect(typeof renderUtils.getGlobalId).toBe('function');
      expect(typeof renderUtils.getZoomTransform).toBe('function');
    });

    it('getGlobalId creates unique IDs', () => {
      render(<Digraph {...defaultProps} />);
      const { renderUtils } = mockNodesLayerProps[0].graphState;
      const id = renderUtils.getGlobalId('test');
      expect(id).toContain('plexus--Digraph--');
      expect(id).toContain('--test');
    });
  });

  describe('edges layer rendering', () => {
    it('does not render SvgEdgesLayer before layout is done', () => {
      const layers = [
        {
          key: 'edges',
          edges: true,
          layerType: ELayerType.Svg,
        },
      ];
      render(<Digraph {...defaultProps} layers={layers} />);
      // Before layout is done, edges layer should not be rendered
      expect(mockSvgEdgesLayerProps.length).toBe(0);
    });
  });

  describe('setOnGraph prop', () => {
    it('applies setOnGraph props to root element', () => {
      const setOnGraph = () => ({ className: 'from-setOnGraph', 'data-custom': 'value' });
      const { container } = render(<Digraph {...defaultProps} setOnGraph={setOnGraph} />);
      expect(container.firstChild.className).toContain('from-setOnGraph');
      expect(container.firstChild.getAttribute('data-custom')).toBe('value');
    });
  });

  describe('error handling', () => {
    it('throws error for unrecognized layer type', () => {
      const layers = [
        {
          key: 'unknown',
          layerType: ELayerType.Svg,
          // No renderNode, measurable, edges, or layers - unrecognized
        },
      ];
      expect(() => render(<Digraph {...defaultProps} layers={layers} />)).toThrow('Unrecognized layer');
    });
  });

  describe('React.memo behavior', () => {
    it('is wrapped with React.memo for performance', () => {
      // After conversion to functional component
      expect(Digraph.$$typeof).toBeDefined();
    });
  });
});
