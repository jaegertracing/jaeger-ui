// Copyright (c) 2026 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import MeasurableNodesLayer from './MeasurableNodesLayer';
import { ELayoutPhase, ELayerType } from './types';

jest.mock('./HtmlLayer', () => {
  const React = require('react');
  return ({ children, classNamePart }) =>
    React.createElement(
      'div',
      {
        'data-testid': 'html-layer',
        'data-classname': classNamePart,
      },
      children
    );
});

jest.mock('./SvgLayer', () => {
  const React = require('react');
  return ({ children, classNamePart }) =>
    React.createElement(
      'svg',
      {
        'data-testid': 'svg-layer',
        'data-classname': classNamePart,
      },
      children
    );
});

// Store mock instances by vertex key
const mockNodeInstances = {};

// Mock MeasurableNode as a React component that properly handles refs
jest.mock('./MeasurableNode', () => {
  const React = require('react');
  return React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => {
      const key = props.vertex?.key;
      return key ? mockNodeInstances[key] : null;
    });
    return React.createElement('div', { 'data-testid': 'measurable-node' });
  });
});

describe('MeasurableNodesLayer', () => {
  const mockVertex = { key: 'v1', data: {} };
  const defaultProps = {
    getClassName: name => `test-${name}`,
    graphState: {
      layoutPhase: ELayoutPhase.CalcSizes,
      layoutVertices: [{ vertex: mockVertex, left: 0, top: 0, width: 100, height: 50 }],
      renderUtils: {},
      vertices: [mockVertex],
    },
    senderKey: 'test-sender',
    layerType: ELayerType.Html,
    setSizeVertices: jest.fn(),
    renderNode: jest.fn(() => <div>Node</div>),
    setOnNode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear mock instances
    Object.keys(mockNodeInstances).forEach(key => delete mockNodeInstances[key]);
  });

  it('renders HtmlLayer when layerType is Html', () => {
    const { getByTestId } = render(<MeasurableNodesLayer {...defaultProps} />);
    expect(getByTestId('html-layer')).toHaveAttribute('data-classname', 'MeasurableNodesLayer');
  });

  it('renders SvgLayer when layerType is Svg', () => {
    const { getByTestId } = render(<MeasurableNodesLayer {...defaultProps} layerType={ELayerType.Svg} />);
    expect(getByTestId('svg-layer')).toHaveAttribute('data-classname', 'MeasurableNodesLayer');
  });

  it('updates refs when vertices change', () => {
    mockNodeInstances[mockVertex.key] = {
      measure: jest.fn(() => ({ width: 100, height: 50 })),
      getRef: jest.fn(() => ({ htmlWrapper: document.createElement('div'), svgWrapper: undefined })),
    };
    const mockVertex2 = { key: 'v2', data: {} };
    mockNodeInstances[mockVertex2.key] = {
      measure: jest.fn(() => ({ width: 100, height: 50 })),
      getRef: jest.fn(() => ({ htmlWrapper: document.createElement('div'), svgWrapper: undefined })),
    };

    const { rerender, getAllByTestId } = render(<MeasurableNodesLayer {...defaultProps} />);
    expect(getAllByTestId('measurable-node')).toHaveLength(1);

    rerender(
      <MeasurableNodesLayer
        {...defaultProps}
        graphState={{
          ...defaultProps.graphState,
          vertices: [mockVertex, mockVertex2],
        }}
      />
    );
    expect(getAllByTestId('measurable-node')).toHaveLength(2);
  });

  it('calls setSizeVertices during CalcSizes phase', async () => {
    mockNodeInstances[mockVertex.key] = {
      measure: jest.fn(() => ({ width: 100, height: 50 })),
      getRef: jest.fn(() => ({ htmlWrapper: document.createElement('div'), svgWrapper: undefined })),
    };

    render(<MeasurableNodesLayer {...defaultProps} />);

    await waitFor(() => {
      expect(defaultProps.setSizeVertices).toHaveBeenCalledWith('test-sender', [
        {
          vertex: mockVertex,
          width: 100,
          height: 50,
        },
      ]);
    });
  });

  it('does not call setSizeVertices when not in CalcSizes phase', () => {
    render(
      <MeasurableNodesLayer
        {...defaultProps}
        graphState={{
          ...defaultProps.graphState,
          layoutPhase: ELayoutPhase.Done,
        }}
      />
    );
    expect(defaultProps.setSizeVertices).not.toHaveBeenCalled();
  });

  it('uses custom measureNode function when provided', async () => {
    const mockMeasureNode = jest.fn(() => ({ width: 200, height: 100 }));
    mockNodeInstances[mockVertex.key] = {
      measure: jest.fn(() => ({ width: 100, height: 50 })),
      getRef: jest.fn(() => ({ htmlWrapper: document.createElement('div'), svgWrapper: undefined })),
    };

    render(<MeasurableNodesLayer {...defaultProps} measureNode={mockMeasureNode} />);

    await waitFor(() => {
      expect(mockMeasureNode).toHaveBeenCalledWith(mockVertex, {
        layerType: ELayerType.Html,
        getWrapper: expect.any(Function),
        getWrapperSize: expect.any(Function),
      });
    });
  });

  it('handles getWrapper and getWrapperSize utilities', async () => {
    const mockRef = document.createElement('div');
    mockNodeInstances[mockVertex.key] = {
      measure: jest.fn(() => ({ width: 100, height: 50 })),
      getRef: jest.fn(() => ({ htmlWrapper: mockRef, svgWrapper: undefined })),
    };

    let utils;
    const mockMeasureNode = jest.fn((vertex, u) => {
      utils = u;
      return { width: 150, height: 75 };
    });

    render(<MeasurableNodesLayer {...defaultProps} measureNode={mockMeasureNode} />);

    await waitFor(() => {
      expect(mockMeasureNode).toHaveBeenCalled();
    });

    expect(utils).toBeDefined();
    expect(utils.getWrapper()).toEqual({ htmlWrapper: mockRef, svgWrapper: undefined });
    expect(utils.getWrapperSize()).toEqual({ width: 100, height: 50 });
  });
});
