// Copyright (c) 2026 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { zoomIdentity } from 'd3-zoom';
import HtmlLayer from './HtmlLayer';
import ZoomManager from '../zoom/ZoomManager';
import { ELayoutPhase } from './types';

jest.mock('./utils', () => {
  const actual = jest.requireActual('./utils');
  return {
    ...actual,
    getProps: jest.fn(() => ({})),
  };
});

jest.mock('../zoom/ZoomManager', () => ({
  getZoomStyle: jest.fn(() => ({ transform: 'scale(1)' })),
}));

const getClassName = name => `test-${name}`;

const mockGraphState = {
  edges: [],
  layoutEdges: null,
  layoutGraph: null,
  layoutPhase: ELayoutPhase.Done,
  layoutVertices: null,
  renderUtils: {
    getGlobalId: jest.fn(),
    getZoomTransform: jest.fn(),
  },
  vertices: [],
  zoomTransform: zoomIdentity,
};

describe('HtmlLayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children', () => {
    render(
      <HtmlLayer classNamePart="container" getClassName={getClassName} graphState={mockGraphState}>
        <div data-testid="child">Test</div>
      </HtmlLayer>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('applies className and default styles', () => {
    const { container } = render(
      <HtmlLayer classNamePart="layer" getClassName={getClassName} graphState={mockGraphState}>
        <div>Content</div>
      </HtmlLayer>
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('test-layer');
    expect(wrapper).toHaveStyle({ position: 'absolute', left: '0px', top: '0px' });
  });

  it('applies zoom style when topLayer is true', () => {
    const mockZoom = { transform: 'scale(2)' };
    ZoomManager.getZoomStyle.mockReturnValue(mockZoom);

    const { container } = render(
      <HtmlLayer classNamePart="layer" getClassName={getClassName} graphState={mockGraphState} topLayer>
        <div>Content</div>
      </HtmlLayer>
    );

    expect(ZoomManager.getZoomStyle).toHaveBeenCalledWith(zoomIdentity);
    expect(container.firstChild).toHaveStyle(mockZoom);
  });

  it('applies zoom style when standalone is true', () => {
    render(
      <HtmlLayer classNamePart="layer" getClassName={getClassName} graphState={mockGraphState} standalone>
        <div>Content</div>
      </HtmlLayer>
    );

    expect(ZoomManager.getZoomStyle).toHaveBeenCalled();
  });

  it('does not apply zoom style by default', () => {
    render(
      <HtmlLayer classNamePart="layer" getClassName={getClassName} graphState={mockGraphState}>
        <div>Content</div>
      </HtmlLayer>
    );

    expect(ZoomManager.getZoomStyle).not.toHaveBeenCalled();
  });
});
