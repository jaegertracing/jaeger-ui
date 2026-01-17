// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Nodes, { arePropsEqual } from './Nodes';
import { ELayerType } from './types';

// Mock Node child component
// Note: jest.mock factory cannot use JSX (compiled to _jsx which is out of scope)
// Must use React.createElement and require('react') inside the factory
const mockNodeProps = [];
jest.mock('./Node', () => {
  const React = require('react');
  const MockNode = props => {
    mockNodeProps.push(props);
    return React.createElement('div', {
      'data-testid': 'node',
      'data-vertex-key': props.layoutVertex.vertex.key,
      'data-layer-type': props.layerType,
    });
  };
  return MockNode;
});

describe('Nodes', () => {
  beforeEach(() => {
    mockNodeProps.length = 0;
    jest.clearAllMocks();
  });

  const mockGetClassName = name => `plexus--${name}`;

  const mockRenderUtils = {
    getGlobalId: id => `global-${id}`,
    getZoomTransform: () => ({ k: 1, x: 0, y: 0 }),
  };

  const mockRenderNode = () => <span>node content</span>;

  // Create mock layoutVertex for testing
  const createLayoutVertex = key => ({
    vertex: { key },
    height: 50,
    width: 100,
    left: 10,
    top: 20,
  });

  const mockLayoutVertices = [
    createLayoutVertex('vertex-a'),
    createLayoutVertex('vertex-b'),
    createLayoutVertex('vertex-c'),
  ];

  const defaultProps = {
    getClassName: mockGetClassName,
    layerType: ELayerType.Html,
    layoutVertices: mockLayoutVertices,
    renderNode: mockRenderNode,
    renderUtils: mockRenderUtils,
  };

  it('renders Node for each layout vertex', () => {
    const { getAllByTestId } = render(
      <div>
        <Nodes {...defaultProps} />
      </div>
    );
    const nodes = getAllByTestId('node');
    expect(nodes).toHaveLength(3);
  });

  it('renders nothing when layoutVertices is empty', () => {
    const { queryAllByTestId } = render(
      <div>
        <Nodes {...defaultProps} layoutVertices={[]} />
      </div>
    );
    const nodes = queryAllByTestId('node');
    expect(nodes).toHaveLength(0);
  });

  it('passes vertex key correctly to Node', () => {
    const { getAllByTestId } = render(
      <div>
        <Nodes {...defaultProps} />
      </div>
    );
    const nodes = getAllByTestId('node');

    expect(nodes[0]).toHaveAttribute('data-vertex-key', 'vertex-a');
    expect(nodes[1]).toHaveAttribute('data-vertex-key', 'vertex-b');
    expect(nodes[2]).toHaveAttribute('data-vertex-key', 'vertex-c');
  });

  it('passes layerType correctly to Node', () => {
    const { getAllByTestId } = render(
      <div>
        <Nodes {...defaultProps} layerType={ELayerType.Svg} />
      </div>
    );
    const nodes = getAllByTestId('node');

    nodes.forEach(node => {
      expect(node).toHaveAttribute('data-layer-type', ELayerType.Svg);
    });
  });

  it('passes setOnNode to child components', () => {
    const mockSetOnNode = jest.fn();
    render(
      <div>
        <Nodes {...defaultProps} setOnNode={mockSetOnNode} />
      </div>
    );

    expect(mockNodeProps).toHaveLength(3);
    mockNodeProps.forEach(props => {
      expect(props.setOnNode).toBe(mockSetOnNode);
    });
  });
});

// Tests for the React.memo comparison function
describe('arePropsEqual', () => {
  // Base props for testing - mirrors the shape expected by Nodes component
  const baseRenderNode = () => <span>node</span>;
  const baseGetClassName = name => `class-${name}`;
  const baseRenderUtils = {
    getGlobalId: id => `global-${id}`,
    getZoomTransform: () => ({ k: 1, x: 0, y: 0 }),
  };
  const baseLayoutVertices = [{ vertex: { key: 'a' }, height: 50, width: 100, left: 0, top: 0 }];

  const baseProps = {
    renderNode: baseRenderNode,
    getClassName: baseGetClassName,
    layerType: ELayerType.Html,
    layoutVertices: baseLayoutVertices,
    renderUtils: baseRenderUtils,
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
        renderUtils: baseRenderUtils,
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
      const newVertices = [{ vertex: { key: 'a' }, height: 50, width: 100, left: 0, top: 0 }];
      const newProps = { ...baseProps, layoutVertices: newVertices };
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
      // isSamePropSetter compares array items, empty arrays have no items to differ
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
