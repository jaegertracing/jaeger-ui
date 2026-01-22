// Copyright (c) 2026 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import Nodes from './Nodes';
import { ELayerType } from './types';

// Track props passed to mocked Node component
const mockNodeProps = [];

// 使用 React.createElement 而非 JSX，因為 jest.mock 的工廠函數不允許引用外部變數
jest.mock('./Node', () => {
  const React = require('react');
  const MockNode = props => {
    mockNodeProps.push(props);
    return React.createElement('g', { 'data-testid': `node-${props.layoutVertex.vertex.key}` });
  };
  return MockNode;
});

// Mock isSamePropSetter for testing comparison logic
let mockIsSamePropSetterReturn = true;
jest.mock('./utils', () => ({
  isSamePropSetter: (prevSetter, nextSetter) => mockIsSamePropSetterReturn,
}));

describe('Nodes', () => {
  const createLayoutVertex = (key, left = 0, top = 0) => ({
    vertex: { key },
    left,
    top,
    width: 100,
    height: 50,
  });

  const defaultProps = {
    getClassName: name => `test-${name}`,
    layerType: ELayerType.Svg,
    layoutVertices: [createLayoutVertex('a'), createLayoutVertex('b'), createLayoutVertex('c')],
    renderNode: () => <circle />,
    renderUtils: {
      getGlobalId: id => `global-${id}`,
    },
  };

  beforeEach(() => {
    mockNodeProps.length = 0;
    mockIsSamePropSetterReturn = true;
  });

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <svg>
          <Nodes {...defaultProps} />
        </svg>
      );
      expect(container).toBeTruthy();
    });

    it('renders a Node for each layout vertex', () => {
      render(
        <svg>
          <Nodes {...defaultProps} />
        </svg>
      );
      expect(mockNodeProps.length).toBe(3);
    });

    it('renders nodes with correct keys', () => {
      const { getAllByTestId } = render(
        <svg>
          <Nodes {...defaultProps} />
        </svg>
      );
      expect(getAllByTestId(/^node-/)).toHaveLength(3);
    });
  });

  describe('props passed to Node', () => {
    it('passes getClassName to each Node', () => {
      render(
        <svg>
          <Nodes {...defaultProps} />
        </svg>
      );
      mockNodeProps.forEach(props => {
        expect(props.getClassName).toBe(defaultProps.getClassName);
      });
    });

    it('passes layerType to each Node', () => {
      render(
        <svg>
          <Nodes {...defaultProps} />
        </svg>
      );
      mockNodeProps.forEach(props => {
        expect(props.layerType).toBe(ELayerType.Svg);
      });
    });

    it('passes correct layoutVertex to each Node', () => {
      render(
        <svg>
          <Nodes {...defaultProps} />
        </svg>
      );
      expect(mockNodeProps[0].layoutVertex.vertex.key).toBe('a');
      expect(mockNodeProps[1].layoutVertex.vertex.key).toBe('b');
      expect(mockNodeProps[2].layoutVertex.vertex.key).toBe('c');
    });

    it('passes renderNode to each Node', () => {
      render(
        <svg>
          <Nodes {...defaultProps} />
        </svg>
      );
      mockNodeProps.forEach(props => {
        expect(props.renderNode).toBe(defaultProps.renderNode);
      });
    });

    it('passes renderUtils to each Node', () => {
      render(
        <svg>
          <Nodes {...defaultProps} />
        </svg>
      );
      mockNodeProps.forEach(props => {
        expect(props.renderUtils).toBe(defaultProps.renderUtils);
      });
    });

    it('passes setOnNode to each Node', () => {
      const mockSetOnNode = jest.fn();
      render(
        <svg>
          <Nodes {...defaultProps} setOnNode={mockSetOnNode} />
        </svg>
      );
      mockNodeProps.forEach(props => {
        expect(props.setOnNode).toBe(mockSetOnNode);
      });
    });
  });

  describe('memoization with custom comparison', () => {
    it('is wrapped with React.memo', () => {
      expect(Nodes.$$typeof).toBeDefined();
    });

    it('re-renders when renderNode changes', () => {
      const { rerender } = render(
        <svg>
          <Nodes {...defaultProps} />
        </svg>
      );
      const initialCount = mockNodeProps.length;

      const newRenderNode = () => <rect />;
      rerender(
        <svg>
          <Nodes {...defaultProps} renderNode={newRenderNode} />
        </svg>
      );

      expect(mockNodeProps.length).toBeGreaterThan(initialCount);
    });

    it('re-renders when getClassName changes', () => {
      const { rerender } = render(
        <svg>
          <Nodes {...defaultProps} />
        </svg>
      );
      const initialCount = mockNodeProps.length;

      const newGetClassName = name => `new-${name}`;
      rerender(
        <svg>
          <Nodes {...defaultProps} getClassName={newGetClassName} />
        </svg>
      );

      expect(mockNodeProps.length).toBeGreaterThan(initialCount);
    });

    it('re-renders when layerType changes', () => {
      const { rerender } = render(
        <svg>
          <Nodes {...defaultProps} />
        </svg>
      );
      const initialCount = mockNodeProps.length;

      rerender(
        <svg>
          <Nodes {...defaultProps} layerType={ELayerType.Html} />
        </svg>
      );

      expect(mockNodeProps.length).toBeGreaterThan(initialCount);
    });

    it('re-renders when layoutVertices changes', () => {
      const { rerender } = render(
        <svg>
          <Nodes {...defaultProps} />
        </svg>
      );
      const initialCount = mockNodeProps.length;

      const newVertices = [createLayoutVertex('x'), createLayoutVertex('y')];
      rerender(
        <svg>
          <Nodes {...defaultProps} layoutVertices={newVertices} />
        </svg>
      );

      expect(mockNodeProps.length).toBeGreaterThan(initialCount);
    });

    it('re-renders when renderUtils changes', () => {
      const { rerender } = render(
        <svg>
          <Nodes {...defaultProps} />
        </svg>
      );
      const initialCount = mockNodeProps.length;

      const newRenderUtils = { getGlobalId: id => `new-${id}` };
      rerender(
        <svg>
          <Nodes {...defaultProps} renderUtils={newRenderUtils} />
        </svg>
      );

      expect(mockNodeProps.length).toBeGreaterThan(initialCount);
    });

    it('re-renders when setOnNode changes (via isSamePropSetter)', () => {
      const { rerender } = render(
        <svg>
          <Nodes {...defaultProps} setOnNode={() => null} />
        </svg>
      );
      const initialCount = mockNodeProps.length;

      // Simulate isSamePropSetter returning false
      mockIsSamePropSetterReturn = false;
      rerender(
        <svg>
          <Nodes {...defaultProps} setOnNode={() => ({ custom: true })} />
        </svg>
      );

      expect(mockNodeProps.length).toBeGreaterThan(initialCount);
    });

    it('does not re-render when props are the same', () => {
      const { rerender } = render(
        <svg>
          <Nodes {...defaultProps} />
        </svg>
      );
      const initialCount = mockNodeProps.length;

      // Re-render with same props reference
      rerender(
        <svg>
          <Nodes {...defaultProps} />
        </svg>
      );

      // Should not have rendered additional nodes
      expect(mockNodeProps.length).toBe(initialCount);
    });
  });

  describe('empty layoutVertices', () => {
    it('renders nothing when layoutVertices is empty', () => {
      const { container } = render(
        <svg>
          <Nodes {...defaultProps} layoutVertices={[]} />
        </svg>
      );
      expect(container.querySelectorAll('[data-testid^="node-"]').length).toBe(0);
    });
  });
});
