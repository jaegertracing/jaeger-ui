// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import MeasurableNodes, { arePropsEqual } from './MeasurableNodes';
import { ELayerType } from './types';

// Mock MeasurableNode child component
// Note: jest.mock factory cannot use JSX (compiled to _jsx which is out of scope)
// Must use React.createElement and require('react') inside the factory
const mockMeasurableNodeProps = [];
jest.mock('./MeasurableNode', () => {
  const React = require('react');
  return function MockMeasurableNode(props) {
    mockMeasurableNodeProps.push(props);
    return React.createElement('div', {
      'data-testid': 'measurable-node',
      'data-vertex-key': props.vertex.key,
      'data-hidden': props.hidden.toString(),
    });
  };
});

describe('MeasurableNodes', () => {
  beforeEach(() => {
    mockMeasurableNodeProps.length = 0;
    jest.clearAllMocks();
  });

  const mockGetClassName = name => `plexus--${name}`;

  const mockRenderUtils = {
    getGlobalId: id => `global-${id}`,
    getZoomTransform: () => ({ k: 1, x: 0, y: 0 }),
  };

  const mockRenderNode = () => <span>node content</span>;

  // Create test vertex
  const createVertex = key => ({ key });

  const createLayoutVertex = key => ({
    vertex: { key },
    height: 50,
    width: 100,
    left: 10,
    top: 20,
  });

  const mockVertices = [createVertex('v-a'), createVertex('v-b'), createVertex('v-c')];

  const mockLayoutVertices = [
    createLayoutVertex('v-a'),
    createLayoutVertex('v-b'),
    createLayoutVertex('v-c'),
  ];

  // Create refs array
  const createNodeRefs = count => Array.from({ length: count }, () => React.createRef());

  const defaultProps = {
    getClassName: mockGetClassName,
    layerType: ELayerType.Html,
    layoutVertices: mockLayoutVertices,
    nodeRefs: createNodeRefs(3),
    renderNode: mockRenderNode,
    renderUtils: mockRenderUtils,
    vertices: mockVertices,
  };

  it('renders MeasurableNode for each vertex', () => {
    const { getAllByTestId } = render(
      <div>
        <MeasurableNodes {...defaultProps} />
      </div>
    );
    const nodes = getAllByTestId('measurable-node');
    expect(nodes).toHaveLength(3);
  });

  it('renders nothing when vertices is empty', () => {
    const { queryAllByTestId } = render(
      <div>
        <MeasurableNodes {...defaultProps} vertices={[]} nodeRefs={[]} />
      </div>
    );
    const nodes = queryAllByTestId('measurable-node');
    expect(nodes).toHaveLength(0);
  });

  it('passes vertex key correctly', () => {
    const { getAllByTestId } = render(
      <div>
        <MeasurableNodes {...defaultProps} />
      </div>
    );
    const nodes = getAllByTestId('measurable-node');

    expect(nodes[0]).toHaveAttribute('data-vertex-key', 'v-a');
    expect(nodes[1]).toHaveAttribute('data-vertex-key', 'v-b');
    expect(nodes[2]).toHaveAttribute('data-vertex-key', 'v-c');
  });

  it('sets hidden=true when layoutVertices is null', () => {
    const { getAllByTestId } = render(
      <div>
        <MeasurableNodes {...defaultProps} layoutVertices={null} />
      </div>
    );
    const nodes = getAllByTestId('measurable-node');

    nodes.forEach(node => {
      expect(node).toHaveAttribute('data-hidden', 'true');
    });
  });

  it('sets hidden=false when layoutVertices is provided', () => {
    const { getAllByTestId } = render(
      <div>
        <MeasurableNodes {...defaultProps} />
      </div>
    );
    const nodes = getAllByTestId('measurable-node');

    nodes.forEach(node => {
      expect(node).toHaveAttribute('data-hidden', 'false');
    });
  });

  it('passes setOnNode to child components', () => {
    const mockSetOnNode = jest.fn();
    render(
      <div>
        <MeasurableNodes {...defaultProps} setOnNode={mockSetOnNode} />
      </div>
    );

    expect(mockMeasurableNodeProps).toHaveLength(3);
    mockMeasurableNodeProps.forEach(props => {
      expect(props.setOnNode).toBe(mockSetOnNode);
    });
  });
});

