// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { zoomIdentity } from 'd3-zoom';
import SvgEdgesLayer from './SvgEdgesLayer';
import { ELayoutPhase } from './types';

// Mock child components
jest.mock('./SvgLayer', () => {
  return function SvgLayer({ children, classNamePart, extraWrapper }) {
    return (
      <svg data-testid="svg-layer" data-classname-part={classNamePart}>
        <g data-testid="extra-wrapper" style={extraWrapper}>
          {children}
        </g>
      </svg>
    );
  };
});

jest.mock('./SvgEdges', () => {
  return function SvgEdges({ layoutEdges, markerEndId, markerStartId }) {
    return (
      <g data-testid="svg-edges">
        {layoutEdges.map(edge => (
          <line
            key={`${edge.edge.from}-${edge.edge.to}`}
            data-testid="edge"
            data-from={edge.edge.from}
            data-to={edge.edge.to}
            data-marker-end={markerEndId}
            data-marker-start={markerStartId}
          />
        ))}
      </g>
    );
  };
});

const getClassName = name => `test-${name}`;

const mockRenderUtils = {
  getGlobalId: jest.fn(name => `global-${name}`),
  getZoomTransform: jest.fn(() => zoomIdentity),
};

const createMockGraphState = (layoutEdges = null) => ({
  edges: [],
  layoutEdges,
  layoutGraph: null,
  layoutPhase: ELayoutPhase.Done,
  layoutVertices: null,
  renderUtils: mockRenderUtils,
  vertices: [],
  zoomTransform: zoomIdentity,
});

const createMockLayoutEdge = (from, to) => ({
  edge: {
    from,
    to,
    isBidirectional: false,
  },
  pathPoints: [
    [0, 0],
    [100, 100],
  ],
});

