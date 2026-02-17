// Copyright (c) 2026 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import SvgEdgesLayer from './SvgEdgesLayer';

// Mock child components
// Use React.createElement instead of JSX because jest.mock factory functions cannot reference external variables
jest.mock('./SvgEdges', () => {
  const React = require('react');
  const MockSvgEdges = props => {
    MockSvgEdges.lastProps = props;
    return React.createElement('g', { 'data-testid': 'svg-edges' });
  };
  MockSvgEdges.lastProps = null;
  return MockSvgEdges;
});

jest.mock('./SvgLayer', () => {
  const React = require('react');
  const MockSvgLayer = ({ children, classNamePart, extraWrapper, ...rest }) => {
    MockSvgLayer.lastProps = { classNamePart, extraWrapper, ...rest };
    return React.createElement(
      'svg',
      { 'data-testid': 'svg-layer', 'data-classname-part': classNamePart },
      children
    );
  };
  MockSvgLayer.lastProps = null;
  return MockSvgLayer;
});

describe('SvgEdgesLayer', () => {
  const SvgEdges = require('./SvgEdges');
  const SvgLayer = require('./SvgLayer');

  const createLayoutEdge = (from, to) => ({
    edge: { from, to },
    pathPoints: [
      [0, 0],
      [50, 50],
    ],
  });

  const createGraphState = (layoutEdges = null) => ({
    layoutEdges,
    renderUtils: {
      getGlobalId: id => `global-${id}`,
    },
    vertices: [],
    layoutVertices: null,
  });

  const defaultProps = {
    getClassName: name => `test-${name}`,
    graphState: createGraphState([createLayoutEdge('a', 'b'), createLayoutEdge('b', 'c')]),
  };

  beforeEach(() => {
    SvgEdges.lastProps = null;
    SvgLayer.lastProps = null;
  });

  describe('conditional rendering', () => {
    it('returns null when layoutEdges is null', () => {
      const props = {
        ...defaultProps,
        graphState: createGraphState(null),
      };
      const { container } = render(<SvgEdgesLayer {...props} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when layoutEdges is undefined', () => {
      const props = {
        ...defaultProps,
        graphState: { ...createGraphState(), layoutEdges: undefined },
      };
      const { container } = render(<SvgEdgesLayer {...props} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders when layoutEdges has items', () => {
      const { getByTestId } = render(<SvgEdgesLayer {...defaultProps} />);
      expect(getByTestId('svg-layer')).toBeTruthy();
    });

    it('renders when layoutEdges is empty array', () => {
      const props = {
        ...defaultProps,
        graphState: createGraphState([]),
      };
      const { getByTestId } = render(<SvgEdgesLayer {...props} />);
      expect(getByTestId('svg-layer')).toBeTruthy();
    });
  });

  describe('SvgLayer wrapper', () => {
    it('passes classNamePart="SvgEdgesLayer" to SvgLayer', () => {
      render(<SvgEdgesLayer {...defaultProps} />);
      expect(SvgLayer.lastProps.classNamePart).toBe('SvgEdgesLayer');
    });

    it('passes extraWrapper with black stroke to SvgLayer', () => {
      render(<SvgEdgesLayer {...defaultProps} />);
      expect(SvgLayer.lastProps.extraWrapper).toEqual({ stroke: '#000' });
    });

    it('passes getClassName to SvgLayer', () => {
      render(<SvgEdgesLayer {...defaultProps} />);
      expect(SvgLayer.lastProps.getClassName).toBe(defaultProps.getClassName);
    });

    it('passes graphState to SvgLayer', () => {
      render(<SvgEdgesLayer {...defaultProps} />);
      expect(SvgLayer.lastProps.graphState).toBe(defaultProps.graphState);
    });

    it('passes standalone prop to SvgLayer', () => {
      render(<SvgEdgesLayer {...defaultProps} standalone />);
      expect(SvgLayer.lastProps.standalone).toBe(true);
    });
  });

  describe('SvgEdges child', () => {
    it('passes getClassName to SvgEdges', () => {
      render(<SvgEdgesLayer {...defaultProps} />);
      expect(SvgEdges.lastProps.getClassName).toBe(defaultProps.getClassName);
    });

    it('passes layoutEdges from graphState to SvgEdges', () => {
      render(<SvgEdgesLayer {...defaultProps} />);
      expect(SvgEdges.lastProps.layoutEdges).toBe(defaultProps.graphState.layoutEdges);
    });

    it('passes renderUtils from graphState to SvgEdges', () => {
      render(<SvgEdgesLayer {...defaultProps} />);
      expect(SvgEdges.lastProps.renderUtils).toBe(defaultProps.graphState.renderUtils);
    });

    it('passes markerEndId to SvgEdges', () => {
      render(<SvgEdgesLayer {...defaultProps} markerEndId="arrow-end" />);
      expect(SvgEdges.lastProps.markerEndId).toBe('arrow-end');
    });

    it('passes markerStartId to SvgEdges', () => {
      render(<SvgEdgesLayer {...defaultProps} markerStartId="arrow-start" />);
      expect(SvgEdges.lastProps.markerStartId).toBe('arrow-start');
    });

    it('passes setOnEdge to SvgEdges', () => {
      const mockSetOnEdge = jest.fn();
      render(<SvgEdgesLayer {...defaultProps} setOnEdge={mockSetOnEdge} />);
      expect(SvgEdges.lastProps.setOnEdge).toBe(mockSetOnEdge);
    });
  });

  describe('React.memo behavior', () => {
    it('is wrapped with React.memo for performance', () => {
      // React.memo wraps components with a special $$typeof
      expect(SvgEdgesLayer.$$typeof).toBe(Symbol.for('react.memo'));
    });
  });
});