// Tests for the React.memo comparison function
describe('arePropsEqual', () => {
  // Base props for testing - mirrors the shape expected by MeasurableNodes component
  const baseRenderNode = () => <span>node</span>;
  const baseGetClassName = name => `class-${name}`;
  const baseRenderUtils = {
    getGlobalId: id => `global-${id}`,
    getZoomTransform: () => ({ k: 1, x: 0, y: 0 }),
  };
  const baseVertices = [{ key: 'a' }, { key: 'b' }];
  const baseLayoutVertices = [
    { vertex: { key: 'a' }, height: 50, width: 100, left: 0, top: 0 },
    { vertex: { key: 'b' }, height: 50, width: 100, left: 0, top: 0 },
  ];
  const baseNodeRefs = [React.createRef(), React.createRef()];

  const baseProps = {
    renderNode: baseRenderNode,
    getClassName: baseGetClassName,
    layerType: ELayerType.Html,
    layoutVertices: baseLayoutVertices,
    nodeRefs: baseNodeRefs,
    renderUtils: baseRenderUtils,
    vertices: baseVertices,
    setOnNode: undefined,
  };

  describe('returns true (skip re-render) when all props are equal', () => {
    it('with identical prop references', () => {
      expect(arePropsEqual(baseProps, baseProps)).toBe(true);
    });

    it('with separately constructed but same-reference props', () => {
      const props1 = { ...baseProps };
      const props2 = {
        renderNode: baseRenderNode,
        getClassName: baseGetClassName,
        layerType: ELayerType.Html,
        layoutVertices: baseLayoutVertices,
        nodeRefs: baseNodeRefs,
        renderUtils: baseRenderUtils,
        vertices: baseVertices,
        setOnNode: undefined,
      };
      expect(arePropsEqual(props1, props2)).toBe(true);
    });
  });

  describe('returns false (trigger re-render) when props differ', () => {
    it('when renderNode changes', () => {
      const newProps = { ...baseProps, renderNode: () => <div>different</div> };
      expect(arePropsEqual(baseProps, newProps)).toBe(false);
    });

    it('when getClassName changes', () => {
      const newProps = { ...baseProps, getClassName: name => `new-${name}` };
      expect(arePropsEqual(baseProps, newProps)).toBe(false);
    });

    it('when layerType changes from Html to Svg', () => {
      const newProps = { ...baseProps, layerType: ELayerType.Svg };
      expect(arePropsEqual(baseProps, newProps)).toBe(false);
    });

    it('when layoutVertices array reference changes', () => {
      const newLayoutVertices = [
        { vertex: { key: 'a' }, height: 50, width: 100, left: 0, top: 0 },
      ];
      const newProps = { ...baseProps, layoutVertices: newLayoutVertices };
      expect(arePropsEqual(baseProps, newProps)).toBe(false);
    });

    it('when layoutVertices changes from array to null', () => {
      const newProps = { ...baseProps, layoutVertices: null };
      expect(arePropsEqual(baseProps, newProps)).toBe(false);
    });

    it('when nodeRefs array reference changes', () => {
      const newNodeRefs = [React.createRef(), React.createRef()];
      const newProps = { ...baseProps, nodeRefs: newNodeRefs };
      expect(arePropsEqual(baseProps, newProps)).toBe(false);
    });

    it('when renderUtils object reference changes', () => {
      const newRenderUtils = {
        getGlobalId: id => `global-${id}`,
        getZoomTransform: () => ({ k: 1, x: 0, y: 0 }),
      };
      const newProps = { ...baseProps, renderUtils: newRenderUtils };
      expect(arePropsEqual(baseProps, newProps)).toBe(false);
    });

    it('when vertices array reference changes', () => {
      const newVertices = [{ key: 'a' }, { key: 'b' }];
      const newProps = { ...baseProps, vertices: newVertices };
      expect(arePropsEqual(baseProps, newProps)).toBe(false);
    });

    it('when setOnNode changes from undefined to a function', () => {
      const newProps = { ...baseProps, setOnNode: () => ({}) };
      expect(arePropsEqual(baseProps, newProps)).toBe(false);
    });

    it('when setOnNode changes from a function to undefined', () => {
      const propsWithSetter = { ...baseProps, setOnNode: () => ({}) };
      const propsWithoutSetter = { ...baseProps, setOnNode: undefined };
      expect(arePropsEqual(propsWithSetter, propsWithoutSetter)).toBe(false);
    });
  });

  describe('setOnNode array comparison (via isSamePropSetter)', () => {
    it('returns true when setOnNode arrays have same item references', () => {
      const setter1 = () => ({});
      const setter2 = () => ({});
      const sharedArray = [setter1, setter2];
      const props1 = { ...baseProps, setOnNode: sharedArray };
      const props2 = { ...baseProps, setOnNode: sharedArray };
      expect(arePropsEqual(props1, props2)).toBe(true);
    });

    it('returns false when setOnNode arrays have different item references', () => {
      const props1 = { ...baseProps, setOnNode: [() => ({})] };
      const props2 = { ...baseProps, setOnNode: [() => ({})] };
      expect(arePropsEqual(props1, props2)).toBe(false);
    });

    it('returns false when setOnNode arrays have different lengths', () => {
      const setter = () => ({});
      const props1 = { ...baseProps, setOnNode: [setter] };
      const props2 = { ...baseProps, setOnNode: [setter, setter] };
      expect(arePropsEqual(props1, props2)).toBe(false);
    });

    it('returns false when one setOnNode is array and other is not', () => {
      const setter = () => ({});
      const props1 = { ...baseProps, setOnNode: [setter] };
      const props2 = { ...baseProps, setOnNode: setter };
      expect(arePropsEqual(props1, props2)).toBe(false);
    });

    it('returns true when both setOnNode are empty arrays with same reference', () => {
      const emptyArray = [];
      const props1 = { ...baseProps, setOnNode: emptyArray };
      const props2 = { ...baseProps, setOnNode: emptyArray };
      expect(arePropsEqual(props1, props2)).toBe(true);
    });

    it('returns true when both setOnNode are different empty array references', () => {
      const props1 = { ...baseProps, setOnNode: [] };
      const props2 = { ...baseProps, setOnNode: [] };
      expect(arePropsEqual(props1, props2)).toBe(true);
    });
  });

  describe('setOnNode null/undefined edge cases', () => {
    it('returns true when both setOnNode are undefined', () => {
      const props1 = { ...baseProps, setOnNode: undefined };
      const props2 = { ...baseProps, setOnNode: undefined };
      expect(arePropsEqual(props1, props2)).toBe(true);
    });

    it('returns true when both setOnNode are null', () => {
      const props1 = { ...baseProps, setOnNode: null };
      const props2 = { ...baseProps, setOnNode: null };
      expect(arePropsEqual(props1, props2)).toBe(true);
    });

    it('returns false when one setOnNode is null and other is undefined', () => {
      const props1 = { ...baseProps, setOnNode: null };
      const props2 = { ...baseProps, setOnNode: undefined };
      expect(arePropsEqual(props1, props2)).toBe(false);
    });
  });
});