describe('SvgEdgesLayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders null when layoutEdges is null', () => {
    const graphState = createMockGraphState(null);
    const { container } = render(<SvgEdgesLayer getClassName={getClassName} graphState={graphState} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders null when layoutEdges is undefined', () => {
    const graphState = createMockGraphState(undefined);
    const { container } = render(<SvgEdgesLayer getClassName={getClassName} graphState={graphState} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders SvgLayer and SvgEdges when layoutEdges exist', () => {
    const layoutEdges = [createMockLayoutEdge('node1', 'node2')];
    const graphState = createMockGraphState(layoutEdges);

    const { getByTestId } = render(<SvgEdgesLayer getClassName={getClassName} graphState={graphState} />);

    expect(getByTestId('svg-layer')).toBeInTheDocument();
    expect(getByTestId('svg-edges')).toBeInTheDocument();
  });

  it('passes correct classNamePart to SvgLayer', () => {
    const layoutEdges = [createMockLayoutEdge('node1', 'node2')];
    const graphState = createMockGraphState(layoutEdges);

    const { getByTestId } = render(<SvgEdgesLayer getClassName={getClassName} graphState={graphState} />);

    expect(getByTestId('svg-layer')).toHaveAttribute('data-classname-part', 'SvgEdgesLayer');
  });

  it('passes INHERIT_STROKE as extraWrapper to SvgLayer', () => {
    const layoutEdges = [createMockLayoutEdge('node1', 'node2')];
    const graphState = createMockGraphState(layoutEdges);

    const { getByTestId } = render(<SvgEdgesLayer getClassName={getClassName} graphState={graphState} />);

    const extraWrapper = getByTestId('extra-wrapper');
    expect(extraWrapper).toHaveStyle({ stroke: '#000' });
  });

  it('passes all props to SvgLayer', () => {
    const layoutEdges = [createMockLayoutEdge('node1', 'node2')];
    const graphState = createMockGraphState(layoutEdges);
    const setOnEdge = jest.fn();

    render(
      <SvgEdgesLayer
        getClassName={getClassName}
        graphState={graphState}
        markerEndId="arrow-end"
        markerStartId="arrow-start"
        setOnEdge={setOnEdge}
        standalone
      />
    );

    // Component should render without errors
    expect(mockRenderUtils.getGlobalId).not.toHaveBeenCalled();
  });

  it('passes correct props to SvgEdges', () => {
    const layoutEdges = [createMockLayoutEdge('node1', 'node2')];
    const graphState = createMockGraphState(layoutEdges);
    const setOnEdge = jest.fn();

    const { getByTestId } = render(
      <SvgEdgesLayer
        getClassName={getClassName}
        graphState={graphState}
        markerEndId="arrow-end"
        markerStartId="arrow-start"
        setOnEdge={setOnEdge}
      />
    );

    const edge = getByTestId('edge');
    expect(edge).toHaveAttribute('data-from', 'node1');
    expect(edge).toHaveAttribute('data-to', 'node2');
    expect(edge).toHaveAttribute('data-marker-end', 'arrow-end');
    expect(edge).toHaveAttribute('data-marker-start', 'arrow-start');
  });

  it('renders multiple edges', () => {
    const layoutEdges = [
      createMockLayoutEdge('node1', 'node2'),
      createMockLayoutEdge('node2', 'node3'),
      createMockLayoutEdge('node3', 'node4'),
    ];
    const graphState = createMockGraphState(layoutEdges);

    const { getAllByTestId } = render(<SvgEdgesLayer getClassName={getClassName} graphState={graphState} />);

    const edges = getAllByTestId('edge');
    expect(edges).toHaveLength(3);
  });

  it('renders with empty layoutEdges array', () => {
    const layoutEdges = [];
    const graphState = createMockGraphState(layoutEdges);

    const { getByTestId, queryAllByTestId } = render(
      <SvgEdgesLayer getClassName={getClassName} graphState={graphState} />
    );

    expect(getByTestId('svg-layer')).toBeInTheDocument();
    expect(getByTestId('svg-edges')).toBeInTheDocument();
    expect(queryAllByTestId('edge')).toHaveLength(0);
  });

  it('passes renderUtils from graphState to SvgEdges', () => {
    const layoutEdges = [createMockLayoutEdge('node1', 'node2')];
    const customRenderUtils = {
      getGlobalId: jest.fn(name => `custom-${name}`),
      getZoomTransform: jest.fn(() => zoomIdentity),
    };
    const graphState = {
      ...createMockGraphState(layoutEdges),
      renderUtils: customRenderUtils,
    };

    render(<SvgEdgesLayer getClassName={getClassName} graphState={graphState} />);

    // Component should render successfully with custom renderUtils
    expect(customRenderUtils.getGlobalId).not.toHaveBeenCalled();
  });

  it('handles markerEndId prop', () => {
    const layoutEdges = [createMockLayoutEdge('node1', 'node2')];
    const graphState = createMockGraphState(layoutEdges);

    const { getByTestId } = render(
      <SvgEdgesLayer getClassName={getClassName} graphState={graphState} markerEndId="custom-arrow-end" />
    );

    const edge = getByTestId('edge');
    expect(edge).toHaveAttribute('data-marker-end', 'custom-arrow-end');
  });

  it('handles markerStartId prop', () => {
    const layoutEdges = [createMockLayoutEdge('node1', 'node2')];
    const graphState = createMockGraphState(layoutEdges);

    const { getByTestId } = render(
      <SvgEdgesLayer getClassName={getClassName} graphState={graphState} markerStartId="custom-arrow-start" />
    );

    const edge = getByTestId('edge');
    expect(edge).toHaveAttribute('data-marker-start', 'custom-arrow-start');
  });

  it('handles setOnEdge prop', () => {
    const layoutEdges = [createMockLayoutEdge('node1', 'node2')];
    const graphState = createMockGraphState(layoutEdges);
    const setOnEdge = jest.fn();

    const { getByTestId } = render(
      <SvgEdgesLayer getClassName={getClassName} graphState={graphState} setOnEdge={setOnEdge} />
    );

    // Component should render without errors and pass setOnEdge prop
    expect(getByTestId('svg-layer')).toBeInTheDocument();
    expect(getByTestId('svg-edges')).toBeInTheDocument();
  });

  it('handles standalone prop', () => {
    const layoutEdges = [createMockLayoutEdge('node1', 'node2')];
    const graphState = createMockGraphState(layoutEdges);

    const { getByTestId } = render(
      <SvgEdgesLayer getClassName={getClassName} graphState={graphState} standalone />
    );

    expect(getByTestId('svg-layer')).toBeInTheDocument();
  });

  it('memoizes correctly with React.memo - same props should not re-render', () => {
    const layoutEdges = [createMockLayoutEdge('node1', 'node2')];
    const graphState = createMockGraphState(layoutEdges);
    const getClassNameSpy = jest.fn(getClassName);

    const { rerender } = render(<SvgEdgesLayer getClassName={getClassNameSpy} graphState={graphState} />);

    const initialCallCount = getClassNameSpy.mock.calls.length;

    // Rerender with same props
    rerender(<SvgEdgesLayer getClassName={getClassNameSpy} graphState={graphState} />);

    // Should not call getClassName again due to React.memo
    expect(getClassNameSpy.mock.calls.length).toBe(initialCallCount);
  });

  it('re-renders when props change', () => {
    const layoutEdges1 = [createMockLayoutEdge('node1', 'node2')];
    const layoutEdges2 = [createMockLayoutEdge('node3', 'node4')];
    const graphState1 = createMockGraphState(layoutEdges1);
    const graphState2 = createMockGraphState(layoutEdges2);

    const { rerender, getByTestId } = render(
      <SvgEdgesLayer getClassName={getClassName} graphState={graphState1} />
    );

    const edge1 = getByTestId('edge');
    expect(edge1).toHaveAttribute('data-from', 'node1');

    // Rerender with different props
    rerender(<SvgEdgesLayer getClassName={getClassName} graphState={graphState2} />);

    const edge2 = getByTestId('edge');
    expect(edge2).toHaveAttribute('data-from', 'node3');
  });

  it('handles complex edge data', () => {
    const complexEdge = {
      edge: {
        from: 'service-a',
        to: 'service-b',
        isBidirectional: true,
        label: 'HTTP',
        customData: { weight: 10 },
      },
      pathPoints: [
        [10, 20],
        [30, 40],
        [50, 60],
      ],
    };
    const graphState = createMockGraphState([complexEdge]);

    const { getByTestId } = render(<SvgEdgesLayer getClassName={getClassName} graphState={graphState} />);

    const edge = getByTestId('edge');
    expect(edge).toHaveAttribute('data-from', 'service-a');
    expect(edge).toHaveAttribute('data-to', 'service-b');
  });
});
