// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import MeasurableNodes from './MeasurableNodes';
import { ELayerType } from './types';

// Track props passed to mocked MeasurableNode component
const mockMeasurableNodeProps = [];

jest.mock('./MeasurableNode', () => {
  const React = require('react');
  const MockMeasurableNode = React.forwardRef((props, ref) => {
    mockMeasurableNodeProps.push(props);
    return React.createElement('g', {
      'data-testid': `measurable-node-${props.vertex.key}`,
      ref: ref,
    });
  });
  return MockMeasurableNode;
});

// Mock isSamePropSetter for testing comparison logic
let mockIsSamePropSetterReturn = true;
jest.mock('./utils', () => ({
  isSamePropSetter: (a, b) => mockIsSamePropSetterReturn,
}));

describe('MeasurableNodes', () => {
  const createVertex = key => ({ key, data: { label: key } });

  const createLayoutVertex = (key, left = 0, top = 0) => ({
    vertex: createVertex(key),
    left,
    top,
    width: 100,
    height: 50,
  });

  const defaultProps = {
    getClassName: name => `test-${name}`,
    layerType: ELayerType.Svg,
    layoutVertices: [createLayoutVertex('a'), createLayoutVertex('b'), createLayoutVertex('c')],
    nodeRefs: [React.createRef(), React.createRef(), React.createRef()],
    renderNode: () => <circle />,
    renderUtils: {
      getGlobalId: id => `global-${id}`,
    },
    vertices: [createVertex('a'), createVertex('b'), createVertex('c')],
  };

  beforeEach(() => {
    mockMeasurableNodeProps.length = 0;
    mockIsSamePropSetterReturn = true;
  });

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );
      expect(container).toBeTruthy();
    });

    it('renders a MeasurableNode for each vertex', () => {
      render(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );
      expect(mockMeasurableNodeProps.length).toBe(3);
    });

    it('renders nodes with correct keys', () => {
      const { getAllByTestId } = render(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );
      expect(getAllByTestId(/^measurable-node-/)).toHaveLength(3);
    });
  });

  describe('props passed to MeasurableNode', () => {
    it('passes getClassName to each MeasurableNode', () => {
      render(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );
      mockMeasurableNodeProps.forEach(props => {
        expect(props.getClassName).toBe(defaultProps.getClassName);
      });
    });

    it('passes layerType to each MeasurableNode', () => {
      render(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );
      mockMeasurableNodeProps.forEach(props => {
        expect(props.layerType).toBe(ELayerType.Svg);
      });
    });

    it('passes correct vertex to each MeasurableNode', () => {
      render(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );
      expect(mockMeasurableNodeProps[0].vertex.key).toBe('a');
      expect(mockMeasurableNodeProps[1].vertex.key).toBe('b');
      expect(mockMeasurableNodeProps[2].vertex.key).toBe('c');
    });

    it('passes renderNode to each MeasurableNode', () => {
      render(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );
      mockMeasurableNodeProps.forEach(props => {
        expect(props.renderNode).toBe(defaultProps.renderNode);
      });
    });

    it('passes renderUtils to each MeasurableNode', () => {
      render(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );
      mockMeasurableNodeProps.forEach(props => {
        expect(props.renderUtils).toBe(defaultProps.renderUtils);
      });
    });

    it('passes setOnNode to each MeasurableNode', () => {
      const mockSetOnNode = jest.fn();
      render(
        <svg>
          <MeasurableNodes {...defaultProps} setOnNode={mockSetOnNode} />
        </svg>
      );
      mockMeasurableNodeProps.forEach(props => {
        expect(props.setOnNode).toBe(mockSetOnNode);
      });
    });

    it('passes correct layoutVertex to each MeasurableNode', () => {
      render(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );
      expect(mockMeasurableNodeProps[0].layoutVertex.vertex.key).toBe('a');
      expect(mockMeasurableNodeProps[1].layoutVertex.vertex.key).toBe('b');
      expect(mockMeasurableNodeProps[2].layoutVertex.vertex.key).toBe('c');
    });
  });

  describe('hidden prop based on layoutVertices', () => {
    it('sets hidden=false when layoutVertices is provided', () => {
      render(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );
      mockMeasurableNodeProps.forEach(props => {
        expect(props.hidden).toBe(false);
      });
    });

    it('sets hidden=true when layoutVertices is null', () => {
      render(
        <svg>
          <MeasurableNodes {...defaultProps} layoutVertices={null} />
        </svg>
      );
      mockMeasurableNodeProps.forEach(props => {
        expect(props.hidden).toBe(true);
      });
    });
  });

  describe('memoization with custom comparison', () => {
    it('is wrapped with React.memo', () => {
      expect(MeasurableNodes.$$typeof).toBeDefined();
    });

    it('re-renders when renderNode changes', () => {
      const { rerender } = render(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );
      const initialCount = mockMeasurableNodeProps.length;

      const newRenderNode = () => <rect />;
      rerender(
        <svg>
          <MeasurableNodes {...defaultProps} renderNode={newRenderNode} />
        </svg>
      );

      expect(mockMeasurableNodeProps.length).toBeGreaterThan(initialCount);
    });

    it('re-renders when getClassName changes', () => {
      const { rerender } = render(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );
      const initialCount = mockMeasurableNodeProps.length;

      const newGetClassName = name => `new-${name}`;
      rerender(
        <svg>
          <MeasurableNodes {...defaultProps} getClassName={newGetClassName} />
        </svg>
      );

      expect(mockMeasurableNodeProps.length).toBeGreaterThan(initialCount);
    });

    it('re-renders when layerType changes', () => {
      const { rerender } = render(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );
      const initialCount = mockMeasurableNodeProps.length;

      rerender(
        <svg>
          <MeasurableNodes {...defaultProps} layerType={ELayerType.Html} />
        </svg>
      );

      expect(mockMeasurableNodeProps.length).toBeGreaterThan(initialCount);
    });

    it('re-renders when layoutVertices changes', () => {
      const { rerender } = render(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );
      const initialCount = mockMeasurableNodeProps.length;

      const newLayoutVertices = [createLayoutVertex('x'), createLayoutVertex('y')];
      rerender(
        <svg>
          <MeasurableNodes {...defaultProps} layoutVertices={newLayoutVertices} />
        </svg>
      );

      expect(mockMeasurableNodeProps.length).toBeGreaterThan(initialCount);
    });

    it('re-renders when nodeRefs changes', () => {
      const { rerender } = render(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );
      const initialCount = mockMeasurableNodeProps.length;

      const newNodeRefs = [React.createRef(), React.createRef(), React.createRef()];
      rerender(
        <svg>
          <MeasurableNodes {...defaultProps} nodeRefs={newNodeRefs} />
        </svg>
      );

      expect(mockMeasurableNodeProps.length).toBeGreaterThan(initialCount);
    });

    it('re-renders when renderUtils changes', () => {
      const { rerender } = render(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );
      const initialCount = mockMeasurableNodeProps.length;

      const newRenderUtils = { getGlobalId: id => `new-${id}` };
      rerender(
        <svg>
          <MeasurableNodes {...defaultProps} renderUtils={newRenderUtils} />
        </svg>
      );

      expect(mockMeasurableNodeProps.length).toBeGreaterThan(initialCount);
    });

    it('re-renders when vertices changes', () => {
      const { rerender } = render(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );
      const initialCount = mockMeasurableNodeProps.length;

      const newVertices = [createVertex('x'), createVertex('y')];
      const newNodeRefs = [React.createRef(), React.createRef()];
      const newLayoutVertices = [createLayoutVertex('x'), createLayoutVertex('y')];
      rerender(
        <svg>
          <MeasurableNodes
            {...defaultProps}
            vertices={newVertices}
            nodeRefs={newNodeRefs}
            layoutVertices={newLayoutVertices}
          />
        </svg>
      );

      expect(mockMeasurableNodeProps.length).toBeGreaterThan(initialCount);
    });

    it('re-renders when setOnNode changes (via isSamePropSetter)', () => {
      const { rerender } = render(
        <svg>
          <MeasurableNodes {...defaultProps} setOnNode={() => null} />
        </svg>
      );
      const initialCount = mockMeasurableNodeProps.length;

      mockIsSamePropSetterReturn = false;
      rerender(
        <svg>
          <MeasurableNodes {...defaultProps} setOnNode={() => ({ custom: true })} />
        </svg>
      );

      expect(mockMeasurableNodeProps.length).toBeGreaterThan(initialCount);
    });

    it('does not re-render when props are the same', () => {
      const { rerender } = render(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );
      const initialCount = mockMeasurableNodeProps.length;

      rerender(
        <svg>
          <MeasurableNodes {...defaultProps} />
        </svg>
      );

      expect(mockMeasurableNodeProps.length).toBe(initialCount);
    });
  });

  describe('empty vertices', () => {
    it('renders nothing when vertices is empty', () => {
      const { container } = render(
        <svg>
          <MeasurableNodes {...defaultProps} vertices={[]} nodeRefs={[]} layoutVertices={[]} />
        </svg>
      );
      expect(container.querySelectorAll('[data-testid^="measurable-node-"]').length).toBe(0);
    });
  });
});
